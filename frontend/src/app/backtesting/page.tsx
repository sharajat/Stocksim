'use client'
import { useState, useEffect } from 'react'
import { backtestApi } from '@/lib/api'
import { BarChart2, Play, AlertCircle } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell
} from 'recharts'

const STRATEGIES = [
  { value: 'ml_ensemble', label: 'ML Ensemble (XGB+LGB+RF)' },
  { value: 'rsi_bb', label: 'RSI + Bollinger Bands' },
  { value: 'macd_ema', label: 'MACD + EMA Crossover' },
]

export default function BacktestingPage() {
  const [form, setForm] = useState({
    symbol: 'RELIANCE', start_date: '2023-01-01', end_date: '2024-01-01',
    strategy: 'ml_ensemble', initial_capital: 100000,
    position_size: 0.1, stop_loss_pct: 2, take_profit_pct: 4,
  })
  const [result, setResult] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    backtestApi.getHistory().then(r => setHistory(r.data || [])).catch(() => {})
  }, [])

  const run = async () => {
    setLoading(true); setError('')
    try {
      const res = await backtestApi.run(form)
      setResult(res.data)
      backtestApi.getHistory().then(r => setHistory(r.data || [])).catch(() => {})
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Backtest failed')
    } finally { setLoading(false) }
  }

  const equity = result?.equity_curve || []
  const metrics = result ? [
    { label: 'Total Return', value: `${result.total_return_percent}%`, positive: result.total_return_percent >= 0 },
    { label: 'Win Rate', value: `${result.win_rate}%`, positive: result.win_rate >= 50 },
    { label: 'Sharpe Ratio', value: result.sharpe_ratio, positive: result.sharpe_ratio >= 1 },
    { label: 'Max Drawdown', value: `${result.max_drawdown}%`, positive: false },
    { label: 'Total Trades', value: result.total_trades, positive: true },
    { label: 'Profit Factor', value: result.profit_factor === 999 ? '∞' : result.profit_factor, positive: result.profit_factor >= 1 },
  ] : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Backtesting</h1>
        <p className="text-slate-400 text-sm mt-1">Validate strategies on historical NSE data</p>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-4">Configure Backtest</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Symbol', key: 'symbol', type: 'text', placeholder: 'RELIANCE' },
            { label: 'Start Date', key: 'start_date', type: 'date' },
            { label: 'End Date', key: 'end_date', type: 'date' },
            { label: 'Initial Capital (₹)', key: 'initial_capital', type: 'number' },
            { label: 'Position Size (%)', key: 'position_size', type: 'number', step: 0.01 },
            { label: 'Stop Loss (%)', key: 'stop_loss_pct', type: 'number' },
          ].map(({ label, key, type, placeholder, step }) => (
            <div key={key}>
              <label className="block text-xs text-slate-400 mb-1">{label}</label>
              <input
                type={type}
                className="input-field"
                value={(form as any)[key]}
                step={step}
                placeholder={placeholder}
                onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
              />
            </div>
          ))}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Take Profit (%)</label>
            <input type="number" className="input-field" value={form.take_profit_pct}
              onChange={e => setForm(f => ({ ...f, take_profit_pct: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Strategy</label>
            <select className="input-field" value={form.strategy}
              onChange={e => setForm(f => ({ ...f, strategy: e.target.value }))}>
              {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={run} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? 'Running...' : <><Play size={14} /> Run Backtest</>}
          </button>
        </div>
        {error && <div className="mt-3 flex items-center gap-2 text-red-400 text-sm"><AlertCircle size={14} />{error}</div>}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {metrics.map(m => (
              <div key={m.label} className="card text-center">
                <div className="text-xs text-slate-500 mb-1">{m.label}</div>
                <div className={`text-lg font-bold ${m.positive ? 'text-green-400' : 'text-red-400'}`}>{m.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-4">Equity Curve</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={equity.slice(-100)}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4c9eff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4c9eff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={v => v?.slice(5, 10)} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} domain={['auto', 'auto']}
                    tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid #1a2540', fontSize: 11 }}
                    formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Value']} />
                  <Area type="monotone" dataKey="value" stroke="#4c9eff" fill="url(#eqGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-4">Trade Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Winning Trades</span>
                  <span className="text-green-400 font-semibold">{result.winning_trades}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Losing Trades</span>
                  <span className="text-red-400 font-semibold">{result.losing_trades}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Avg Trade Return</span>
                  <span className={`font-semibold ${result.avg_trade_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {result.avg_trade_return}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Initial Capital</span>
                  <span className="text-white">₹{result.initial_capital?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Final Value</span>
                  <span className={`font-bold ${result.final_value >= result.initial_capital ? 'text-green-400' : 'text-red-400'}`}>
                    ₹{result.final_value?.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {result.trades?.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-4">Recent Trades</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-dark-600">
                      {['Entry Date', 'Exit Date', 'Action', 'Entry ₹', 'Exit ₹', 'P&L %', 'P&L ₹'].map(h => (
                        <th key={h} className="text-left pb-2 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700">
                    {result.trades.slice(-20).map((t: any, i: number) => (
                      <tr key={i} className="hover:bg-dark-700/50">
                        <td className="py-1.5 pr-4 text-slate-400">{t.entry_date?.split('T')[0]}</td>
                        <td className="py-1.5 pr-4 text-slate-400">{t.exit_date?.split('T')[0]}</td>
                        <td className="py-1.5 pr-4"><span className={t.action === 'BUY' ? 'badge-buy' : 'badge-sell'}>{t.action}</span></td>
                        <td className="py-1.5 pr-4 text-slate-300">₹{t.entry_price}</td>
                        <td className="py-1.5 pr-4 text-slate-300">₹{t.exit_price}</td>
                        <td className={`py-1.5 pr-4 font-semibold ${t.pnl_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>{t.pnl_pct}%</td>
                        <td className={`py-1.5 font-semibold ${t.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>₹{t.pnl?.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {history.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Backtest History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-dark-600">
                  {['Strategy', 'Symbol', 'Period', 'Return', 'Win Rate', 'Sharpe', 'Drawdown', 'Trades'].map(h => (
                    <th key={h} className="text-left pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {history.map((h: any) => (
                  <tr key={h.id} className="hover:bg-dark-700/50">
                    <td className="py-1.5 pr-4 text-slate-300">{h.strategy_name}</td>
                    <td className="py-1.5 pr-4 font-mono text-white">{h.symbol}</td>
                    <td className="py-1.5 pr-4 text-slate-400">{h.start_date} → {h.end_date}</td>
                    <td className={`py-1.5 pr-4 font-bold ${h.total_return_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>{h.total_return_percent}%</td>
                    <td className="py-1.5 pr-4 text-slate-300">{h.win_rate}%</td>
                    <td className="py-1.5 pr-4 text-slate-300">{h.sharpe_ratio}</td>
                    <td className="py-1.5 pr-4 text-red-400">{h.max_drawdown}%</td>
                    <td className="py-1.5 text-slate-400">{h.total_trades}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
