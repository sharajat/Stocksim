import yfinance as yf
import pandas as pd
import numpy as np
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import logging
import requests
import urllib3
import time
import random

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)
logging.getLogger("yfinance").setLevel(logging.CRITICAL)
logging.getLogger("peewee").setLevel(logging.CRITICAL)

_session = requests.Session()
_session.verify = False
_session.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive",
})

try:
    from curl_cffi import requests as cffi_requests
    _cffi_session = cffi_requests.Session(impersonate="chrome120", verify=False)
    logger.info("curl_cffi available — using Chrome TLS fingerprint for Yahoo Finance")
except Exception:
    _cffi_session = None
    logger.warning("curl_cffi not available, falling back to requests session")

NSE_UNIVERSE = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "HINDUNILVR.NS", "SBIN.NS", "BAJFINANCE.NS", "BHARTIARTL.NS", "KOTAKBANK.NS",
    "ITC.NS", "LT.NS", "AXISBANK.NS", "ASIANPAINT.NS", "MARUTI.NS",
    "TITAN.NS", "SUNPHARMA.NS", "WIPRO.NS", "HCLTECH.NS", "ADANIENT.NS",
    "ULTRACEMCO.NS", "NESTLEIND.NS", "POWERGRID.NS", "TATAMOTORS.NS", "ONGC.NS",
    "NTPC.NS", "JSWSTEEL.NS", "TATASTEEL.NS", "TECHM.NS", "M&M.NS",
]

_MOCK_PRICES: Dict[str, float] = {
    "RELIANCE.NS": 2905.0, "TCS.NS": 3812.0, "HDFCBANK.NS": 1712.0,
    "INFY.NS": 1823.0, "ICICIBANK.NS": 1198.0, "HINDUNILVR.NS": 2298.0,
    "SBIN.NS": 821.0, "BAJFINANCE.NS": 6985.0, "BHARTIARTL.NS": 1587.0,
    "KOTAKBANK.NS": 1892.0, "ITC.NS": 452.0, "LT.NS": 3478.0,
    "AXISBANK.NS": 1204.0, "ASIANPAINT.NS": 2412.0, "MARUTI.NS": 12480.0,
    "TITAN.NS": 3218.0, "SUNPHARMA.NS": 1698.0, "WIPRO.NS": 548.0,
    "HCLTECH.NS": 1715.0, "ADANIENT.NS": 2784.0, "ULTRACEMCO.NS": 9987.0,
    "NESTLEIND.NS": 2398.0, "POWERGRID.NS": 328.0, "TATAMOTORS.NS": 892.0,
    "ONGC.NS": 258.0, "NTPC.NS": 378.0, "JSWSTEEL.NS": 948.0,
    "TATASTEEL.NS": 158.0, "TECHM.NS": 1598.0, "M&M.NS": 2798.0,
    "^NSEI": 24831.0,
}

