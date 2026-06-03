import logging
import math
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed

from app.services.data_ingestion import get_ohlcv, NSE_UNIVERSE, _normalize_symbol
from app.services.market_regime import detect_regime, get_market_regime_score
from app.services.ml_engine import predict

logger = logging.getLogger(__name__)

_SYMBOL_META: Dict[str, Dict[str, str]] = {
    "RELIANCE.NS": {"exchange": "NSE", "sector": "Energy"},
    "TCS.NS": {"exchange": "NSE", "sector": "IT"},
    "HDFCBANK.NS": {"exchange": "NSE", "sector": "Banking"},
    "INFY.NS": {"exchange": "NSE", "sector": "IT"},
    "ICICIBANK.NS": {"exchange": "NSE", "sector": "Banking"},
    "HINDUNILVR.NS": {"exchange": "NSE", "sector": "FMCG"},
    "SBIN.NS": {"exchange": "NSE", "sector": "Banking"},
    "BAJFINANCE.NS": {"exchange": "NSE", "sector": "NBFC"},
    "BHARTIARTL.NS": {"exchange": "NSE", "sector": "Telecom"},
    "KOTAKBANK.NS": {"exchange": "NSE", "sector": "Banking"},
    "ITC.NS": {"exchange": "NSE", "sector": "FMCG"},
    "LT.NS": {"exchange": "NSE", "sector": "Industrials"},
    "AXISBANK.NS": {"exchange": "NSE", "sector": "Banking"},
    "ASIANPAINT.NS": {"exchange": "NSE", "sector": "Paints"},
    "MARUTI.NS": {"exchange": "NSE", "sector": "Automobiles"},
    "TITAN.NS": {"exchange": "NSE", "sector": "Consumer"},
    "SUNPHARMA.NS": {"exchange": "NSE", "sector": "Pharma"},
    "WIPRO.NS": {"exchange": "NSE", "sector": "IT"},
    "HCLTECH.NS": {"exchange": "NSE", "sector": "IT"},
    "ADANIENT.NS": {"exchange": "NSE", "sector": "Conglomerate"},
}


def compute_opportunity_score(confidence: float, exp_profit: float, risk: str, regime_score: float) -> float:
    risk_adj = {"LOW": 1.2, "MEDIUM": 1.0, "HIGH": 0.7}.get(risk, 1.0)
    opp_score = (confidence / 100) * (exp_profit / 100) * risk_adj * regime_score * 1000
    return round(opp_score, 4)


def _estimate_atr_pct(df) -> float:
    try:
        recent = df.tail(14)
        if len(recent) >= 2 and "high" in recent.columns and "low" in recent.columns and "close" in recent.columns:
            tr = (recent["high"] - recent["low"]).mean()
            avg_close = recent["close"].mean()
            if avg_close and avg_close > 0 and tr:
                pct = float(tr / avg_close)
                return max(0.008, min(pct, 0.05))
    except Exception:
        pass
    return 0.015


def _compute_charges(investment: float, trade_type: str) -> Dict[str, float]:
    brokerage = round(min(20.0, investment * 0.0003) * 2, 2)
    if "INTRADAY" in trade_type:
        stt = round(investment * 0.00025, 2)
        sebi = round(investment * 0.000001 * 2, 4)
        stamp = round(investment * 0.00003, 2)
    else:
        stt = round(investment * 0.001, 2)
        sebi = round(investment * 0.000001, 4)
        stamp = round(investment * 0.00015, 2)
    exchange_fee = round(investment * 0.0000345 * 2, 4)
    gst = round(brokerage * 0.18, 2)
    total = round(brokerage + stt + sebi + stamp + exchange_fee + gst, 2)
    return {
        "brokerage": brokerage,
        "stt": stt,
        "exchange_fee": exchange_fee,
        "sebi_fee": sebi,
        "stamp_duty": stamp,
        "gst": gst,
        "total_charges": total,
    }


