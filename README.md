# Quant AI Trader

AI-Powered Intraday Quantitative Trading Research & Simulation Platform

A full-stack trading platform that uses machine learning to scan market opportunities, simulate trades, and provide actionable trading signals with real-world execution details.

## Features

- **Opportunity Scanner** — AI-driven market scanning with actionable trade details:
  - Exchange detection (NSE/BSE)
  - Trade type classification (Intraday/Short-term)
  - Quantity limits and investment amounts
  - Stop-loss and take-profit prices
  - Risk-reward ratios
  - Brokerage charges and margin requirements
  - Opportunity scoring and confidence levels

- **Trade Simulation** — Monte Carlo-based simulation engine:
  - User-configurable number of trades and investment per trade
  - Simulates price paths biased by model confidence
  - Tracks capital curve across trades
  - Evaluates model calibration (expected vs actual win rate)
  - Provides feedback on model over/under-confidence

- **Stock Explorer** — Real-time stock data with technical indicators
- **Paper Trading** — Virtual trading environment with P&L tracking
- **Backtesting** — Strategy testing on historical data
- **Prediction Audit** — Verify AI predictions against actual outcomes
- **Feature Importance** — Understand which factors drive predictions
- **Model Center** — Train and manage ML models
- **AI Research Center** — Advanced ML research tools

## Tech Stack

### Backend
- **FastAPI** — High-performance async API framework
- **PostgreSQL** — Persistent data storage
- **Redis** — Caching and task queue
- **Celery** — Async task processing
- **XGBoost / LightGBM / RandomForest** — ML ensemble models
- **yfinance** — Real-time market data (with Stooq fallback)
- **pandas-ta** — Technical analysis indicators

### Frontend
- **Next.js 14** — React framework with App Router
- **TypeScript** — Type-safe development
- **TailwindCSS** — Utility-first styling
- **Lucide React** — Icon library
- **Axios** — HTTP client

## Installation

### Prerequisites
- Docker and Docker Compose
- Git

### Quick Start

1. Clone the repository:
```bash
git clone https://github.com/sharajat/Stocksim.git
cd Stocksim
```

2. Start all services:
```bash
docker compose up -d
```

3. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Development Mode

The backend source code is volume-mounted, so changes to Python files are reflected immediately on restart:

```bash
docker compose restart backend celery_worker
```

For frontend changes, rebuild the frontend container:
```bash
docker compose up -d --build frontend
```

## Usage

### Opportunity Scanner

1. Navigate to **Opportunity Scanner** in the sidebar
2. Enter your investment amount (default: ₹10,000)
3. Click **Scan Opportunities**
4. Review the AI-detected trades with:
   - Entry price, quantity, and investment
   - Stop-loss and take-profit levels
   - Risk-reward ratio
   - Brokerage charges and margin
   - Click any card to expand for full execution details

### Trade Simulation

1. Navigate to **Trade Simulation**
2. Configure:
   - Number of trades (1–20)
   - Amount per trade (₹100+)
   - Optional random seed for reproducible results
3. Click **Run Simulation**
4. Review:
   - Capital curve visualization
   - Win rate, profit factor, total P&L
   - Model calibration status (CALIBRATED / OVER_CONFIDENT / UNDER_CONFIDENT)
   - Detailed trade log with entry/exit, charges, and outcomes

### Paper Trading

1. Navigate to **Paper Trading**
2. Open trades with BUY/SELL signals
3. Monitor positions in real-time
4. Close trades manually or let them hit SL/TP
5. Track portfolio performance over time

## API Documentation

Interactive API documentation available at http://localhost:8000/docs

### Key Endpoints

- `POST /api/simulation/run` — Run trade simulation
- `GET /api/reports/opportunities` — Get market opportunities
- `POST /api/papertrade/open` — Open paper trade
- `POST /api/papertrade/{id}/close` — Close paper trade
- `POST /api/predictions/predict` — Get AI prediction for a symbol
- `GET /api/signals/{symbol}` — Get technical analysis signals

## Project Structure

```
Stocksim/
├── backend/
│   ├── app/
│   │   ├── routers/          # API endpoints
│   │   ├── services/         # Business logic
│   │   │   ├── data_ingestion.py      # Market data fetching
│   │   │   ├── ml_engine.py            # ML model training/prediction
│   │   │   ├── opportunity_scanner.py  # Opportunity detection
│   │   │   └── ...
│   │   ├── models/           # Database models
│   │   └── tasks.py          # Celery tasks
│   ├── main.py               # FastAPI app entry
│   ├── requirements.txt      # Python dependencies
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js pages
│   │   │   ├── opportunity-scanner/
│   │   │   ├── simulation/
│   │   │   └── ...
│   │   ├── components/      # React components
│   │   └── lib/            # Utilities (API client)
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml       # Multi-container orchestration
```

## Data Sources

- **Primary**: Yahoo Finance (via yfinance)
- **Fallback**: Stooq (when Yahoo Finance is unavailable)
- **Mock Data**: Generated when both sources fail (ensures platform remains functional)

## Configuration

Environment variables are set in `docker-compose.yml`:

```yaml
DATABASE_URL: postgresql://quant:quantpass@postgres:5432/quantdb
REDIS_URL: redis://redis:6379/0
SECRET_KEY: supersecretjwtkey2024quant
```

For production, use a `.env` file with secure values.

## Troubleshooting

### Docker Hub timeout during build

Configure a Docker registry mirror:

```bash
sudo tee /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": ["https://mirror.gcr.io"]
}
EOF
sudo systemctl restart docker
```

### Yahoo Finance 429 errors

The platform automatically:
- Uses curl_cffi with Chrome TLS fingerprinting
- Falls back to Stooq as secondary data source
- Uses mock data as final fallback

### Backend returns 404 on new endpoints

Restart backend to pick up volume-mounted changes:

```bash
docker compose restart backend celery_worker
```

## License

MIT

## Disclaimer

This platform is for educational and research purposes only. Simulated trades and AI predictions do not guarantee real-world performance. Always conduct your own research and consult with a licensed financial advisor before making trading decisions.
