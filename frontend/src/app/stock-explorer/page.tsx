'use client'
import { useState } from 'react'
import { stocksApi, signalsApi, predictionsApi, newsApi } from '@/lib/api'
import { Search, TrendingUp, TrendingDown, Activity, Clock, AlertCircle } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts'

const ActionBadge = ({ a }: { a: string }) => (
  <span className={a === 'BUY' ? 'badge-buy' : a === 'SELL' ? 'badge-sell' : 'badge-hold'}>{a}</span>
)

const SignalDot = ({ s }: { s: string }) => {
  const color = ['BUY', 'BULLISH', 'HIGH', 'STRONG BUY', 'STRONG_TREND'].includes(s)
    ? 'bg-green-400' : ['SELL', 'BEARISH', 'STRONG SELL'].includes(s) ? 'bg-red-400' : 'bg-yellow-400'
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
}

export default function StockExplorerPage() {
  const [symbol, setSymbol] = useState('RELIANCE')
  const [investment, setInvestment] = useState(50000)
  const [info, setInfo] = useState<any>(null)
  const [ohlcv, setOhlcv] = useState<any[]>([])
  const [signals, setSignals] = useState<any>(null)
  const [prediction, setPrediction] = useState<any>(null)
  const [news, setNews] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [predLoading, setPredLoading] = useState(false)
  const [error, setError] = useState('')

  const search = async () => {
    setLoading(true)
    setError('')
    setPrediction(null)
    try {
      const [infoRes, ohlcvRes, sigRes, newsRes] = await Promise.all([
        stocksApi.getInfo(symbol),
        stocksApi.getOHLCV(symbol, '90d', '1d'),
        signalsApi.getSignals(symbol),
        newsApi.getNews(symbol),
      ])
      setInfo(infoRes.data)
      setOhlcv(ohlcvRes.data || [])
      setSignals(sigRes.data)
      setNews(newsRes.data?.articles?.slice(0, 5) || [])
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load stock data')
    } finally {
      setLoading(false)
    }
  }

  const getPrediction = async () => {
    setPredLoading(true)
    try {
      const res = await predictionsApi.predict(symbol, investment)
      setPrediction(res.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Prediction failed')
    } finally {
      setPredLoading(false)
    }
  }

  const chartData = ohlcv.slice(-60).map((d: any) => ({
    date: (d.date || d.Datetime || '').split('T')[0].split(' ')[0],
    close: parseFloat(d.close?.toFixed(2)),
    volume: d.volume,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Stock Explorer</h1>
        <p className="text-slate-400 text-sm mt-1">Analyze any stock with AI-powered signals and predictions</p>
      </div>

      {/* Search bar */}
      <div className="card flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input-field pl-9"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Symbol (e.g. RELIANCE, TCS, HDFCBANK)"
          />
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
            <input
              type="number"
              className="input-field pl-7 w-40"
              value={investment}
              onChange={e => setInvestment(Number(e.target.value))}
              placeholder="Investment"
            />
          </div>
          <button onClick={search} disabled={loading} className="btn-primary whitespace-nowrap">
            {loading ? 'Loading...' : 'Analyze'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {info && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info card */}
          <div className="card space-y-3">
            <div>
              <div className="text-xs text-slate-500">{info.exchange} · {info.sector}</div>
              <div className="text-lg font-bold text-white">{info.name || info.symbol}</div>
              <div className="font-mono text-slate-400 text-sm">{info.symbol}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ['Price', `₹${info.current_price?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '—'}`],
                ['Prev Close', `₹${info.previous_close?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '—'}`],
                ['Day High', `₹${info.day_high?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '—'}`],
                ['Day Low', `₹${info.day_low?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '—'}`],
                ['P/E Ratio', info.pe_ratio?.toFixed(2) || '—'],
                ['Beta', info.beta?.toFixed(2) || '—'],
                ['52W High', `₹${info['52w_high']?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '—'}`],
                ['52W Low', `₹${info['52w_low']?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '—'}`],
              ].map(([label, value]) => (
                <div key={label} className="bg-dark-700 rounded p-2">
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="text-white font-semibold text-sm">{value}</div>
                </div>
              ))}
            </div>
            <button
              onClick={getPrediction}
              disabled={predLoading}
              className="w-full btn-success"
            >
              {predLoading ? 'Predicting...' : '⚡ Get AI Prediction'}
            </button>
          </div>

          {/* Chart */}
          <div className="card lg:col-span-2">
            <h3 className="text-sm font-semibold text-white mb-4">Price History (90D)</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ background: '#0f1629', border: '1px solid #1a2540', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#4c9eff' }}
                  />
                  <Line type="monotone" dataKey="close" stroke="#4c9eff" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-slate-500 text-sm">
                Search a stock to view chart
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prediction result */}
      {prediction && (
        <div className="card border-accent-blue/40">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={16} className="text-accent-blue" /> AI Prediction Result
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-dark-700 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500 mb-1">Action</div>
              <ActionBadge a={prediction.action} />
            </div>
            <div className="bg-dark-700 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500 mb-1">Confidence</div>
              <div className={`text-lg font-bold ${prediction.confidence > 70 ? 'text-green-400' : prediction.confidence > 55 ? 'text-yellow-400' : 'text-red-400'}`}>
                {prediction.confidence}%
              </div>
            </div>
            <div className="bg-dark-700 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500 mb-1">Expected Profit</div>
              <div className="text-green-400 font-bold">₹{prediction.expected_profit_amount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <div className="text-xs text-slate-400">{prediction.expected_profit_percent}%</div>
            </div>
            <div className="bg-dark-700 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500 mb-1">Hold Time</div>
              <div className="text-white font-bold flex items-center justify-center gap-1">
                <Clock size={12} /> {prediction.suggested_hold_time_minutes} min
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="flex justify-between bg-dark-700 rounded px-3 py-2">
              <span className="text-slate-400">Risk</span>
              <span className={prediction.risk === 'LOW' ? 'text-green-400' : prediction.risk === 'HIGH' ? 'text-red-400' : 'text-yellow-400'}>{prediction.risk}</span>
            </div>
            <div className="flex justify-between bg-dark-700 rounded px-3 py-2">
              <span className="text-slate-400">Regime</span>
              <span className="text-white">{prediction.market_regime}</span>
            </div>
            <div className="flex justify-between bg-dark-700 rounded px-3 py-2">
              <span className="text-slate-400">News</span>
              <span className={prediction.news_overall === 'POSITIVE' ? 'text-green-400' : prediction.news_overall === 'NEGATIVE' ? 'text-red-400' : 'text-slate-400'}>
                {prediction.news_overall}
              </span>
            </div>
          </div>
          {prediction.note && (
            <div className="mt-3 text-xs text-yellow-400 bg-yellow-500/10 rounded px-3 py-2">{prediction.note}</div>
          )}
        </div>
      )}

      {/* Technical Signals */}
      {signals && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Technical Signals</h3>
            <span className={`text-xs font-bold px-2 py-1 rounded ${
              signals.overall_signal.includes('BUY') ? 'bg-green-500/20 text-green-400' :
              signals.overall_signal.includes('SELL') ? 'bg-red-500/20 text-red-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>{signals.overall_signal}</span>
          </div>
          <div className="flex gap-4 mb-4 text-xs">
            <span className="text-green-400">▲ {signals.buy_signals} Buy</span>
            <span className="text-red-400">▼ {signals.sell_signals} Sell</span>
            <span className="text-slate-400">— {signals.neutral_signals} Neutral</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(signals.signals || {}).map(([name, sig]: [string, any]) => (
              <div key={name} className="flex items-center justify-between bg-dark-700 rounded px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <SignalDot s={sig.signal} />
                  <span className="text-slate-300">{name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">{sig.value?.toFixed ? sig.value.toFixed(2) : sig.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* News */}
      {news.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Latest News</h3>
          <div className="space-y-3">
            {news.map((n: any, i: number) => (
              <div key={i} className="flex items-start gap-3 bg-dark-700 rounded-lg p-3">
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.sentiment === 'POSITIVE' ? 'bg-green-400' : n.sentiment === 'NEGATIVE' ? 'bg-red-400' : 'bg-slate-400'}`} />
                <div>
                  <div className="text-sm text-slate-200">{n.title}</div>
                  <div className="text-xs text-slate-500 mt-1">{n.source}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