def scan_opportunity(symbol: str, investment: float) -> Dict[str, Any]:
    try:
        df = get_ohlcv(symbol, period="60d", interval="1d")
        if df.empty or len(df) < 30:
            return None

        regime_info = detect_regime(df)
        regime_score = get_market_regime_score(regime_info["regime"])
        pred = predict(df, symbol, investment)

        if pred.get("action") == "HOLD":
            return None

        action = pred["action"]
        entry_price = pred.get("entry_price") or 0
        hold_mins = pred["suggested_hold_time_minutes"]
        confidence = pred["confidence"]

        if entry_price <= 0:
            return None

        opp_score = compute_opportunity_score(
            confidence, pred["expected_profit_percent"], pred["risk"], regime_score
        )

        meta = _SYMBOL_META.get(symbol, {})
        exchange = "BSE" if symbol.upper().endswith(".BO") else meta.get("exchange", "NSE")
        sector = meta.get("sector", "—")

        trade_type = "INTRADAY (MIS)" if hold_mins <= 15 else "SHORT-TERM (CNC)"

        quantity = max(1, math.floor(investment / entry_price))
        actual_investment = round(quantity * entry_price, 2)
        min_qty_investment = round(entry_price, 2)

        atr_pct = _estimate_atr_pct(df)
        sl_pct = round(atr_pct * 1.5 * 100, 2)
        tp_pct = round(atr_pct * 3.0 * 100, 2)

        if action == "BUY":
            stop_loss_price = round(entry_price * (1 - sl_pct / 100), 2)
            take_profit_price = round(entry_price * (1 + tp_pct / 100), 2)
        else:
            stop_loss_price = round(entry_price * (1 + sl_pct / 100), 2)
            take_profit_price = round(entry_price * (1 - tp_pct / 100), 2)

        max_loss_per_share = round(abs(entry_price - stop_loss_price), 2)
        max_gain_per_share = round(abs(take_profit_price - entry_price), 2)
        max_loss_total = round(max_loss_per_share * quantity, 2)
        max_gain_total = round(max_gain_per_share * quantity, 2)
        rr_ratio = round(max_gain_total / max_loss_total, 2) if max_loss_total > 0 else 0

        charges = _compute_charges(actual_investment, trade_type)
        net_profit = round(max_gain_total - charges["total_charges"], 2)

        margin_required = round(actual_investment * 0.2, 2) if "INTRADAY" in trade_type else actual_investment

        broker_symbol = f"{symbol.replace('.NS','').replace('.BO','')} (NSE)" if exchange == "NSE" \
            else f"{symbol.replace('.NS','').replace('.BO','')} (BSE)"

        return {
            "symbol": symbol.replace(".NS", "").replace(".BO", ""),
            "broker_symbol": broker_symbol,
            "exchange": exchange,
            "sector": sector,
            "trade_type": trade_type,
            "order_type": "LIMIT",
            "action": action,
            "confidence": confidence,
            "entry_price": entry_price,
            "quantity": quantity,
            "actual_investment": actual_investment,
            "min_investment_1_share": min_qty_investment,
            "stop_loss_price": stop_loss_price,
            "take_profit_price": take_profit_price,
            "sl_pct": sl_pct,
            "tp_pct": tp_pct,
            "max_loss_total": max_loss_total,
            "max_gain_total": max_gain_total,
            "risk_reward_ratio": rr_ratio,
            "charges": charges,
            "net_profit_after_charges": net_profit,
            "margin_required": margin_required,
            "expected_profit_percent": pred["expected_profit_percent"],
            "expected_profit_amount": max_gain_total,
            "suggested_hold_time_minutes": hold_mins,
            "risk": pred["risk"],
            "market_regime": regime_info["regime"],
            "regime_score": regime_score,
            "opportunity_score": opp_score,
            "investment_amount": investment,
        }
    except Exception as e:
        logger.warning(f"Scan error {symbol}: {e}")
        return None


def scan_universe(investment: float, top_n: int = 5) -> List[Dict[str, Any]]:
    symbols = NSE_UNIVERSE[:20]
    results = []

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(scan_opportunity, sym, investment): sym for sym in symbols}
        for future in as_completed(futures, timeout=60):
            try:
                result = future.result()
                if result:
                    results.append(result)
            except Exception as e:
                logger.warning(f"Future error: {e}")

    results.sort(key=lambda x: x["opportunity_score"], reverse=True)
    return results[:top_n]
