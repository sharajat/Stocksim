# QUANT_AI_TRADER_PRD.md

# AI-Powered Intraday Quantitative Trading Research & Simulation Platform

## Vision
Build a production-grade, end-to-end AI-powered intraday stock research, prediction, simulation, backtesting, paper-trading, and self-learning platform.

Primary question:
"Given ₹X right now, what is the highest-probability trade over the next 1–10 minutes?"

## Core User Flow

### Option A
User enters:
- Stock Symbol
- Investment Amount

System outputs:
- BUY / SELL / HOLD
- Confidence %
- Expected Profit ₹
- Expected Return %
- Risk Level
- Suggested Hold Time (1–10 mins)

### Option B
User enters:
- Investment Amount

System scans universe and returns:
- Top 3 opportunities ranked by Opportunity Score

## Opportunity Score
Opportunity Score =
Confidence × Expected Profit × Risk Adjustment × Market Regime Score

## Simulate Trade
After prediction:
- User clicks "Simulate Trade"
- System records entry
- Waits predicted holding period
- Verifies actual outcome
- Stores prediction vs reality
- Uses result for future retraining

## Technology Stack
Backend:
- Python
- FastAPI
- SQLAlchemy
- Celery
- Redis

Database:
- PostgreSQL
- TimescaleDB

ML:
- Scikit-Learn
- XGBoost
- LightGBM
- CatBoost
- PyTorch

LLM:
- Ollama
- llama.cpp

Frontend:
- Next.js
- TypeScript
- Tailwind

Monitoring:
- Prometheus
- Grafana

Deployment:
- Docker Compose

## Data Sources
Free/Open Sources only:
- Yahoo Finance
- NSE public endpoints
- RSS news feeds
- Economic data APIs

## Feature Engineering
Generate 300+ features:
- Trend
- Momentum
- Volatility
- Volume
- Price Action
- Correlation
- Market Breadth
- Multi-Timeframe Features

Timeframes:
- 1m
- 5m
- 10m
- 15m
- 30m
- 1h
- 4h
- 1d

## Market Regime Engine
Detect:
- Bull
- Bear
- Sideways
- High Volatility
- Low Volatility
- Risk-On
- Risk-Off

## ML Models
Baseline:
- Logistic Regression

Tree Models:
- Random Forest
- XGBoost
- LightGBM
- CatBoost

Deep Learning:
- LSTM
- GRU
- Transformers

Ensemble:
- Voting
- Blending
- Stacking

## Prediction Output
{
  "symbol": "RELIANCE",
  "action": "BUY",
  "confidence": 82,
  "expected_profit_percent": 1.4,
  "expected_profit_amount": 700,
  "suggested_hold_time_minutes": 8,
  "risk": "LOW"
}

## Explainability
Provide:
- SHAP
- Feature Importance
- Confidence Explanation
- AI-generated reasoning

## News Intelligence
Use local LLM for:
- Sentiment
- Bullish Score
- Bearish Score
- Summary
- Event Extraction

## Prediction Audit System
Store:
- Prediction
- Confidence
- Features
- Outcome
- Actual Profit/Loss

Track:
- Accuracy
- Precision
- Recall
- Sharpe Ratio
- Win Rate
- Profit Factor

## Self-Learning Loop
Daily:
1. Validate predictions
2. Rank features
3. Rank models
4. Detect drift
5. Retrain when beneficial

## Dashboard Pages
- Dashboard
- Stock Explorer
- Opportunity Scanner
- Strategy Lab
- Backtesting
- Paper Trading
- Prediction Audit
- Feature Importance
- Model Center
- AI Research Center

## APIs
/api/stocks
/api/features
/api/news
/api/signals
/api/predictions
/api/backtest
/api/papertrade
/api/models
/api/reports

## Authentication
- JWT
- RBAC
- Admin/User

## Monitoring
- API Health
- Data Health
- Model Health
- Prediction Latency

## Testing
- Unit Tests
- Integration Tests
- Backtest Validation

Minimum Coverage:
80%

## Docker Requirement
Application must start with:

docker compose up

## Out of Scope
Do NOT implement:
- Bloomberg
- Refinitiv
- FactSet
- Historical institutional order books
- Paid alternative datasets
- Exchange co-location
- HFT infrastructure
- Proprietary paid LLMs

## Success Criteria
Platform must:
1. Collect market data
2. Generate signals
3. Train models
4. Produce predictions
5. Simulate trades
6. Verify outcomes
7. Learn from outcomes
8. Rank opportunities
9. Explain decisions
10. Operate using free/open-source tooling
