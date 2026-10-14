import csv
import io
from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Trade


CSV_HEADERS = [
    "id",
    "symbol",
    "instrument_type",
    "option_type",
    "option_side",
    "strike",
    "expiration",
    "contract_multiplier",
    "status",
    "entry_at",
    "entry_price",
    "entry_qty",
    "stop_loss",
    "take_profit",
    "exit_at",
    "exit_price",
    "exit_reason",
    "pnl_usd",
    "pnl_pct",
    "setup_name",
    "strategy",
    "signal_id",
    "account_type",
    "notes",
]


def trades_to_csv(db: Session, user_id: int) -> str:
    trades = (
        db.query(Trade)
        .filter(Trade.user_id == user_id)
        .order_by(Trade.entry_at.desc())
        .all()
    )
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(CSV_HEADERS)
    for trade in trades:
        writer.writerow(
            [
                trade.id,
                trade.symbol,
                getattr(trade, "instrument_type", None) or "stock",
                getattr(trade, "option_type", None) or "",
                getattr(trade, "option_side", None) or "",
                getattr(trade, "strike", None) if getattr(trade, "strike", None) is not None else "",
                trade.expiration.isoformat() if getattr(trade, "expiration", None) else "",
                getattr(trade, "contract_multiplier", None) or 100,
                trade.status,
                _fmt_dt(trade.entry_at),
                trade.entry_price,
                trade.entry_qty,
                trade.stop_loss,
                trade.take_profit,
                _fmt_dt(trade.exit_at),
                trade.exit_price,
                trade.exit_reason or "",
                trade.pnl_usd,
                trade.pnl_pct,
                trade.setup_name or "",
                trade.strategy or "",
                trade.signal_id or "",
                trade.account_type or "real",
                (trade.notes or "").replace("\n", " "),
            ]
        )
    return buffer.getvalue()


def _fmt_dt(value: datetime | None) -> str:
    if not value:
        return ""
    return value.strftime("%Y-%m-%d %H:%M:%S")
