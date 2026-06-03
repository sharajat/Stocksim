from fastapi import APIRouter, Query, HTTPException
import pandas as pd
from app.services.data_ingestion import get_ohlcv
from app.services.feature_engineering import compute_features
from app.services.market_regime import detect_regime

router = APIRouter()


@router.get("/{symbol}")
def get_signals(symbol: str, period: str = Query("60d")):
    df = get_ohlcv(symbol, period=period, interval="1d")
    if df.empty:
        raise HTTPException(status_code=404, detail="No data")

    feat_df = compute_features(df)
    if feat_df.empty:
        raise HTTPException(status_code=422, detail="Cannot compute signals")

    latest = feat_df.iloc[-1]
    regime = detect_regime(df)

    def _val(col, default=0):
        v = latest.get(col, default)
        if pd.isna(v):
            return default
        return round(float(v), 4)

    rsi = _val("rsi_14", 50)
    macd_hist = _val("macd_hist", 0)
    bb_pct = _val("bb_pct", 0.5)
    stoch_k = _val("stoch_k", 50)
    adx = _val("adx_14", 20)
    cci = _val("cci_20", 0)
    vol_ratio = _val("vol_ratio", 1)
    obv_trend = _val("obv_trend", 0)
    cmf = _val("cmf_20", 0)
    macd_cross = _val("macd_cross", 0)

    def _signal(value, buy_thresh, sell_thresh):
        if value <= buy_thresh:
            return "BUY"
        elif value >= sell_thresh:
            return "SELL"
        return "NEUTRAL"

    signals = {
        "RSI (14)": {"value": rsi, "signal": _signal(rsi, 30, 70), "interpretation": "Oversold <30, Overbought >70"},
        "MACD": {"value": macd_hist, "signal": "BUY" if macd_hist > 0 and macd_cross else ("SELL" if macd_hist < 0 else "NEUTRAL"), "interpretation": "Bullish histogram + crossover"},
        "Bollinger Bands": {"value": bb_pct, "signal": _signal(bb_pct, 0.2, 0.8), "interpretation": "%B position"},
        "Stochastic": {"value": stoch_k, "signal": _signal(stoch_k, 20, 80), "interpretation": "%K value"},
        "ADX": {"value": adx, "signal": "STRONG_TREND" if adx > 25 else "WEAK_TREND", "interpretation": "Trend strength >25"},
        "CCI": {"value": cci, "signal": _signal(cci, -100, 100), "interpretation": "Oversold <-100, Overbought >100"},
        "Volume Ratio": {"value": vol_ratio, "signal": "HIGH" if vol_ratio > 1.5 else ("LOW" if vol_ratio < 0.7 else "NORMAL"), "interpretation": "Relative volume"},
        "OBV": {"value": obv_trend, "signal": "BULLISH" if obv_trend else "BEARISH", "interpretation": "On-balance volume trend"},
        "CMF": {"value": cmf, "signal": "BUY" if cmf > 0.1 else ("SELL" if cmf < -0.1 else "NEUTRAL"), "interpretation": "Chaikin Money Flow"},
    }

    buy_count = sum(1 for s in signals.values() if s["signal"] in ["BUY", "BULLISH", "HIGH"])
    sell_count = sum(1 for s in signals.values() if s["signal"] in ["SELL", "BEARISH"])

    if buy_count >= 5:
        overall = "STRONG BUY"
    elif buy_count >= 3:
        overall = "BUY"
    elif sell_count >= 4:
        overall = "STRONG SELL"
    elif sell_count >= 3:
        overall = "SELL"
    else:
        overall = "NEUTRAL"

    return {
        "symbol": symbol.replace(".NS", ""),
        "overall_signal": overall,
        "buy_signals": buy_count,
        "sell_signals": sell_count,
        "neutral_signals": len(signals) - buy_count - sell_count,
        "signals": signals,
        "market_regime": regime["regime"],
        "regime_score": regime["score"],
    }
