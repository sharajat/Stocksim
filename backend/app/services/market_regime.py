import pandas as pd
import numpy as np
from typing import Dict, Any


def detect_regime(df: pd.DataFrame) -> Dict[str, Any]:
    if df.empty or len(df) < 50:
        return {"regime": "UNKNOWN", "score": 0.5, "details": {}}

    close = df["close"]
    returns = close.pct_change().dropna()
    vol_short = returns.rolling(10).std().iloc[-1] * np.sqrt(252) if len(returns) >= 10 else 0
    vol_long = returns.rolling(50).std().iloc[-1] * np.sqrt(252) if len(returns) >= 50 else 0

    sma20 = close.rolling(20).mean().iloc[-1]
    sma50 = close.rolling(50).mean().iloc[-1]
    current = close.iloc[-1]

    ret_20d = (close.iloc[-1] / close.iloc[-20] - 1) * 100 if len(close) >= 20 else 0
    ret_5d = (close.iloc[-1] / close.iloc[-5] - 1) * 100 if len(close) >= 5 else 0

    regime_scores = {}

    if ret_20d > 3 and current > sma20 and current > sma50:
        regime_scores["BULL"] = 0.8
    elif ret_20d > 1 and current > sma20:
        regime_scores["BULL"] = 0.5

    if ret_20d < -3 and current < sma20 and current < sma50:
        regime_scores["BEAR"] = 0.8
    elif ret_20d < -1 and current < sma20:
        regime_scores["BEAR"] = 0.5

    if abs(ret_20d) < 1 and abs(ret_5d) < 0.5:
        regime_scores["SIDEWAYS"] = 0.7

    if vol_short > 0.25:
        regime_scores["HIGH_VOLATILITY"] = 0.8
    elif vol_short < 0.12:
        regime_scores["LOW_VOLATILITY"] = 0.8

    if returns.rolling(5).mean().iloc[-1] > 0.001:
        regime_scores["RISK_ON"] = 0.6
    elif returns.rolling(5).mean().iloc[-1] < -0.001:
        regime_scores["RISK_OFF"] = 0.6

    if not regime_scores:
        regime_scores["SIDEWAYS"] = 0.5

    dominant = max(regime_scores, key=regime_scores.get)

    return {
        "regime": dominant,
        "score": round(regime_scores[dominant], 2),
        "all_scores": {k: round(v, 2) for k, v in regime_scores.items()},
        "details": {
            "current_price": round(current, 2),
            "sma_20": round(sma20, 2),
            "sma_50": round(sma50, 2),
            "return_20d": round(ret_20d, 2),
            "return_5d": round(ret_5d, 2),
            "volatility_annualized": round(vol_short, 4),
        },
    }


def get_market_regime_score(regime: str) -> float:
    regime_map = {
        "BULL": 1.2,
        "RISK_ON": 1.1,
        "LOW_VOLATILITY": 1.0,
        "SIDEWAYS": 0.8,
        "HIGH_VOLATILITY": 0.7,
        "RISK_OFF": 0.6,
        "BEAR": 0.5,
        "UNKNOWN": 0.7,
    }
    return regime_map.get(regime, 0.7)
