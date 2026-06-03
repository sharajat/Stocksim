from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class ActionEnum(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"


class RiskEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class User(Base):
    __tablename__ = "stocksim_users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    paper_trades = relationship("PaperTrade", back_populates="user")
    predictions = relationship("Prediction", back_populates="user")


class Prediction(Base):
    __tablename__ = "stocksim_predictions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("stocksim_users.id"), nullable=True)
    symbol = Column(String, index=True, nullable=False)
    action = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    expected_profit_percent = Column(Float)
    expected_profit_amount = Column(Float)
    suggested_hold_time_minutes = Column(Integer)
    risk = Column(String)
    investment_amount = Column(Float)
    entry_price = Column(Float)
    features = Column(JSON)
    model_used = Column(String)
    market_regime = Column(String)
    shap_values = Column(JSON)
    news_sentiment = Column(Float)
    opportunity_score = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    outcome_price = Column(Float, nullable=True)
    actual_profit_percent = Column(Float, nullable=True)
    actual_profit_amount = Column(Float, nullable=True)
    outcome_verified = Column(Boolean, default=False)
    outcome_verified_at = Column(DateTime(timezone=True), nullable=True)
    user = relationship("User", back_populates="predictions")
    paper_trade = relationship("PaperTrade", back_populates="prediction", uselist=False)


class PaperTrade(Base):
    __tablename__ = "stocksim_paper_trades"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("stocksim_users.id"), nullable=True)
    prediction_id = Column(Integer, ForeignKey("stocksim_predictions.id"), nullable=True)
    symbol = Column(String, index=True, nullable=False)
    action = Column(String, nullable=False)
    entry_price = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False)
    investment_amount = Column(Float, nullable=False)
    stop_loss = Column(Float)
    take_profit = Column(Float)
    status = Column(String, default="OPEN")
    exit_price = Column(Float, nullable=True)
    pnl = Column(Float, nullable=True)
    pnl_percent = Column(Float, nullable=True)
    entry_time = Column(DateTime(timezone=True), server_default=func.now())
    exit_time = Column(DateTime(timezone=True), nullable=True)
    hold_minutes = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    user = relationship("User", back_populates="paper_trades")
    prediction = relationship("Prediction", back_populates="paper_trade")


class BacktestResult(Base):
    __tablename__ = "stocksim_backtest_results"
    id = Column(Integer, primary_key=True, index=True)
    strategy_name = Column(String, nullable=False)
    symbol = Column(String)
    start_date = Column(String)
    end_date = Column(String)
    initial_capital = Column(Float, default=100000)
    final_value = Column(Float)
    total_return_percent = Column(Float)
    total_trades = Column(Integer)
    winning_trades = Column(Integer)
    losing_trades = Column(Integer)
    win_rate = Column(Float)
    sharpe_ratio = Column(Float)
    max_drawdown = Column(Float)
    profit_factor = Column(Float)
    avg_trade_return = Column(Float)
    trades = Column(JSON)
    equity_curve = Column(JSON)
    parameters = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ModelPerformance(Base):
    __tablename__ = "stocksim_model_performance"
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String, nullable=False)
    symbol = Column(String)
    accuracy = Column(Float)
    precision = Column(Float)
    recall = Column(Float)
    f1_score = Column(Float)
    sharpe_ratio = Column(Float)
    win_rate = Column(Float)
    profit_factor = Column(Float)
    feature_importance = Column(JSON)
    trained_at = Column(DateTime(timezone=True), server_default=func.now())
    training_samples = Column(Integer)
    parameters = Column(JSON)
