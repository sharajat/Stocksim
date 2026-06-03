from app.celery_app import celery_app
from app.services.data_ingestion import get_ohlcv, NSE_UNIVERSE
from app.services.ml_engine import train_models
import logging

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.retrain_all_models")
def retrain_all_models():
    logger.info("Starting daily model retraining...")
    for symbol in NSE_UNIVERSE[:10]:
        try:
            df = get_ohlcv(symbol, period="2y", interval="1d")
            if not df.empty:
                result = train_models(df, symbol)
                logger.info(f"Trained {symbol}: {result.get('metrics', {})}")
        except Exception as e:
            logger.error(f"Retrain failed for {symbol}: {e}")


@celery_app.task(name="app.tasks.verify_open_predictions")
def verify_open_predictions():
    from app.database import SessionLocal
    from app.models.db_models import Prediction
    from app.services.data_ingestion import get_ohlcv
    from datetime import datetime, timedelta

    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(minutes=10)
        preds = db.query(Prediction).filter(
            Prediction.outcome_verified == False,
            Prediction.created_at <= cutoff,
        ).all()

        for pred in preds:
            try:
                df = get_ohlcv(pred.symbol, period="1d", interval="5m")
                if not df.empty:
                    current_price = float(df["close"].iloc[-1])
                    entry = pred.entry_price or current_price
                    if entry > 0:
                        actual_pct = (current_price - entry) / entry * 100
                        if pred.action == "SELL":
                            actual_pct = -actual_pct
                        pred.outcome_price = current_price
                        pred.actual_profit_percent = round(actual_pct, 2)
                        pred.outcome_verified = True
                        pred.outcome_verified_at = datetime.utcnow()
            except Exception as e:
                logger.error(f"Verify failed for pred {pred.id}: {e}")

        db.commit()
    finally:
        db.close()
