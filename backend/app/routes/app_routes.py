from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, UserSettings, WatchlistItem
from app.schemas import (
    DashboardStats,
    EquityPoint,
    MonthlyDashboardPoint,
    NewsItemOut,
    QuoteOut,
    UserSettingsOut,
    UserSettingsUpdate,
    WatchlistEnrichedOut,
    WatchlistItemCreate,
    WatchlistItemOut,
)
from app.services.market import DEFAULT_UNIVERSE, get_quote
from app.services.news import get_news
from app.services.stats import dashboard_stats, equity_curve, monthly_dashboard

router = APIRouter(tags=["app"])


@router.get("/dashboard/stats", response_model=DashboardStats)
def stats(
    account_type: str | None = Query(default=None, pattern="^(all|real|paper)$"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return dashboard_stats(db, user.id, account_type)


@router.get("/dashboard/equity", response_model=list[EquityPoint])
def equity(
    account_type: str | None = Query(default=None, pattern="^(all|real|paper)$"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return equity_curve(db, user.id, account_type)


@router.get("/dashboard/monthly", response_model=list[MonthlyDashboardPoint])
def monthly(
    account_type: str | None = Query(default=None, pattern="^(all|real|paper)$"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return monthly_dashboard(db, user.id, account_type)


@router.get("/settings", response_model=UserSettingsOut)
def get_settings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    return UserSettingsOut(bot_name=settings.bot_name, bot_avatar_url=settings.bot_avatar_url, locale=user.locale)


@router.patch("/settings", response_model=UserSettingsOut)
def update_settings(
    payload: UserSettingsUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    if payload.bot_name is not None:
        settings.bot_name = payload.bot_name
    if payload.bot_avatar_url is not None:
        settings.bot_avatar_url = payload.bot_avatar_url
    if payload.locale is not None:
        user.locale = payload.locale
    db.commit()
    db.refresh(settings)
    db.refresh(user)
    return UserSettingsOut(bot_name=settings.bot_name, bot_avatar_url=settings.bot_avatar_url, locale=user.locale)


@router.get("/watchlist/enriched", response_model=list[WatchlistEnrichedOut])
def list_watchlist_enriched(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(WatchlistItem).filter(WatchlistItem.user_id == user.id).order_by(WatchlistItem.symbol).all()
    enriched = []
    for item in items:
        quote = get_quote(item.symbol)
        news = get_news(item.symbol, limit=3)
        enriched.append(
            WatchlistEnrichedOut(
                id=item.id,
                symbol=item.symbol,
                name=quote.get("name"),
                price=quote.get("price"),
                change_pct=quote.get("change_pct"),
                currency=quote.get("currency", "USD"),
                exchange=quote.get("exchange"),
                news=news,
            )
        )
    return enriched


@router.post("/watchlist/seed-defaults")
def seed_default_watchlist(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    added = 0
    for symbol in DEFAULT_UNIVERSE:
        existing = (
            db.query(WatchlistItem)
            .filter(WatchlistItem.user_id == user.id, WatchlistItem.symbol == symbol)
            .first()
        )
        if not existing:
            db.add(WatchlistItem(user_id=user.id, symbol=symbol))
            added += 1
    db.commit()
    return {"added": added, "symbols": DEFAULT_UNIVERSE}


@router.get("/market/news/{symbol}", response_model=list[NewsItemOut])
def news(symbol: str, user: User = Depends(get_current_user)):
    return get_news(symbol.upper(), limit=5)


@router.get("/market/universe", response_model=list[str])
def universe(user: User = Depends(get_current_user)):
    return DEFAULT_UNIVERSE


@router.get("/watchlist", response_model=list[WatchlistItemOut])
def list_watchlist(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(WatchlistItem).filter(WatchlistItem.user_id == user.id).order_by(WatchlistItem.symbol).all()


@router.post("/watchlist", response_model=WatchlistItemOut)
def add_watchlist_item(
    payload: WatchlistItemCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    symbol = payload.symbol.upper().strip()
    existing = (
        db.query(WatchlistItem)
        .filter(WatchlistItem.user_id == user.id, WatchlistItem.symbol == symbol)
        .first()
    )
    if existing:
        return existing
    item = WatchlistItem(user_id=user.id, symbol=symbol)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/watchlist/{item_id}")
def delete_watchlist_item(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(WatchlistItem).filter(WatchlistItem.id == item_id, WatchlistItem.user_id == user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    db.delete(item)
    db.commit()
    return {"ok": True}


@router.get("/market/quote/{symbol}", response_model=QuoteOut)
def quote(symbol: str, user: User = Depends(get_current_user)):
    return get_quote(symbol)
