'use client'
import { useState } from 'react'
import { newsApi, stocksApi } from '@/lib/api'
import { BookOpen, Search, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const SentBar = ({ score, label }: { score: number; label: string }) => {
  const pct = Math.round(Math.max(0, Math.min(100, (score + 1) * 50)))
  const color = score > 0.1 ? '#4ade80' : score < -0.1 ? '#f87171' : '#94a3b8'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span style={{ color }} className="font-semibold">{score > 0 ? '+' : ''}{score?.toFixed(3)}</span>
      </div>
      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function AIResearchPage() {
  const [symbol, setSymbol] = useState('RELIANCE')
  const [news, setNews] = useState<any[]>([])
  const [sentiment, setSentiment] = useState<any>(null)
  const [marketNews, setMarketNews] = useState<any[]>([])
  const [regime, setRegime] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'stock' | 'market'>('stock')

  const loadStock = async () => {
    setLoading(true)
    try {
      const [nRes, sRes, rRes] = await Promise.all([
        newsApi.getNews(symbol),
        newsApi.getSentiment(symbol),
        stocksApi.getRegime(symbol),
      ])
      setNews(nRes.data?.articles || [])
      setSentiment(sRes.data)
      setRegime(rRes.data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const loadMarket = async () => {
    setLoading(true)
    try {
      const res = await newsApi.getMarketNews()
      setMarketNews(res.data?.articles || [])
    } catch {}
    setLoading(false)
  }

  const SentimentIcon = ({ s }: { s: string }) => {
    if (s === 'POSITIVE') return <TrendingUp size={14} className="text-green-400" />
    if (s === 'NEGATIVE') return <TrendingDown size={14} className="text-red-400" />
    return <Minus size={14} className="text-slate-400" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Research Center</h1>
        <p className="text-slate-400 text-sm mt-1">News intelligence, sentiment analysis, and market regime</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-3">
        {(['stock', 'market'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-accent-blue text-white' : 'bg-dark-700 text-slate-400 hover:text-white'}`}>
            {t === 'stock' ? 'Stock Intelligence' : 'Market Overview'}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <>
          <div className="card flex gap-3">
            <input className="input-field flex-1" value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && loadStock()}
              placeholder="Symbol (e.g. RELIANCE)" />
            <button onClick={loadStock} disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              Analyze
            </button>
          </div>

          {sentiment && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-4">Sentiment Analysis — {symbol}</h3>
                <div className="space-y-4">
                  <div className="text-center py-3">
                    <div className={`text-2xl font-bold ${sentiment.overall === 'POSITIVE' ? 'text-green-400' : sentiment.overall === 'NEGATIVE' ? 'text-red-400' : 'text-slate-400'}`}>
                      {sentiment.overall}
                    </div>
                    <div className="text-slate-500 text-xs mt-1">{sentiment.total_articles} articles analyzed</div>
                  </div>
                  <SentBar score={sentiment.avg_sentiment_score ?? 0} label="Avg Sentiment" />
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-dark-700 rounded p-2">
                      <div className="text-green-400 font-bold">{sentiment.positive_count ?? 0}</div>
                      <div className="text-slate-500">Positive</div>
                    </div>
                    <div className="bg-dark-700 rounded p-2">
                      <div className="text-slate-400 font-bold">{sentiment.neutral_count ?? 0}</div>
                      <div className="text-slate-500">Neutral</div>
                    </div>
                    <div className="bg-dark-700 rounded p-2">
                      <div className="text-red-400 font-bold">{sentiment.negative_count ?? 0}</div>
                      <div className="text-slate-500">Negative</div>
                    </div>
                  </div>
                </div>
              </div>

              {regime && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-white mb-4">Market Regime</h3>
                  <div className="space-y-3">
                    <div className="bg-dark-700 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-500 mb-1">Primary Trend</div>
                      <div className="text-white font-bold">{regime.trend}</div>
                    </div>
                    <div className="bg-dark-700 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-500 mb-1">Volatility</div>
                      <div className={`font-bold ${regime.volatility === 'HIGH' ? 'text-red-400' : 'text-green-400'}`}>{regime.volatility}</div>
                    </div>
                    <div className="bg-dark-700 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-500 mb-1">Risk Sentiment</div>
                      <div className="text-accent-blue font-bold">{regime.risk_sentiment}</div>
                    </div>
                    <div className="bg-dark-700 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">Regime Score</div>
                      <div className="h-2 bg-dark-600 rounded-full overflow-hidden mt-1">
                        <div className="h-full rounded-full bg-accent-blue"
                          style={{ width: `${((regime.regime_score ?? 0) + 1) * 50}%` }} />
                      </div>
                      <div className="text-xs text-slate-400 mt-1 text-right">{regime.regime_score?.toFixed(3)}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="card">
                <h3 className="text-sm font-semibold text-white mb-4">Latest News</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                  {news.length === 0 ? (
                    <div className="text-slate-500 text-sm text-center py-6">No news found</div>
                  ) : news.map((n: any, i: number) => (
                    <div key={i} className="bg-dark-700 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <SentimentIcon s={n.sentiment} />
                        <span className="text-xs text-slate-500">{n.source}</span>
                      </div>
                      <div className="text-xs text-slate-200 leading-relaxed">{n.title}</div>
                      {n.summary && <div className="text-xs text-slate-500 line-clamp-2">{n.summary}</div>}
                      <div className="text-xs text-slate-600">{n.published?.slice(0, 10)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'market' && (
        <div className="space-y-4">
          <button onClick={loadMarket} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh Market News
          </button>

          {marketNews.length === 0 && !loading && (
            <div className="card text-center py-12">
              <BookOpen size={48} className="mx-auto mb-4 text-slate-600" />
              <div className="text-slate-400 text-sm">Click Refresh to load market-wide news</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {marketNews.map((n: any, i: number) => (
              <div key={i} className="card card-hover">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${n.sentiment === 'POSITIVE' ? 'bg-green-400' : n.sentiment === 'NEGATIVE' ? 'bg-red-400' : 'bg-slate-400'}`} />
                  <span className="text-xs text-slate-500">{n.source} · {n.published?.slice(0, 10)}</span>
                  <span className={`ml-auto text-xs font-semibold ${n.sentiment === 'POSITIVE' ? 'text-green-400' : n.sentiment === 'NEGATIVE' ? 'text-red-400' : 'text-slate-400'}`}>
                    {n.sentiment}
                  </span>
                </div>
                <div className="text-sm text-slate-200">{n.title}</div>
                {n.summary && <div className="text-xs text-slate-500 mt-1 line-clamp-2">{n.summary}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
