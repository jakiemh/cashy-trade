from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Signal, Trade, User
from app.schemas import TradeClose, TradeCreate, TradeMatchOut, TradeOut, TradeUpdate
from app.services.export import trades_to_csv
from app.services.journal_pdf import trades_to_pdf
from app.services.signals import compute_trade_pnl

router = APIRouter(prefix="/trades", tags=["trades"])


def _find_open_trade_for_cierre(db: Session, user_id: int, cierre: Signal) -> Trade | None:
    if cierre.type != "CIERRE":
        return None
    if cierre.open_signal_id:
        trade = (
            db.query(Trade)
            .filter(
                Trade.user_id == user_id,
                Trade.signal_id == cierre.open_signal_id,
                Trade.status == "open",
            )
            .first()
        )
        if trade:
            return trade
    return (
        db.query(Trade)
        .filter(Trade.user_id == user_id, Trade.symbol == cierre.symbol, Trade.status == "open")
        .order_by(Trade.entry_at.desc())
        .first()
    )


@router.get("", response_model=list[TradeOut])
def list_trades(
    status: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Trade).filter(Trade.user_id == user.id).order_by(Trade.entry_at.desc())
    if status:
        query = query.filter(Trade.status == status)
    return query.all()


@router.get("/export")
def export_trades(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    csv_data = trades_to_csv(db, user.id)
    filename = f"cashy_trades_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/pdf")
def export_trades_pdf(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pdf_bytes = trades_to_pdf(db, user.id, user_name=user.name or user.email)
    filename = f"cashy_bitacora_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/match-cierre/{cierre_signal_id}", response_model=TradeMatchOut)
def match_cierre_trade(
    cierre_signal_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cierre = db.query(Signal).filter(Signal.id == cierre_signal_id).first()
    if not cierre or cierre.type != "CIERRE":
        raise HTTPException(status_code=404, detail="CIERRE signal not found")
    trade = _find_open_trade_for_cierre(db, user.id, cierre)
    return TradeMatchOut(trade=trade, cierre_signal_id=cierre_signal_id)


@router.post("", response_model=TradeOut)
def create_trade(
    payload: TradeCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    signal = None
    if payload.signal_id:
        signal = db.query(Signal).filter(Signal.id == payload.signal_id).first()
        if not signal:
            raise HTTPException(status_code=404, detail="Signal not found")

    trade = Trade(
        user_id=user.id,
        signal_id=payload.signal_id,
        symbol=payload.symbol.upper(),
        strategy=payload.strategy or (signal.strategy if signal else None),
        setup_name=payload.setup_name or (signal.setup_name if signal else None),
        entry_price=payload.entry_price,
        entry_qty=payload.entry_qty,
        entry_at=payload.entry_at or datetime.utcnow(),
        stop_loss=payload.stop_loss if payload.stop_loss is not None else (signal.stop_loss if signal else None),
        take_profit=payload.take_profit if payload.take_profit is not None else (signal.take_profit if signal else None),
        notes=payload.notes,
        account_type=payload.account_type,
        status="open",
    )
    db.add(trade)
    db.commit()
    db.refresh(trade)
    return trade


@router.post("/{trade_id}/close", response_model=TradeOut)
def close_trade(
    trade_id: int,
    payload: TradeClose,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    trade = db.query(Trade).filter(Trade.id == trade_id, Trade.user_id == user.id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    if trade.status == "closed":
        raise HTTPException(status_code=400, detail="Trade already closed")

    pnl_usd, pnl_pct = compute_trade_pnl(trade.entry_price, trade.entry_qty, payload.exit_price)
    trade.exit_price = payload.exit_price
    trade.exit_at = payload.exit_at or datetime.utcnow()
    trade.exit_reason = payload.exit_reason
    if payload.notes:
        trade.notes = payload.notes
    trade.pnl_usd = pnl_usd
    trade.pnl_pct = pnl_pct
    trade.status = "closed"
    db.commit()
    db.refresh(trade)
    return trade


@router.patch("/{trade_id}", response_model=TradeOut)
def update_trade(
    trade_id: int,
    payload: TradeUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    trade = db.query(Trade).filter(Trade.id == trade_id, Trade.user_id == user.id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    if payload.entry_price is not None:
        trade.entry_price = payload.entry_price
    if payload.entry_qty is not None:
        trade.entry_qty = payload.entry_qty
    if payload.stop_loss is not None:
        trade.stop_loss = payload.stop_loss
    if payload.take_profit is not None:
        trade.take_profit = payload.take_profit
    if payload.notes is not None:
        trade.notes = payload.notes
    if payload.account_type is not None:
        trade.account_type = payload.account_type

    if trade.status == "closed":
        if payload.exit_price is not None:
            trade.exit_price = payload.exit_price
        if payload.exit_at is not None:
            trade.exit_at = payload.exit_at
        if payload.exit_reason is not None:
            trade.exit_reason = payload.exit_reason
        if trade.exit_price is not None:
            pnl_usd, pnl_pct = compute_trade_pnl(trade.entry_price, trade.entry_qty, trade.exit_price)
            trade.pnl_usd = pnl_usd
            trade.pnl_pct = pnl_pct

    db.commit()
    db.refresh(trade)
    return trade


@router.delete("/{trade_id}")
def delete_trade(
    trade_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    trade = db.query(Trade).filter(Trade.id == trade_id, Trade.user_id == user.id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    db.delete(trade)
    db.commit()
    return {"ok": True, "deleted_id": trade_id}
