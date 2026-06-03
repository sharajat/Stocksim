from fastapi import APIRouter, Query, HTTPException
from app.services.data_ingestion import get_ohlcv
from app.services.feature_engineering import compute_features, get_latest_features, get_feature_names

router = APIRouter()


@router.get("/{symbol}")
def get_features(symbol: str, period: str = Query("60d")):
    df = get_ohlcv(symbol, period=period, interval="1d")
    if df.empty:
        raise HTTPException(status_code=404, detail="No data found")
    latest = get_latest_features(df)
    if not latest:
        raise HTTPException(status_code=422, detail="Could not compute features")
    return {"symbol": symbol, "features": latest, "count": len(latest)}


@router.get("/{symbol}/history")
def get_feature_history(symbol: str, period: str = Query("60d"), feature: str = Query("rsi_14")):
    df = get_ohlcv(symbol, period=period, interval="1d")
    if df.empty:
        raise HTTPException(status_code=404, detail="No data found")
    feat_df = compute_features(df)
    if feat_df.empty or feature not in feat_df.columns:
        raise HTTPException(status_code=404, detail=f"Feature {feature} not found")
    result = feat_df[[feature]].reset_index()
    result.columns = ["date", "value"]
    result["date"] = result["date"].astype(str)
    return result.to_dict(orient="records")


@router.get("/list/all")
def feature_list():
    return {"features": get_feature_names(), "count": len(get_feature_names())}