_MOCK_META: Dict[str, Dict[str, Any]] = {
    "RELIANCE.NS": {"name": "Reliance Industries Ltd", "sector": "Energy", "industry": "Oil & Gas Integrated"},
    "TCS.NS": {"name": "Tata Consultancy Services", "sector": "Technology", "industry": "IT Services"},
    "HDFCBANK.NS": {"name": "HDFC Bank Ltd", "sector": "Financial Services", "industry": "Banks"},
    "INFY.NS": {"name": "Infosys Ltd", "sector": "Technology", "industry": "IT Services"},
    "ICICIBANK.NS": {"name": "ICICI Bank Ltd", "sector": "Financial Services", "industry": "Banks"},
    "HINDUNILVR.NS": {"name": "Hindustan Unilever Ltd", "sector": "Consumer Staples", "industry": "FMCG"},
    "SBIN.NS": {"name": "State Bank of India", "sector": "Financial Services", "industry": "Banks"},
    "BAJFINANCE.NS": {"name": "Bajaj Finance Ltd", "sector": "Financial Services", "industry": "NBFC"},
    "BHARTIARTL.NS": {"name": "Bharti Airtel Ltd", "sector": "Communication", "industry": "Telecom"},
    "KOTAKBANK.NS": {"name": "Kotak Mahindra Bank", "sector": "Financial Services", "industry": "Banks"},
    "ITC.NS": {"name": "ITC Ltd", "sector": "Consumer Staples", "industry": "FMCG"},
    "LT.NS": {"name": "Larsen & Toubro Ltd", "sector": "Industrials", "industry": "Engineering"},
    "AXISBANK.NS": {"name": "Axis Bank Ltd", "sector": "Financial Services", "industry": "Banks"},
    "ASIANPAINT.NS": {"name": "Asian Paints Ltd", "sector": "Materials", "industry": "Paints"},
    "MARUTI.NS": {"name": "Maruti Suzuki India Ltd", "sector": "Consumer Discretionary", "industry": "Automobiles"},
    "TITAN.NS": {"name": "Titan Company Ltd", "sector": "Consumer Discretionary", "industry": "Luxury Goods"},
    "SUNPHARMA.NS": {"name": "Sun Pharmaceutical Industries", "sector": "Healthcare", "industry": "Pharmaceuticals"},
    "WIPRO.NS": {"name": "Wipro Ltd", "sector": "Technology", "industry": "IT Services"},
    "HCLTECH.NS": {"name": "HCL Technologies Ltd", "sector": "Technology", "industry": "IT Services"},
    "ADANIENT.NS": {"name": "Adani Enterprises Ltd", "sector": "Industrials", "industry": "Conglomerate"},
}


def _yf_session():
    """Return best available session for yfinance: curl_cffi > requests."""
    return _cffi_session if _cffi_session is not None else _session


def _fetch_stooq_ohlcv(symbol: str, days: int = 60) -> pd.DataFrame:
    """Fetch OHLCV from Stooq.com (free, no API key, works for NSE/BSE)."""
    import io
    try:
        sym = _normalize_symbol(symbol)
        stooq_sym = sym.lower().replace("^nsei", "^nsei")
        end = datetime.now()
        start = end - timedelta(days=days * 2)
        url = (
            f"https://stooq.com/q/d/l/?s={stooq_sym}"
            f"&d1={start.strftime('%Y%m%d')}&d2={end.strftime('%Y%m%d')}&i=d"
        )
        resp = _session.get(url, timeout=15)
        if resp.status_code == 200 and "Date" in resp.text and len(resp.text) > 50:
            df = pd.read_csv(io.StringIO(resp.text))
            df.columns = [c.lower() for c in df.columns]
            df["date"] = pd.to_datetime(df["date"])
            df = df.set_index("date").sort_index()
            available = [c for c in ["open", "high", "low", "close", "volume"] if c in df.columns]
            return df[available].dropna().tail(days)
    except Exception as e:
        logger.debug(f"Stooq fetch failed for {symbol}: {e}")
    return pd.DataFrame()


def _mock_ohlcv(symbol: str, days: int = 60, interval_mins: int = 1440) -> pd.DataFrame:
    """Generate synthetic OHLCV data resembling a realistic stock price series."""
    sym = _normalize_symbol(symbol)
    base = _MOCK_PRICES.get(sym, 1000.0)
    rng = np.random.default_rng(seed=abs(hash(sym)) % (2**32))
    n = days
    freq = "B" if interval_mins >= 1440 else f"{interval_mins}min"
    dates = pd.bdate_range(end=datetime.now(), periods=n, freq="B") if interval_mins >= 1440 \
        else pd.date_range(end=datetime.now(), periods=n, freq=f"{interval_mins}min")
    returns = rng.normal(0.0003, 0.015, n)
    closes = base * np.exp(np.cumsum(returns))
    opens = closes * (1 + rng.uniform(-0.005, 0.005, n))
    highs = np.maximum(opens, closes) * (1 + rng.uniform(0, 0.015, n))
    lows = np.minimum(opens, closes) * (1 - rng.uniform(0, 0.015, n))
    volumes = rng.integers(500_000, 8_000_000, n).astype(float)
    df = pd.DataFrame(
        {"open": opens, "high": highs, "low": lows, "close": closes, "volume": volumes},
        index=dates,
    )
    return df


