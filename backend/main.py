from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.exc import IntegrityError, OperationalError

from app.database import engine, Base
from app.routers import stocks, features, news, signals, predictions, backtest, papertrade, ml_models, reports, auth, simulation


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine, checkfirst=True)
    except (IntegrityError, OperationalError):
        pass
    yield


app = FastAPI(
    title="Quant AI Trader API",
    description="AI-Powered Intraday Quantitative Trading Research & Simulation Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(stocks.router, prefix="/api/stocks", tags=["stocks"])
app.include_router(features.router, prefix="/api/features", tags=["features"])
app.include_router(news.router, prefix="/api/news", tags=["news"])
app.include_router(signals.router, prefix="/api/signals", tags=["signals"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["predictions"])
app.include_router(backtest.router, prefix="/api/backtest", tags=["backtest"])
app.include_router(papertrade.router, prefix="/api/papertrade", tags=["papertrade"])
app.include_router(ml_models.router, prefix="/api/models", tags=["models"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(simulation.router, prefix="/api/simulation", tags=["simulation"])


@app.get("/")
def root():
    return {"status": "ok", "service": "Quant AI Trader API", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}
