from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import math, random, logging
from typing import List, Dict, Any

from app.services.opportunity_scanner import scan_universe

logger = logging.getLogger(__name__)
router = APIRouter()


class SimRequest(BaseModel):
    num_trades: int = 5
    amount_per_trade: float = 10000.0
    seed: int = None


def _simulate_price_path(entry: float, action: str, sl: float, tp: float,
                          atr_pct: float, steps: int, confidence: float, rng: random.Random) -> tuple:
    """Monte Carlo price walk biased by model confidence. Returns (exit_price, outcome)."""
    price = entry
    per_step_vol = atr_pct / math.sqrt(max(steps, 1))
    drift = (confidence / 100 - 0.5) * per_step_vol * (1 if action == "BUY" else -1)

    for _ in range(steps):
        price *= (1 + drift + rng.gauss(0, per_step_vol))

        if action == "BUY":
            if price <= sl:
                return round(sl, 2), "LOSS"
            if price >= tp:
                return round(tp, 2), "WIN"
        else:
            if price >= sl:
                return round(sl, 2), "LOSS"
            if price <= tp:
                return round(tp, 2), "WIN"

    outcome = "WIN" if (action == "BUY" and price > entry) or (action == "SELL" and price < entry) else "LOSS"
    return round(price, 2), outcome


@router.post("/run")
def run_simulation(req: SimRequest):
    if req.num_trades < 1 or req.num_trades > 20:
        raise HTTPException(status_code=400, detail="num_trades must be 1–20")
    if req.amount_per_trade < 100:
        raise HTTPException(status_code=400, detail="amount_per_trade minimum ₹100")

    rng = random.Random(req.seed if req.seed is not None else random.randint(0, 9999))

    try:
        opportunities = scan_universe(req.amount_per_trade, top_n=req.num_trades)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scanner error: {e}")

    if not opportunities:
        raise HTTPException(status_code=404, detail="No opportunities found. Try again during market hours.")

    trades: List[Dict[str, Any]] = []
    capital_curve = [req.amount_per_trade * req.num_trades]
    running_capital = capital_curve[0]

    for opp in opportunities:
        entry = opp["entry_price"]
        action = opp["action"]
        sl = opp["stop_loss_price"]
        tp = opp["take_profit_price"]
        qty = opp["quantity"]
        atr_pct = (abs(tp - entry) / entry) / 3.0
        steps = opp["suggested_hold_time_minutes"]
        confidence = opp["confidence"]
        charges = opp.get("charges", {}).get("total_charges", 0)

        exit_price, outcome = _simulate_price_path(entry, action, sl, tp, atr_pct, steps, confidence, rng)

        if action == "BUY":
            raw_pnl = (exit_price - entry) * qty
        else:
            raw_pnl = (entry - exit_price) * qty

        net_pnl = round(raw_pnl - charges, 2)
        pnl_pct = round(net_pnl / opp["actual_investment"] * 100, 2) if opp["actual_investment"] else 0
        running_capital = round(running_capital + net_pnl, 2)
        capital_curve.append(running_capital)

        trades.append({
            "symbol": opp["symbol"],
            "exchange": opp["exchange"],
            "trade_type": opp["trade_type"],
            "action": action,
            "confidence": confidence,
            "entry_price": entry,
            "exit_price": exit_price,
            "quantity": qty,
            "investment": opp["actual_investment"],
            "stop_loss": sl,
            "take_profit": tp,
            "charges": charges,
            "net_pnl": net_pnl,
            "pnl_pct": pnl_pct,
            "outcome": outcome,
            "hold_minutes": steps,
            "risk": opp["risk"],
            "risk_reward": opp["risk_reward_ratio"],
            "opportunity_score": opp["opportunity_score"],
        })

    winners = [t for t in trades if t["outcome"] == "WIN"]
    losers = [t for t in trades if t["outcome"] == "LOSS"]
    total_invested = sum(t["investment"] for t in trades)
    total_pnl = round(sum(t["net_pnl"] for t in trades), 2)
    win_rate = round(len(winners) / len(trades) * 100, 2) if trades else 0
    avg_win = round(sum(t["net_pnl"] for t in winners) / len(winners), 2) if winners else 0
    avg_loss = round(sum(t["net_pnl"] for t in losers) / len(losers), 2) if losers else 0
    profit_factor = round(abs(avg_win * len(winners)) / max(abs(avg_loss * len(losers)), 0.01), 2)
    avg_confidence = round(sum(t["confidence"] for t in trades) / len(trades), 1) if trades else 0
    expected_win_rate = round(avg_confidence, 1)
    calibration_delta = round(win_rate - expected_win_rate, 1)

    if calibration_delta > 10:
        model_feedback = "Model is under-confident — real win rate beats predictions. Consider lowering thresholds."
        calibration_status = "UNDER_CONFIDENT"
    elif calibration_delta < -10:
        model_feedback = "Model is over-confident — real win rate below predictions. Consider retraining."
        calibration_status = "OVER_CONFIDENT"
    else:
        model_feedback = "Model is well-calibrated — confidence aligns with actual win rate."
        calibration_status = "CALIBRATED"

    return {
        "summary": {
            "total_trades": len(trades),
            "winners": len(winners),
            "losers": len(losers),
            "win_rate": win_rate,
            "total_invested": round(total_invested, 2),
            "total_pnl": total_pnl,
            "total_pnl_pct": round(total_pnl / total_invested * 100, 2) if total_invested else 0,
            "avg_win": avg_win,
            "avg_loss": avg_loss,
            "profit_factor": profit_factor,
            "starting_capital": capital_curve[0],
            "ending_capital": capital_curve[-1],
            "avg_confidence": avg_confidence,
            "expected_win_rate": expected_win_rate,
            "calibration_delta": calibration_delta,
            "calibration_status": calibration_status,
            "model_feedback": model_feedback,
        },
        "trades": trades,
        "capital_curve": capital_curve,
    }
