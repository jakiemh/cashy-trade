from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.auth import decode_access_token
from app.services.signal_hub import signal_hub

router = APIRouter(tags=["ws"])


@router.websocket("/ws/signals")
async def signals_ws(websocket: WebSocket, token: str = Query(...)):
    user_id = decode_access_token(token)
    if not user_id:
        await websocket.close(code=4401)
        return

    await signal_hub.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await signal_hub.disconnect(user_id, websocket)
