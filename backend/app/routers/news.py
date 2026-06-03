from fastapi import APIRouter, Query
from typing import Optional
from app.services.news_intelligence import fetch_news, get_aggregate_sentiment

router = APIRouter()


@router.get("/")
def get_news(symbol: Optional[str] = Query(None), limit: int = Query(20, le=50)):
    articles = fetch_news(symbol=symbol, limit=limit)
    return {"articles": articles, "count": len(articles)}


@router.get("/sentiment/{symbol}")
def get_sentiment(symbol: str):
    return get_aggregate_sentiment(symbol)


@router.get("/market")
def market_news(limit: int = Query(15, le=30)):
    articles = fetch_news(limit=limit)
    return {"articles": articles, "count": len(articles)}