def get_stock_info(symbol: str) -> Dict[str, Any]:
    try:
        sym = _normalize_symbol(symbol)
        ticker = yf.Ticker(sym, session=_yf_session())
        info = ticker.info
        price = info.get("currentPrice") or info.get("regularMarketPrice") or 0
        if price and price > 0:
            return {
                "symbol": sym,
                "name": info.get("longName", sym),
                "sector": info.get("sector", "Unknown"),
                "industry": info.get("industry", "Unknown"),
                "market_cap": info.get("marketCap", 0),
                "current_price": price,
                "previous_close": info.get("previousClose", 0),
                "open": info.get("open", 0),
                "day_high": info.get("dayHigh", 0),
                "day_low": info.get("dayLow", 0),
                "volume": info.get("volume", 0),
                "avg_volume": info.get("averageVolume", 0),
                "pe_ratio": info.get("trailingPE", 0),
                "pb_ratio": info.get("priceToBook", 0),
                "dividend_yield": info.get("dividendYield", 0),
                "52w_high": info.get("fiftyTwoWeekHigh", 0),
                "52w_low": info.get("fiftyTwoWeekLow", 0),
                "beta": info.get("beta", 1.0),
                "currency": info.get("currency", "INR"),
                "exchange": info.get("exchange", "NSE"),
            }
    except Exception as e:
        logger.warning(f"yfinance info unavailable for {symbol}, using mock: {e}")

    sym = _normalize_symbol(symbol)
    base = _MOCK_PRICES.get(sym, 1000.0)
    meta = _MOCK_META.get(sym, {})
    rng = np.random.default_rng(seed=abs(hash(sym)) % (2**32))
    chg = rng.uniform(-0.02, 0.02)
    return {
        "symbol": sym,
        "name": meta.get("name", sym.replace(".NS", "")),
        "sector": meta.get("sector", "Unknown"),
        "industry": meta.get("industry", "Unknown"),
        "market_cap": int(base * rng.integers(50_000_000, 500_000_000)),
        "current_price": round(base * (1 + chg), 2),
        "previous_close": round(base, 2),
        "open": round(base * (1 + rng.uniform(-0.01, 0.01)), 2),
        "day_high": round(base * (1 + abs(chg) + 0.005), 2),
        "day_low": round(base * (1 - abs(chg) - 0.005), 2),
        "volume": int(rng.integers(500_000, 8_000_000)),
        "avg_volume": int(rng.integers(2_000_000, 10_000_000)),
        "pe_ratio": round(rng.uniform(15, 45), 2),
        "pb_ratio": round(rng.uniform(1, 8), 2),
        "dividend_yield": round(rng.uniform(0, 0.03), 4),
        "52w_high": round(base * 1.35, 2),
        "52w_low": round(base * 0.70, 2),
        "beta": round(rng.uniform(0.6, 1.6), 2),
        "currency": "INR",
        "exchange": "NSE",
    }


def get_ohlcv(symbol: str, period: str = "60d", interval: str = "1d") -> pd.DataFrame:
    period_days = {"1d": 1, "5d": 5, "1mo": 22, "3mo": 66, "60d": 60,
                   "6mo": 130, "1y": 252, "2y": 504, "5y": 1260}.get(period, 60)
    interval_mins = {"1m": 1, "5m": 5, "15m": 15, "1h": 60, "1d": 1440}.get(interval, 1440)

    # Layer 1: Yahoo Finance via curl_cffi
    try:
        sym = _normalize_symbol(symbol)
        df = yf.download(
            sym, period=period, interval=interval,
            auto_adjust=True, progress=False, session=_yf_session()
        )
        if not df.empty:
            df.index = pd.to_datetime(df.index)
            df.columns = [c.lower() if isinstance(c, str) else c[0].lower() for c in df.columns]
            available = [c for c in ["open", "high", "low", "close", "volume"] if c in df.columns]
            result = df[available].copy()
            if not result.empty:
                return result
    except Exception as e:
        logger.warning(f"yfinance OHLCV unavailable for {symbol}: {e}")

    # Layer 2: Stooq (only for daily interval)
    if interval_mins >= 1440:
        df = _fetch_stooq_ohlcv(symbol, days=period_days)
        if not df.empty:
            return df

    # Layer 3: mock
    return _mock_ohlcv(symbol, days=period_days, interval_mins=interval_mins)


