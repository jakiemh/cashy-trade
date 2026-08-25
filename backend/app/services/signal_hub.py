import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class SignalHub:
    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.setdefault(user_id, set()).add(websocket)

    async def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            bucket = self._connections.get(user_id)
            if not bucket:
                return
            bucket.discard(websocket)
            if not bucket:
                self._connections.pop(user_id, None)

    async def broadcast(self, payload: dict[str, Any]) -> None:
        message = json.dumps(payload, default=str)
        async with self._lock:
            targets = [(uid, list(sockets)) for uid, sockets in self._connections.items()]
        dead: list[tuple[int, WebSocket]] = []
        for user_id, sockets in targets:
            for websocket in sockets:
                try:
                    await websocket.send_text(message)
                except Exception:
                    dead.append((user_id, websocket))
        for user_id, websocket in dead:
            await self.disconnect(user_id, websocket)

    def broadcast_sync(self, payload: dict[str, Any]) -> None:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.broadcast(payload))
        except RuntimeError:
            asyncio.run(self.broadcast(payload))


signal_hub = SignalHub()
