from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.db_models import BacktestResult
from app.services.backtester import run_backtest

router = APIRouter()


class BacktestRequest(BaseModel):
    symbol: str = "RELIANCE"
    start_date: str = "2023-01-01"
    end_date: str = "2024-01-01"
    strategy: str = "ml_ensemble"
    initial_capital: float = 100000.0
    position_size: float = 0.1
    stop_loss_pct: float = 0.02
    take_profit_pct: float = 0.04


@router.post("/run")
def run(req: BacktestRequest, db: Session = Depends(get_db)):
    result = run_backtest(
        symbol=req.symbol,
        start_date=req.start_date,
        end_date=req.end_date,
        strategy=req.strategy,
        initial_capital=req.initial_capital,
        position_size=req.position_size,
        stop_loss_pct=req.stop_loss_pct,
        take_profit_pct=req.take_profit_pct,
    )

    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])

    db_result = BacktestResult(
        strategy_name=result["strategy_name"],
        symbol=result["symbol"],
        start_date=result["start_date"],
        end_date=result["end_date"],
        initial_capital=result["initial_capital"],
        final_value=result["final_value"],
        total_return_percent=result["total_return_percent"],
        total_trades=result["total_trades"],
        winning_trades=result["winning_trades"],
        losing_trades=result["losing_trades"],
        win_rate=result["win_rate"],
        sharpe_ratio=result["sharpe_ratio"],
        max_drawdown=result["max_drawdown"],
        profit_factor=result["profit_factor"] if result["profit_factor"] != float("inf") else 999,
        avg_trade_return=result["avg_trade_return"],
        trades=result["trades"],
        equity_curve=result["equity_curve"][:200],
        parameters=result["parameters"],
    )
    db.add(db_result)
    db.commit()
    db.refresh(db_result)

    result["id"] = db_result.id
    return result


@router.get("/history")
def history(db: Session = Depends(get_db), limit: int = 20):
    results = db.query(BacktestResult).order_by(BacktestResult.created_at.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "strategy_name": r.strategy_name,
            "symbol": r.symbol,
            "start_date": r.start_date,
            "end_date": r.end_date,
            "total_return_percent": r.total_return_percent,
            "win_rate": r.win_rate,
            "sharpe_ratio": r.sharpe_ratio,
            "max_drawdown": r.max_drawdown,
            "total_trades": r.total_trades,
            "created_at": str(r.created_at),
        }
        for r in results
    ]


@router.get("/{result_id}")
def get_result(result_id: int, db: Session = Depends(get_db)):
    r = db.query(BacktestResult).filter(BacktestResult.id == result_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Backtest result not found")
    return {
        "id": r.id,
        "strategy_name": r.strategy_name,
        "symbol": r.symbol,
        "start_date": r.start_date,
        "end_date": r.end_date,
        "initial_capital": r.initial_capital,
        "final_value": r.final_value,
        "total_return_percent": r.total_return_percent,
        "total_trades": r.total_trades,
        "winning_trades": r.winning_trades,
        "losing_trades": r.losing_trades,
        "win_rate": r.win_rate,
        "sharpe_ratio": r.sharpe_ratio,
        "max_drawdown": r.max_drawdown,
        "profit_factor": r.profit_factor,
        "avg_trade_return": r.avg_trade_return,
        "trades": r.trades,
        "equity_curve": r.equity_curve,
        "parameters": r.parameters,
        "created_at": str(r.created_at),
    }