def get_multi_timeframe(symbol: str) -> Dict[str, pd.DataFrame]:
    sym = _normalize_symbol(symbol)
    timeframes = {
        "5m": ("60d", "5m"),
        "15m": ("60d", "15m"),
        "1h": ("730d", "1h"),
        "1d": ("5y", "1d"),
    }
    result = {}
    for tf, (period, interval) in timeframes.items():
        try:
            df = get_ohlcv(sym, period=period, interval=interval)
            if not df.empty:
                result[tf] = df
        except Exception as e:
            logger.warning(f"Failed {tf} for {sym}: {e}")
    return result


def get_market_breadth() -> Dict[str, Any]:
    try:
        df = yf.download("^NSEI", period="5d", interval="1d",
                         auto_adjust=True, progress=False, session=_yf_session())
        if not df.empty:
            close = df["Close"] if "Close" in df.columns else df.iloc[:, 3]
            price = float(close.iloc[-1])
            change = 0.0
            if len(close) >= 2:
                change = ((price - float(close.iloc[-2])) / float(close.iloc[-2])) * 100
            return {
                "nifty_50": round(price, 2),
                "nifty_change_pct": round(change, 2),
                "market_status": "OPEN" if datetime.now().hour in range(9, 16) else "CLOSED",
            }
    except Exception as e:
        logger.warning(f"yfinance market breadth unavailable, using mock: {e}")

    rng = np.random.default_rng(seed=int(datetime.now().strftime("%Y%m%d")))
    base = _MOCK_PRICES.get("^NSEI", 24800.0)
    chg = rng.uniform(-1.5, 1.5)
    return {
        "nifty_50": round(base * (1 + chg / 100), 2),
        "nifty_change_pct": round(chg, 2),
        "market_status": "OPEN" if datetime.now().hour in range(9, 16) else "CLOSED",
    }


def get_universe_quotes() -> List[Dict[str, Any]]:
    symbols = NSE_UNIVERSE[:15]
    results = []
    try:
        raw = yf.download(
            symbols, period="5d", interval="1d",
            auto_adjust=True, progress=False, session=_yf_session(),
            group_by="ticker"
        )
        live_results = []
        for sym in symbols:
            try:
                hist = raw[sym] if len(symbols) > 1 else raw
                hist = hist.dropna(how="all")
                if len(hist) >= 1:
                    price = float(hist["Close"].iloc[-1])
                    change = 0.0
                    if len(hist) >= 2:
                        prev = float(hist["Close"].iloc[-2])
                        change = ((price - prev) / prev) * 100 if prev else 0.0
                    vol = int(hist["Volume"].iloc[-1]) if "Volume" in hist.columns else 0
                    if price > 0:
                        live_results.append({
                            "symbol": sym.replace(".NS", ""),
                            "price": round(price, 2),
                            "change_pct": round(change, 2),
                            "volume": vol,
                        })
            except Exception:
                pass
        if live_results:
            return live_results
    except Exception as e:
        logger.warning(f"yfinance batch download unavailable, using mock: {e}")

    rng = np.random.default_rng(seed=int(datetime.now().strftime("%Y%m%d%H")))
    for sym in symbols:
        base = _MOCK_PRICES.get(sym, 1000.0)
        chg = float(rng.uniform(-2.5, 2.5))
        price = round(base * (1 + chg / 100), 2)
        results.append({
            "symbol": sym.replace(".NS", ""),
            "price": price,
            "change_pct": round(chg, 2),
            "volume": int(rng.integers(500_000, 8_000_000)),
        })
    return results


def _normalize_symbol(symbol: str) -> str:
    sym = symbol.upper().strip()
    if not sym.endswith(".NS") and not sym.endswith(".BO") and "^" not in sym:
        sym = sym + ".NS"
    return sym
