import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
import logging

from app.services.data_ingestion import get_ohlcv
from app.services.feature_engineering import compute_features
from app.services.market_regime import detect_regime

logger = logging.getLogger(__name__)


def run_backtest(
    symbol: str,
    start_date: str,
    end_date: str,
    strategy: str = "ml_ensemble",
    initial_capital: float = 100000,
    position_size: float = 0.1,
    stop_loss_pct: float = 0.02,
    take_profit_pct: float = 0.04,
) -> Dict[str, Any]:
    try:
        df = get_ohlcv(symbol, period="2y", interval="1d")
        if df.empty or len(df) < 50:
            return {"error": "Insufficient historical data"}

        try:
            start = pd.Timestamp(start_date)
            end = pd.Timestamp(end_date)
            if df.index.tz is not None:
                start = start.tz_localize(df.index.tz)
                end = end.tz_localize(df.index.tz)
            df = df[(df.index >= start) & (df.index <= end)]
        except Exception:
            pass

        if len(df) < 30:
            return {"error": "No data in specified date range"}

        feat_df = compute_features(df)
        if feat_df.empty:
            return {"error": "Feature computation failed"}

        signals = _generate_signals(feat_df, strategy)
        trades, equity_curve = _simulate_trades(
            feat_df, signals, initial_capital, position_size, stop_loss_pct, take_profit_pct
        )

        metrics = _compute_metrics(trades, equity_curve, initial_capital)

        return {
            "strategy_name": strategy,
            "symbol": symbol.replace(".NS", ""),
            "start_date": start_date,
            "end_date": end_date,
            "initial_capital": initial_capital,
            "final_value": round(equity_curve[-1], 2) if equity_curve else initial_capital,
            "total_return_percent": metrics["total_return"],
            "total_trades": len(trades),
            "winning_trades": metrics["winning"],
            "losing_trades": metrics["losing"],
            "win_rate": metrics["win_rate"],
            "sharpe_ratio": metrics["sharpe"],
            "max_drawdown": metrics["max_drawdown"],
            "profit_factor": metrics["profit_factor"],
            "avg_trade_return": metrics["avg_trade_return"],
            "trades": trades[-50:],
            "equity_curve": [{"date": str(d), "value": round(v, 2)} for d, v in zip(feat_df.index[-len(equity_curve):], equity_curve)],
            "parameters": {
                "position_size": position_size,
                "stop_loss_pct": stop_loss_pct,
                "take_profit_pct": take_profit_pct,
            }
        }
    except Exception as e:
        logger.error(f"Backtest error: {e}")
        return {"error": str(e)}


def _generate_signals(df: pd.DataFrame, strategy: str) -> pd.Series:
    if strategy == "rsi_bb":
        rsi = df.get("rsi_14", pd.Series(50, index=df.index))
        bb_pct = df.get("bb_pct", pd.Series(0.5, index=df.index))
        signals = pd.Series(0, index=df.index)
        signals[(rsi < 35) & (bb_pct < 0.2)] = 1
        signals[(rsi > 65) & (bb_pct > 0.8)] = -1
        return signals

    elif strategy == "macd_ema":
        macd_hist = df.get("macd_hist", pd.Series(0, index=df.index))
        ema_cross = df.get("ema_cross_5_20", pd.Series(1, index=df.index))
        signals = pd.Series(0, index=df.index)
        signals[(macd_hist > 0) & (ema_cross == 1)] = 1
        signals[(macd_hist < 0) & (ema_cross == 0)] = -1
        return signals

    else:
        rsi = df.get("rsi_14", pd.Series(50, index=df.index))
        macd_hist = df.get("macd_hist", pd.Series(0, index=df.index))
        vol_ratio = df.get("vol_ratio", pd.Series(1, index=df.index))
        bb_pct = df.get("bb_pct", pd.Series(0.5, index=df.index))
        adx = df.get("adx_14", pd.Series(20, index=df.index))

        buy_score = (
            (rsi < 45).astype(int) +
            (macd_hist > 0).astype(int) +
            (vol_ratio > 1.2).astype(int) +
            (bb_pct < 0.4).astype(int) +
            (adx > 20).astype(int)
        )
        sell_score = (
            (rsi > 65).astype(int) +
            (macd_hist < 0).astype(int) +
            (bb_pct > 0.7).astype(int)
        )
        signals = pd.Series(0, index=df.index)
        signals[buy_score >= 3] = 1
        signals[sell_score >= 2] = -1
        return signals


def _simulate_trades(df, signals, capital, pos_size, sl_pct, tp_pct):
    equity = capital
    position = 0
    entry_price = 0
    trades = []
    equity_curve = []
    entry_date = None

    close = df["close"]

    for i, (date, row) in enumerate(df.iterrows()):
        price = close.iloc[i]
        signal = signals.iloc[i] if i < len(signals) else 0

        if position != 0:
            pct_change = (price - entry_price) / entry_price
            if position == 1:
                if pct_change >= tp_pct or pct_change <= -sl_pct:
                    pnl = pct_change * pos_size * equity
                    equity += pnl
                    trades.append({
                        "entry_date": str(entry_date),
                        "exit_date": str(date),
                        "action": "BUY",
                        "entry_price": round(entry_price, 2),
                        "exit_price": round(price, 2),
                        "pnl_pct": round(pct_change * 100, 2),
                        "pnl": round(pnl, 2),
                    })
                    position = 0
            elif position == -1:
                if pct_change <= -tp_pct or pct_change >= sl_pct:
                    pnl = -pct_change * pos_size * equity
                    equity += pnl
                    trades.append({
                        "entry_date": str(entry_date),
                        "exit_date": str(date),
                        "action": "SELL",
                        "entry_price": round(entry_price, 2),
                        "exit_price": round(price, 2),
                        "pnl_pct": round(-pct_change * 100, 2),
                        "pnl": round(pnl, 2),
                    })
                    position = 0

        if position == 0 and signal != 0:
            position = signal
            entry_price = price
            entry_date = date

        equity_curve.append(equity)

    return trades, equity_curve


def _compute_metrics(trades, equity_curve, initial_capital):
    if not equity_curve:
        return {
            "total_return": 0, "winning": 0, "losing": 0, "win_rate": 0,
            "sharpe": 0, "max_drawdown": 0, "profit_factor": 0, "avg_trade_return": 0
        }

    final = equity_curve[-1]
    total_return = round((final / initial_capital - 1) * 100, 2)

    winning = sum(1 for t in trades if t["pnl"] > 0)
    losing = sum(1 for t in trades if t["pnl"] <= 0)
    win_rate = round(winning / len(trades) * 100, 2) if trades else 0

    eq = np.array(equity_curve)
    returns = np.diff(eq) / eq[:-1]
    sharpe = round(np.mean(returns) / (np.std(returns) + 1e-9) * np.sqrt(252), 2) if len(returns) > 1 else 0

    peak = np.maximum.accumulate(eq)
    dd = (peak - eq) / peak
    max_dd = round(float(np.max(dd)) * 100, 2)

    gross_profit = sum(t["pnl"] for t in trades if t["pnl"] > 0)
    gross_loss = abs(sum(t["pnl"] for t in trades if t["pnl"] <= 0))
    pf = round(gross_profit / gross_loss, 2) if gross_loss > 0 else float("inf")

    avg_return = round(np.mean([t["pnl_pct"] for t in trades]), 2) if trades else 0

    return {
        "total_return": total_return,
        "winning": winning,
        "losing": losing,
        "win_rate": win_rate,
        "sharpe": sharpe,
        "max_drawdown": max_dd,
        "profit_factor": pf,
        "avg_trade_return": avg_return,
    }
