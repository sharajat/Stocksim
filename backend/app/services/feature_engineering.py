import pandas as pd
import numpy as np
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty or len(df) < 20:
        return df

    df = df.copy()
    close = df["close"]
    high = df["high"]
    low = df["low"]
    volume = df["volume"]
    open_ = df["open"]

    # === Price Action ===
    df["returns"] = close.pct_change()
    df["log_returns"] = np.log(close / close.shift(1))
    df["price_range"] = (high - low) / close
    df["body"] = abs(close - open_) / (high - low + 1e-9)
    df["upper_shadow"] = (high - close.clip(lower=open_)) / (high - low + 1e-9)
    df["lower_shadow"] = (close.clip(upper=open_) - low) / (high - low + 1e-9)
    df["gap"] = (open_ - close.shift(1)) / close.shift(1)

    # === Moving Averages ===
    for n in [5, 10, 20, 50, 100, 200]:
        df[f"sma_{n}"] = close.rolling(n).mean()
        df[f"ema_{n}"] = close.ewm(span=n, adjust=False).mean()

    df["sma_cross_5_20"] = (df["sma_5"] > df["sma_20"]).astype(int)
    df["sma_cross_10_50"] = (df["sma_10"] > df["sma_50"]).astype(int)
    df["ema_cross_5_20"] = (df["ema_5"] > df["ema_20"]).astype(int)

    df["price_vs_sma20"] = (close - df["sma_20"]) / df["sma_20"]
    df["price_vs_sma50"] = (close - df["sma_50"]) / df["sma_50"]
    df["price_vs_ema20"] = (close - df["ema_20"]) / df["ema_20"]

    # === Momentum ===
    for n in [5, 10, 14, 21]:
        df[f"roc_{n}"] = close.pct_change(n) * 100

    df["rsi_14"] = _compute_rsi(close, 14)
    df["rsi_7"] = _compute_rsi(close, 7)
    df["rsi_21"] = _compute_rsi(close, 21)

    # MACD
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    df["macd"] = ema12 - ema26
    df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
    df["macd_hist"] = df["macd"] - df["macd_signal"]
    df["macd_cross"] = (df["macd"] > df["macd_signal"]).astype(int)

    # Stochastic
    low14 = low.rolling(14).min()
    high14 = high.rolling(14).max()
    df["stoch_k"] = 100 * (close - low14) / (high14 - low14 + 1e-9)
    df["stoch_d"] = df["stoch_k"].rolling(3).mean()

    # Williams %R
    df["williams_r"] = -100 * (high14 - close) / (high14 - low14 + 1e-9)

    # MFI
    df["mfi_14"] = _compute_mfi(high, low, close, volume, 14)

    # === Volatility ===
    for n in [5, 10, 20, 30]:
        df[f"volatility_{n}"] = df["log_returns"].rolling(n).std() * np.sqrt(252)

    # Bollinger Bands
    bb_mid = close.rolling(20).mean()
    bb_std = close.rolling(20).std()
    df["bb_upper"] = bb_mid + 2 * bb_std
    df["bb_lower"] = bb_mid - 2 * bb_std
    df["bb_mid"] = bb_mid
    df["bb_width"] = (df["bb_upper"] - df["bb_lower"]) / (bb_mid + 1e-9)
    df["bb_pct"] = (close - df["bb_lower"]) / (df["bb_upper"] - df["bb_lower"] + 1e-9)

    # ATR
    tr = pd.concat([
        high - low,
        abs(high - close.shift(1)),
        abs(low - close.shift(1))
    ], axis=1).max(axis=1)
    df["atr_14"] = tr.rolling(14).mean()
    df["atr_pct"] = df["atr_14"] / close

    # Keltner Channel
    kc_mid = close.ewm(span=20, adjust=False).mean()
    df["kc_upper"] = kc_mid + 2 * df["atr_14"]
    df["kc_lower"] = kc_mid - 2 * df["atr_14"]
    df["kc_squeeze"] = ((df["bb_upper"] < df["kc_upper"]) & (df["bb_lower"] > df["kc_lower"])).astype(int)

    # === Volume ===
    df["vol_sma_20"] = volume.rolling(20).mean()
    df["vol_ratio"] = volume / (df["vol_sma_20"] + 1e-9)
    df["vol_change"] = volume.pct_change()

    # OBV
    obv = (np.sign(df["returns"]) * volume).cumsum()
    df["obv"] = obv
    df["obv_sma"] = obv.rolling(20).mean()
    df["obv_trend"] = (obv > df["obv_sma"]).astype(int)

    # VWAP
    df["vwap"] = (close * volume).rolling(20).sum() / (volume.rolling(20).sum() + 1e-9)
    df["price_vs_vwap"] = (close - df["vwap"]) / (df["vwap"] + 1e-9)

    # CMF
    mf_mult = ((close - low) - (high - close)) / (high - low + 1e-9)
    mf_vol = mf_mult * volume
    df["cmf_20"] = mf_vol.rolling(20).sum() / (volume.rolling(20).sum() + 1e-9)

    # === Trend ===
    # ADX
    df["adx_14"] = _compute_adx(high, low, close, 14)

    # CCI
    tp = (high + low + close) / 3
    df["cci_20"] = (tp - tp.rolling(20).mean()) / (0.015 * tp.rolling(20).std() + 1e-9)

    # Donchian Channel
    df["dc_upper"] = high.rolling(20).max()
    df["dc_lower"] = low.rolling(20).min()
    df["dc_mid"] = (df["dc_upper"] + df["dc_lower"]) / 2
    df["dc_pct"] = (close - df["dc_lower"]) / (df["dc_upper"] - df["dc_lower"] + 1e-9)

    # === Lag features ===
    for lag in [1, 2, 3, 5]:
        df[f"return_lag_{lag}"] = df["returns"].shift(lag)
        df[f"close_lag_{lag}"] = close.shift(lag)
        df[f"vol_lag_{lag}"] = df["vol_ratio"].shift(lag)

    # === Rolling stats ===
    for n in [5, 10, 20]:
        df[f"returns_mean_{n}"] = df["returns"].rolling(n).mean()
        df[f"returns_std_{n}"] = df["returns"].rolling(n).std()
        df[f"returns_skew_{n}"] = df["returns"].rolling(n).skew()

    df.dropna(inplace=True)
    return df


