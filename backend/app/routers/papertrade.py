from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.db_models import PaperTrade, User
from app.routers.auth import get_current_user
from app.services.data_ingestion import get_ohlcv

router = APIRouter()


class TradeRequest(BaseModel):
    symbol: str
    action: str
    investment_amount: float = 10000.0
    entry_price: float
    stop_loss_pct: float = 2.0
    take_profit_pct: float = 4.0
    prediction_id: Optional[int] = None
    notes: Optional[str] = None


class CloseTradeRequest(BaseModel):
    exit_price: Optional[float] = None


@router.post("/open")
def open_trade(
    req: TradeRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    quantity = req.investment_amount / req.entry_price
    sl = req.entry_price * (1 - req.stop_loss_pct / 100) if req.action == "BUY" else req.entry_price * (1 + req.stop_loss_pct / 100)
    tp = req.entry_price * (1 + req.take_profit_pct / 100) if req.action == "BUY" else req.entry_price * (1 - req.take_profit_pct / 100)

    trade = PaperTrade(
        user_id=current_user.id if current_user else None,
        prediction_id=req.prediction_id,
        symbol=req.symbol.upper(),
        action=req.action.upper(),
        entry_price=req.entry_price,
        quantity=round(quantity, 4),
        investment_amount=req.investment_amount,
        stop_loss=round(sl, 2),
        take_profit=round(tp, 2),
        status="OPEN",
        notes=req.notes,
    )
    db.add(trade)
    db.commit()
    db.refresh(trade)
    return _trade_to_dict(trade)


@router.post("/{trade_id}/close")
def close_trade(
    trade_id: int,
    req: CloseTradeRequest,
    db: Session = Depends(get_db),
):
    trade = db.query(PaperTrade).filter(PaperTrade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    if trade.status == "CLOSED":
        raise HTTPException(status_code=400, detail="Trade already closed")

    exit_price = req.exit_price
    if not exit_price:
        df = get_ohlcv(trade.symbol, period="1d", interval="5m")
        exit_price = float(df["close"].iloc[-1]) if not df.empty else trade.entry_price

    if trade.action == "BUY":
        pnl_pct = (exit_price - trade.entry_price) / trade.entry_price * 100
    else:
        pnl_pct = (trade.entry_price - exit_price) / trade.entry_price * 100

    pnl = trade.investment_amount * pnl_pct / 100
    hold_minutes = int((datetime.now(timezone.utc) - trade.entry_time).total_seconds() / 60)

    trade.exit_price = round(exit_price, 2)
    trade.pnl = round(pnl, 2)
    trade.pnl_percent = round(pnl_pct, 2)
    trade.exit_time = datetime.now(timezone.utc)
    trade.hold_minutes = hold_minutes
    trade.status = "CLOSED"
    db.commit()
    return _trade_to_dict(trade)


@router.get("/")
def list_trades(
    status: Optional[str] = Query(None, enum=["OPEN", "CLOSED"]),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    query = db.query(PaperTrade)
    if status:
        query = query.filter(PaperTrade.status == status)
    if current_user:
        query = query.filter(PaperTrade.user_id == current_user.id)
    trades = query.order_by(PaperTrade.entry_time.desc()).limit(limit).all()
    return [_trade_to_dict(t) for t in trades]


@router.get("/portfolio/stats")
def portfolio_stats(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    query = db.query(PaperTrade)
    if current_user:
        query = query.filter(PaperTrade.user_id == current_user.id)
    all_trades = query.all()

    closed = [t for t in all_trades if t.status == "CLOSED"]
    open_trades = [t for t in all_trades if t.status == "OPEN"]

    total_pnl = sum(t.pnl or 0 for t in closed)
    winners = sum(1 for t in closed if (t.pnl or 0) > 0)
    win_rate = winners / len(closed) * 100 if closed else 0

    return {
        "total_trades": len(all_trades),
        "open_trades": len(open_trades),
        "closed_trades": len(closed),
        "total_pnl": round(total_pnl, 2),
        "win_rate": round(win_rate, 2),
        "winning_trades": winners,
        "losing_trades": len(closed) - winners,
        "avg_pnl_per_trade": round(total_pnl / len(closed), 2) if closed else 0,
        "total_invested": sum(t.investment_amount for t in all_trades),
    }


@router.get("/{trade_id}")
def get_trade(trade_id: int, db: Session = Depends(get_db)):
    trade = db.query(PaperTrade).filter(PaperTrade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return _trade_to_dict(trade)


def _trade_to_dict(t: PaperTrade) -> dict:
    return {
        "id": t.id,
        "symbol": t.symbol,
        "action": t.action,
        "entry_price": t.entry_price,
        "quantity": t.quantity,
        "investment_amount": t.investment_amount,
        "stop_loss": t.stop_loss,
        "take_profit": t.take_profit,
        "status": t.status,
        "exit_price": t.exit_price,
        "pnl": t.pnl,
        "pnl_percent": t.pnl_percent,
        "entry_time": str(t.entry_time),
        "exit_time": str(t.exit_time) if t.exit_time else None,
        "hold_minutes": t.hold_minutes,
        "notes": t.notes,
        "prediction_id": t.prediction_id,
    }
