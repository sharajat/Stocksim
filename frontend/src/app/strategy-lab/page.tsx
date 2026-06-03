'use client'
import { useState } from 'react'
import { signalsApi, predictionsApi, stocksApi } from '@/lib/api'
import { FlaskConical, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

const STRATEGIES = [
  { id: 'rsi_reversal', name: 'RSI Reversal', desc: 'Buy oversold (RSI<30), sell overbought (RSI>70)', indicators: ['RSI'] },
  { id: 'macd_cross', name: 'MACD Crossover', desc: 'Trade MACD signal line crossovers', indicators: ['MACD'] },
  { id: 'bb_squeeze', name: 'Bollinger Band Squeeze', desc: 'Trade breakouts from low-volatility squeezes', indicators: ['BB'] },
  { id: 'momentum', name: 'Momentum (ADX)', desc: 'Trade strong trending markets (ADX>25)', indicators: ['ADX', 'MACD'] },
  { id: 'ml_ensemble', name: 'ML Ensemble', desc: 'XGBoost + LightGBM + Random Forest combined prediction', indicators: ['XGB', 'LGB', 'RF'] },
]

const SigBadge = ({ s }: { s: string }) => {
  const map: Record<string, string> = { STRONG_BUY: 'badge-buy', BUY: 'bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full', SELL: 'bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full', STRONG_SELL: 'badge-sell', HOLD: 'badge-hold', NEUTRAL: 'badge-hold' }
  return <span className={map[s] || 'badge-hold'}>{s?.replace('_', ' ')}</span>
}

export default function StrategyLabPage() {
  const [symbol, setSymbol] = useState('RELIANCE')
  const [investment, setInvestment] = useState(50000)
  const [selectedStrategy, setSelectedStrategy] = useState(STRATEGIES[4])
  const [signals, setSignals] = useState<any>(null)
  const [prediction, setPrediction] = useState<any>(null)
  const [stockInfo, setStockInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const analyze = async () => {
    setLoading(true); setError(''); setSignals(null); setPrediction(null)
    try {
      const [sigRes, infoRes] = await Promise.all([
        signalsApi.getSignals(symbol),
        stocksApi.getInfo(symbol),
      ])
      setSignals(sigRes.data)
      setStockInfo(infoRes.data)
      if (selectedStrategy.id === 'ml_ensemble') {
        const predRes = await predictionsApi.predict(symbol, investment)
        setPrediction(predRes.data)
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Analysis failed')
    } finally { setLoading(false) }
  }

  const strategySignal = signals ? (() => {
    const s = signals.signals || {}
    switch (selectedStrategy.id) {
      case 'rsi_reversal': return s.rsi_signal
      case 'macd_cross': return s.macd_signal
      case 'bb_squeeze': return s.bb_signal
      case 'momentum': return s.adx_signal
      case 'ml_ensemble': return prediction?.action ? `${prediction.action} (${prediction.confidence?.toFixed(1)}%)` : null
      default: return s.overall_signal
    }
  })() : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Strategy Lab</h1>
        <p className="text-slate-400 text-sm mt-1">Test and visualize trading strategies on any NSE stock</p>
      </div>

      {/* Strategy Picker */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {STRATEGIES.map(s => (
          <button key={s.id} onClick={() => setSelectedStrategy(s)}
            className={`card text-left p-3 transition-all ${selectedStrategy.id === s.id ? 'border-accent-blue ring-1 ring-accent-blue/40' : 'card-hover'}`}>
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical size={14} className={selectedStrategy.id === s.id ? 'text-accent-blue' : 'text-slate-500'} />
              <div className={`text-xs font-semibold ${selectedStrategy.id === s.id ? 'text-accent-blue' : 'text-slate-300'}`}>{s.name}</div>
            </div>
            <div className="text-xs text-slate-500">{s.desc}</div>
            <div className="flex gap-1 flex-wrap mt-2">
              {s.indicators.map(i => (
                <span key={i} className="text-xs bg-dark-700 text-slate-500 px-1.5 py-0.5 rounded">{i}</span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Control Bar */}
      <div className="card flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-1">Symbol</label>
          <input className="input-field" value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && analyze()} />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-1">Investment (₹)</label>
          <input type="number" className="input-field" value={investment}
            onChange={e => setInvestment(Number(e.target.value))} />
        </div>
        <button onClick={analyze} disabled={loading} className="btn-primary">
          {loading ? 'Analyzing...' : 'Run Strategy'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          <AlertTriangle size={16} />{error}
        </div>
      )}

      {signals && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Strategy Output */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <FlaskConical size={16} className="text-accent-blue" />
              Strategy: {selectedStrategy.name}
            </h3>
            <div className="text-center py-6 border border-dark-600 rounded-lg mb-4">
              <div className="text-xs text-slate-500 mb-2">Signal</div>
              <div className="text-2xl font-bold text-white">
                {strategySignal || '—'}
              </div>
            </div>
            {prediction && (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Confidence</span>
                  <span className={`font-bold ${prediction.confidence > 70 ? 'text-green-400' : 'text-yellow-400'}`}>{prediction.confidence?.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Price</span>
                  <span className="text-white">₹{prediction.target_price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stop Loss</span>
                  <span className="text-red-400">₹{prediction.stop_loss}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hold Time</span>
                  <span className="text-white">{prediction.suggested_hold_time_minutes} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Risk</span>
                  <span className={`font-semibold ${prediction.risk === 'LOW' ? 'text-green-400' : prediction.risk === 'HIGH' ? 'text-red-400' : 'text-yellow-400'}`}>{prediction.risk}</span>
                </div>
                {prediction.expected_profit_amount != null && (
                  <div className="flex justify-between border-t border-dark-600 pt-2">
                    <span className="text-slate-400">Expected Profit</span>
                    <span className="text-green-400 font-bold">₹{prediction.expected_profit_amount?.toFixed(0)}</span>
                  </div>
                )}
              </div>
            )}
            {stockInfo && (
              <div className="mt-4 space-y-2 text-xs border-t border-dark-600 pt-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Price</span>
                  <span className="text-white font-bold">₹{stockInfo.current_price?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Change</span>
                  <span className={stockInfo.change_percent >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {stockInfo.change_percent >= 0 ? '+' : ''}{stockInfo.change_percent?.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Technical Signals Grid */}
          <div className="lg:col-span-2 card">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-accent-blue" />
              All Technical Signals — {symbol}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Overall', key: 'overall_signal' },
                { label: 'RSI', key: 'rsi_signal' },
                { label: 'MACD', key: 'macd_signal' },
                { label: 'Bollinger Bands', key: 'bb_signal' },
                { label: 'Stochastic', key: 'stoch_signal' },
                { label: 'ADX Trend', key: 'adx_signal' },
                { label: 'CCI', key: 'cci_signal' },
                { label: 'Volume', key: 'volume_signal' },
                { label: 'OBV', key: 'obv_signal' },
                { label: 'CMF', key: 'cmf_signal' },
              ].map(({ label, key }) => (
                <div key={key} className={`bg-dark-700 rounded-lg p-3 flex items-center justify-between ${selectedStrategy.indicators.some(i => key.toUpperCase().includes(i)) ? 'ring-1 ring-accent-blue/40' : ''}`}>
                  <div className="text-xs text-slate-400">{label}</div>
                  <SigBadge s={signals.signals?.[key]} />
                </div>
              ))}
            </div>

            {/* Signal Values */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: 'RSI', value: signals.values?.rsi?.toFixed(1) },
                { label: 'MACD', value: signals.values?.macd?.toFixed(4) },
                { label: 'ATR', value: signals.values?.atr?.toFixed(2) },
                { label: 'ADX', value: signals.values?.adx?.toFixed(1) },
                { label: 'OBV', value: signals.values?.obv?.toFixed(0) },
                { label: 'CMF', value: signals.values?.cmf?.toFixed(3) },
              ].map(({ label, value }) => (
                <div key={label} className="text-center bg-dark-700 rounded p-2">
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="text-sm text-white font-mono mt-0.5">{value ?? '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!signals && !loading && (
        <div className="card text-center py-16">
          <FlaskConical size={48} className="mx-auto mb-4 text-slate-600" />
          <div className="text-slate-400 text-sm">Select a strategy, enter a symbol and click Run Strategy</div>
        </div>
      )}
    </div>
  )
}
