from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models.db_models import Prediction, User
from app.routers.auth import get_current_user
from app.services.data_ingestion import get_ohlcv
from app.services.ml_engine import predict
from app.services.market_regime import detect_regime, get_market_regime_score
from app.services.news_intelligence import get_aggregate_sentiment
from app.services.opportunity_scanner import compute_opportunity_score

router = APIRouter()


class PredictRequest(BaseModel):
    symbol: str
    investment_amount: float = 50000.0


class ScanRequest(BaseModel):
    investment_amount: float = 50000.0


@router.post("/predict")
def make_prediction(
    req: PredictRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    df = get_ohlcv(req.symbol, period="90d", interval="1d")
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data for symbol {req.symbol}")

    pred = predict(df, req.symbol, req.investment_amount)
    regime = detect_regime(df)
    regime_score = get_market_regime_score(regime["regime"])
    news = get_aggregate_sentiment(req.symbol)

    opp_score = compute_opportunity_score(
        pred["confidence"],
        pred["expected_profit_percent"],
        pred["risk"],
        regime_score
    )

    pred["market_regime"] = regime["regime"]
    pred["regime_details"] = regime["details"]
    pred["news_sentiment"] = news["composite_score"]
    pred["news_overall"] = news["overall_sentiment"]
    pred["opportunity_score"] = opp_score

    background_tasks.add_task(
        _save_prediction, db, pred, req, current_user
    )

    return pred


@router.get("/history")
def prediction_history(
    symbol: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    query = db.query(Prediction)
    if symbol:
        query = query.filter(Prediction.symbol.ilike(f"%{symbol}%"))
    if current_user:
        query = query.filter(Prediction.user_id == current_user.id)
    predictions = query.order_by(Prediction.created_at.desc()).limit(limit).all()
    return [_pred_to_dict(p) for p in predictions]


@router.get("/{prediction_id}")
def get_prediction(prediction_id: int, db: Session = Depends(get_db)):
    pred = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return _pred_to_dict(pred)


@router.post("/{prediction_id}/verify")
def verify_outcome(prediction_id: int, db: Session = Depends(get_db)):
    pred = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction not found")

    df = get_ohlcv(pred.symbol, period="7d", interval="1d")
    if not df.empty:
        current_price = float(df["close"].iloc[-1])
        entry = pred.entry_price or current_price
        if entry > 0:
            actual_pct = (current_price - entry) / entry * 100
            if pred.action == "SELL":
                actual_pct = -actual_pct
            pred.outcome_price = current_price
            pred.actual_profit_percent = round(actual_pct, 2)
            pred.actual_profit_amount = round(
                (pred.investment_amount or 50000) * actual_pct / 100, 2
            ) if pred.investment_amount else None
            pred.outcome_verified = True
            pred.outcome_verified_at = datetime.utcnow()
            db.commit()

    return _pred_to_dict(pred)


@router.get("/audit/stats")
def audit_stats(db: Session = Depends(get_db)):
    preds = db.query(Prediction).all()
    verified = [p for p in preds if p.outcome_verified]

    if not verified:
        return {"message": "No verified predictions yet", "total": len(preds)}

    correct = sum(1 for p in verified
                  if (p.action == "BUY" and (p.actual_profit_percent or 0) > 0) or
                     (p.action == "SELL" and (p.actual_profit_percent or 0) < 0))
    acc = correct / len(verified) * 100 if verified else 0

    profits = [p.actual_profit_percent for p in verified if p.actual_profit_percent is not None]
    win_rate = sum(1 for x in profits if x > 0) / len(profits) * 100 if profits else 0

    return {
        "total_predictions": len(preds),
        "verified_predictions": len(verified),
        "accuracy": round(acc, 2),
        "win_rate": round(win_rate, 2),
        "avg_return": round(sum(profits) / len(profits), 2) if profits else 0,
        "total_pnl": round(sum(p.actual_profit_amount or 0 for p in verified), 2),
    }


def _save_prediction(db: Session, pred: dict, req, user: Optional[User]):
    try:
        db_pred = Prediction(
            user_id=user.id if user else None,
            symbol=pred["symbol"],
            action=pred["action"],
            confidence=pred["confidence"],
            expected_profit_percent=pred.get("expected_profit_percent"),
            expected_profit_amount=pred.get("expected_profit_amount"),
            suggested_hold_time_minutes=pred.get("suggested_hold_time_minutes"),
            risk=pred.get("risk"),
            investment_amount=req.investment_amount,
            entry_price=pred.get("entry_price"),
            model_used=pred.get("model_used"),
            market_regime=pred.get("market_regime"),
            shap_values=pred.get("shap_values"),
            news_sentiment=pred.get("news_sentiment"),
            opportunity_score=pred.get("opportunity_score"),
        )
        db.add(db_pred)
        db.commit()
    except Exception as e:
        db.rollback()


def _pred_to_dict(p: Prediction) -> dict:
    return {
        "id": p.id,
        "symbol": p.symbol,
        "action": p.action,
        "confidence": p.confidence,
        "expected_profit_percent": p.expected_profit_percent,
        "expected_profit_amount": p.expected_profit_amount,
        "suggested_hold_time_minutes": p.suggested_hold_time_minutes,
        "risk": p.risk,
        "investment_amount": p.investment_amount,
        "entry_price": p.entry_price,
        "model_used": p.model_used,
        "market_regime": p.market_regime,
        "news_sentiment": p.news_sentiment,
        "opportunity_score": p.opportunity_score,
        "created_at": str(p.created_at),
        "outcome_verified": p.outcome_verified,
        "actual_profit_percent": p.actual_profit_percent,
        "actual_profit_amount": p.actual_profit_amount,
        "outcome_verified_at": str(p.outcome_verified_at) if p.outcome_verified_at else None,
    }
