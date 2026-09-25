from __future__ import annotations

from datetime import datetime
from io import BytesIO

from fpdf import FPDF
from sqlalchemy.orm import Session

from app.models import Trade

# Dark table similar to bot / Telegram trade log
BG = (24, 24, 27)
HEADER_BG = (39, 39, 42)
TEXT = (228, 228, 231)
MUTED = (161, 161, 170)
GREEN = (52, 211, 153)
RED = (251, 113, 133)


def _fmt_close(dt: datetime | None) -> str:
    if not dt:
        return "—"
    return dt.strftime("%m-%d %H:%M")


def _strategy_label(trade: Trade) -> str:
    return (trade.strategy or trade.setup_name or "—").strip() or "—"


def _motivo_label(reason: str | None) -> str:
    if not reason or not reason.strip():
        return "—"
    upper = reason.strip().upper()
    if upper in ("TP", "TAKE_PROFIT"):
        return "TP"
    if upper in ("SL", "STOP_LOSS", "STOP"):
        return "SL"
    if upper in ("TIME", "TIEMPO"):
        return "TIME"
    if "STOP" in upper or "SL" in upper.split():
        return "SL"
    if "PROFIT" in upper or upper.startswith("TP"):
        return "TP"
    if "TIME" in upper or "TIEMPO" in upper:
        return "TIME"
    if upper == "SIGNAL":
        return "SIG"
    if upper == "MANUAL":
        return "MAN"
    return upper[:10]


def _pnl_label(trade: Trade) -> str:
    usd = trade.pnl_usd if trade.pnl_usd is not None else 0.0
    pct = trade.pnl_pct if trade.pnl_pct is not None else 0.0
    usd_part = f"-${abs(usd):,.2f}" if usd < 0 else f"${usd:,.2f}"
    return f"{usd_part} ({pct:+.1f}%)"


class JournalPDF(FPDF):
    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 8, f"Cashy Trade · {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", align="C")


def trades_to_pdf(db: Session, user_id: int, user_name: str = "") -> bytes:
    closed = (
        db.query(Trade)
        .filter(Trade.user_id == user_id, Trade.status == "closed")
        .order_by(Trade.exit_at.desc().nullslast(), Trade.entry_at.desc())
        .all()
    )
    open_trades = (
        db.query(Trade)
        .filter(Trade.user_id == user_id, Trade.status == "open")
        .order_by(Trade.entry_at.desc())
        .all()
    )

    total_pnl = sum(t.pnl_usd or 0 for t in closed)
    wins = len([t for t in closed if (t.pnl_usd or 0) > 0])
    win_rate = (wins / len(closed) * 100) if closed else 0.0

    pdf = JournalPDF(orientation="L", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=14)
    pdf.add_page()
    pdf.set_fill_color(*BG)
    pdf.rect(0, 0, pdf.w, pdf.h, style="F")

    pdf.set_xy(14, 12)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(*TEXT)
    title = "Resumen de bitacora"
    pdf.cell(0, 10, title, ln=True)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*MUTED)
    if user_name:
        pdf.cell(0, 6, user_name, ln=True)
    pdf.cell(
        0,
        6,
        f"Cerrados: {len(closed)}  ·  P&L total: ${total_pnl:,.2f}  ·  Win rate: {win_rate:.1f}%",
        ln=True,
    )
    if open_trades:
        pdf.cell(0, 6, f"Abiertos (no incluidos en tabla): {len(open_trades)}", ln=True)

    pdf.ln(4)

    col_widths = (32, 28, 62, 22, 48)
    headers = ("Cierre", "Simbolo", "Estrategia", "Motivo", "PnL")
    start_x = 14
    y = pdf.get_y()

    pdf.set_xy(start_x, y)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(*HEADER_BG)
    pdf.set_text_color(*MUTED)
    for i, header in enumerate(headers):
        pdf.cell(col_widths[i], 8, header, border=0, fill=True)
    pdf.ln(8)

    pdf.set_font("Helvetica", "", 9)
    row_h = 7
    for trade in closed:
        if pdf.get_y() > pdf.h - 20:
            pdf.add_page()
            pdf.set_fill_color(*BG)
            pdf.rect(0, 0, pdf.w, pdf.h, style="F")
            pdf.set_xy(start_x, 14)
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_fill_color(*HEADER_BG)
            pdf.set_text_color(*MUTED)
            for i, header in enumerate(headers):
                pdf.cell(col_widths[i], 8, header, border=0, fill=True)
            pdf.ln(8)
            pdf.set_font("Helvetica", "", 9)

        pnl_usd = trade.pnl_usd if trade.pnl_usd is not None else 0.0
        pnl_color = GREEN if pnl_usd >= 0 else RED
        strategy = _strategy_label(trade)
        if len(strategy) > 36:
            strategy = strategy[:33] + "..."

        cells = (
            _fmt_close(trade.exit_at),
            trade.symbol,
            strategy,
            _motivo_label(trade.exit_reason),
        )
        pdf.set_x(start_x)
        pdf.set_text_color(*TEXT)
        for i, text in enumerate(cells):
            pdf.cell(col_widths[i], row_h, text, border=0)
        pdf.set_text_color(*pnl_color)
        pdf.cell(col_widths[4], row_h, _pnl_label(trade), border=0)
        pdf.ln(row_h)

    if not closed:
        pdf.set_x(start_x)
        pdf.set_text_color(*MUTED)
        pdf.cell(sum(col_widths), 10, "No hay trades cerrados en tu bitácora.", ln=True)

    buffer = BytesIO()
    pdf.output(buffer)
    return buffer.getvalue()