def get_feature_names() -> list:
    return [
        "returns", "log_returns", "price_range", "body", "upper_shadow", "lower_shadow", "gap",
        "sma_5", "sma_10", "sma_20", "sma_50", "sma_100", "sma_200",
        "ema_5", "ema_10", "ema_20", "ema_50", "ema_100", "ema_200",
        "sma_cross_5_20", "sma_cross_10_50", "ema_cross_5_20",
        "price_vs_sma20", "price_vs_sma50", "price_vs_ema20",
        "roc_5", "roc_10", "roc_14", "roc_21",
        "rsi_14", "rsi_7", "rsi_21",
        "macd", "macd_signal", "macd_hist", "macd_cross",
        "stoch_k", "stoch_d", "williams_r", "mfi_14",
        "volatility_5", "volatility_10", "volatility_20", "volatility_30",
        "bb_upper", "bb_lower", "bb_width", "bb_pct",
        "atr_14", "atr_pct", "kc_squeeze",
        "vol_ratio", "vol_change", "obv_trend", "price_vs_vwap", "cmf_20",
        "adx_14", "cci_20", "dc_pct",
        "return_lag_1", "return_lag_2", "return_lag_3", "return_lag_5",
        "returns_mean_5", "returns_mean_10", "returns_mean_20",
        "returns_std_5", "returns_std_10", "returns_std_20",
    ]


def _compute_rsi(series: pd.Series, period: int) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / (loss + 1e-9)
    return 100 - (100 / (1 + rs))


def _compute_mfi(high, low, close, volume, period):
    tp = (high + low + close) / 3
    mf = tp * volume
    pos_mf = mf.where(tp > tp.shift(1), 0).rolling(period).sum()
    neg_mf = mf.where(tp < tp.shift(1), 0).rolling(period).sum()
    mfi = 100 - (100 / (1 + pos_mf / (neg_mf + 1e-9)))
    return mfi


def _compute_adx(high, low, close, period):
    tr = pd.concat([
        high - low,
        abs(high - close.shift(1)),
        abs(low - close.shift(1))
    ], axis=1).max(axis=1)
    atr = tr.ewm(span=period, adjust=False).mean()

    up = high.diff()
    down = -low.diff()
    pos_dm = up.where((up > down) & (up > 0), 0)
    neg_dm = down.where((down > up) & (down > 0), 0)

    pos_di = 100 * pos_dm.ewm(span=period, adjust=False).mean() / (atr + 1e-9)
    neg_di = 100 * neg_dm.ewm(span=period, adjust=False).mean() / (atr + 1e-9)
    dx = 100 * abs(pos_di - neg_di) / (pos_di + neg_di + 1e-9)
    adx = dx.ewm(span=period, adjust=False).mean()
    return adx


def get_latest_features(df: pd.DataFrame) -> Dict[str, Any]:
    if df.empty:
        return {}
    feat_df = compute_features(df)
    if feat_df.empty:
        return {}
    latest = feat_df.iloc[-1]
    result = {}
    for col in feat_df.columns:
        val = latest[col]
        if pd.isna(val) or np.isinf(val):
            result[col] = None
        else:
            result[col] = round(float(val), 6)
    return result
