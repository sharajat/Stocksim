from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import Prediction, PaperTrade, BacktestResult
from app.services.data_ingestion import get_market_breadth
from app.services.opportunity_scanner import scan_universe

router = APIRouter()


@router.get("/dashboard")
def dashboard_summary(db: Session = Depends(get_db)):
    predictions = db.query(Prediction).order_by(Prediction.created_at.desc()).limit(10).all()
    open_trades = db.query(PaperTrade).filter(PaperTrade.status == "OPEN").count()
    closed_trades_q = db.query(PaperTrade).filter(PaperTrade.status == "CLOSED").all()
    total_pnl = sum(t.pnl or 0 for t in closed_trades_q)
    win = sum(1 for t in closed_trades_q if (t.pnl or 0) > 0)
    win_rate = win / len(closed_trades_q) * 100 if closed_trades_q else 0

    recent_preds = [
        {
            "id": p.id,
            "symbol": p.symbol,
            "action": p.action,
            "confidence": p.confidence,
            "risk": p.risk,
            "created_at": str(p.created_at),
        }
        for p in predictions
    ]

    market = get_market_breadth()

    return {
        "market": market,
        "stats": {
            "total_predictions": db.query(Prediction).count(),
            "open_trades": open_trades,
            "closed_trades": len(closed_trades_q),
            "total_pnl": round(total_pnl, 2),
            "win_rate": round(win_rate, 2),
        },
        "recent_predictions": recent_preds,
    }


@router.get("/opportunities")
def top_opportunities(investment: float = 50000):
    results = scan_universe(investment, top_n=5)
    return {"opportunities": results, "count": len(results)}
