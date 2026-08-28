from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class AdminTestEmailIn(BaseModel):
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str = Field(min_length=20)
    password: str = Field(min_length=8)


class OkMessage(BaseModel):
    ok: bool = True
    message: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = ""


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str
    locale: str
    is_admin: bool = False

    model_config = {"from_attributes": True}


class UserSettingsOut(BaseModel):
    bot_name: str
    bot_avatar_url: str | None
    locale: str

    model_config = {"from_attributes": True}


class UserSettingsUpdate(BaseModel):
    bot_name: str | None = None
    bot_avatar_url: str | None = None
    locale: str | None = None


class SignalIn(BaseModel):
    type: str
    symbol: str
    timestamp: datetime | None = None
    strategy: str | None = None
    setup_name: str | None = None
    entry_price: float | None = None
    stop_loss: float | None = None
    stop_pct: float | None = None
    take_profit: float | None = None
    tp_pct: float | None = None
    rr_ratio: float | None = None
    exit_price: float | None = None
    pnl_pct: float | None = None
    reason: str | None = None
    current_price: float | None = None
    distance_to_stop_pct: float | None = None


class SignalOut(BaseModel):
    id: int
    type: str
    symbol: str
    timestamp: datetime
    strategy: str | None
    setup_name: str | None
    entry_price: float | None
    stop_loss: float | None
    stop_pct: float | None
    take_profit: float | None
    tp_pct: float | None
    rr_ratio: float | None
    exit_price: float | None
    pnl_pct: float | None
    reason: str | None
    current_price: float | None
    distance_to_stop_pct: float | None
    is_active: bool
    open_signal_id: int | None
    taken_by_user: bool = False

    model_config = {"from_attributes": True}


class TradeCreate(BaseModel):
    signal_id: int | None = None
    symbol: str
    strategy: str | None = None
    setup_name: str | None = None
    entry_price: float
    entry_qty: float
    entry_at: datetime | None = None
    stop_loss: float | None = None
    take_profit: float | None = None
    notes: str | None = None


class TradeClose(BaseModel):
    exit_price: float
    exit_at: datetime | None = None
    exit_reason: str | None = None
    notes: str | None = None


class TradeUpdate(BaseModel):
    entry_price: float | None = None
    entry_qty: float | None = None
    stop_loss: float | None = None
    take_profit: float | None = None
    exit_price: float | None = None
    exit_at: datetime | None = None
    exit_reason: str | None = None
    notes: str | None = None


class TradeOut(BaseModel):
    id: int
    signal_id: int | None
    symbol: str
    strategy: str | None
    setup_name: str | None
    entry_price: float
    entry_qty: float
    entry_at: datetime
    stop_loss: float | None
    take_profit: float | None
    exit_price: float | None
    exit_at: datetime | None
    exit_reason: str | None
    pnl_usd: float | None
    pnl_pct: float | None
    status: str
    notes: str | None

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_trades: int
    open_trades: int
    closed_trades: int
    win_rate: float
    total_pnl_usd: float
    avg_pnl_pct: float
    signals_today: int
    signals_taken: int
    signals_conversion_pct: float


class EquityPoint(BaseModel):
    date: datetime
    pnl_usd: float
    cumulative_pnl_usd: float


class AdminStatsOut(BaseModel):
    total_users: int
    total_signals: int
    total_trades: int
    open_trades: int
    signals_today: int


class AdminUserOut(BaseModel):
    id: int
    email: EmailStr
    name: str
    locale: str
    is_admin: bool
    created_at: datetime
    trade_count: int


class AdminUserUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8)
    name: str | None = None
    locale: str | None = None
    is_admin: bool | None = None


class TradeMatchOut(BaseModel):
    trade: TradeOut | None
    cierre_signal_id: int

    model_config = {"from_attributes": True}


class WatchlistItemCreate(BaseModel):
    symbol: str


class WatchlistItemOut(BaseModel):
    id: int
    symbol: str

    model_config = {"from_attributes": True}


class QuoteOut(BaseModel):
    symbol: str
    name: str | None = None
    price: float | None
    change_pct: float | None
    currency: str = "USD"
    exchange: str | None = None


class NewsItemOut(BaseModel):
    title: str
    url: str
    publisher: str | None = None
    published_at: datetime | None = None


class WatchlistEnrichedOut(BaseModel):
    id: int
    symbol: str
    name: str | None = None
    price: float | None = None
    change_pct: float | None = None
    currency: str = "USD"
    exchange: str | None = None
    news: list[NewsItemOut] = []


class ChatMessageIn(BaseModel):
    message: str


class ChatMessageOut(BaseModel):
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
