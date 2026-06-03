from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
import pandas as pd

from app.services.data_ingestion import get_stock_info, get_ohlcv, get_market_breadth, get_universe_quotes, NSE_UNIVERSE
from app.services.market_regime import detect_regime

router = APIRouter()


@router.get("/info/{symbol}")
def stock_info(symbol: str):
    info = get_stock_info(symbol)
    if "error" in info and len(info) == 2:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
    return info


@router.get("/ohlcv/{symbol}")
def stock_ohlcv(
    symbol: str,
    period: str = Query("60d", enum=["7d", "30d", "60d", "90d", "180d", "1y", "2y", "5y"]),
    interval: str = Query("1d", enum=["1m", "5m", "15m", "1h", "1d", "1wk"]),
):
    df = get_ohlcv(symbol, period=period, interval=interval)
    if df.empty:
        raise HTTPException(status_code=404, detail="No data found")
    df = df.reset_index()
    df.columns = [c.lower() for c in df.columns]
    date_col = "date" if "date" in df.columns else df.columns[0]
    df[date_col] = df[date_col].astype(str)
    return df.to_dict(orient="records")


@router.get("/regime/{symbol}")
def stock_regime(symbol: str, period: str = "60d"):
    df = get_ohlcv(symbol, period=period, interval="1d")
    if df.empty:
        raise HTTPException(status_code=404, detail="No data for regime detection")
    return detect_regime(df)


@router.get("/market-breadth")
def market_breadth():
    return get_market_breadth()


@router.get("/universe")
def universe_quotes():
    return get_universe_quotes()


@router.get("/search")
def search_stocks(q: str = Query(..., min_length=1)):
    q_upper = q.upper()
    matches = []
    for sym in NSE_UNIVERSE:
        clean = sym.replace(".NS", "")
        if q_upper in clean:
            matches.append({"symbol": clean, "full_symbol": sym})
    if not matches:
        matches = [
            {"symbol": q_upper, "full_symbol": q_upper + ".NS"},
            {"symbol": q_upper, "full_symbol": q_upper + ".BO"},
        ]
    return matches[:10]


@router.get("/universe/list")
def universe_list():
    return [{"symbol": s.replace(".NS", ""), "full_symbol": s} for s in NSE_UNIVERSE]
