'use client'
import { useState, useEffect } from 'react'
import { paperTradeApi, stocksApi } from '@/lib/api'
import { PlayCircle, XCircle, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'

export default function PaperTradingPage() {
  const [trades, setTrades] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [form, setForm] = useState({ symbol: 'RELIANCE', action: 'BUY', investment_amount: 10000, entry_price: 0, stop_loss_pct: 2, take_profit_pct: 4 })
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'OPEN' | 'CLOSED'>('OPEN')
  const [msg, setMsg] = useState('')

  const load = async () => {
    const [t, s] = await Promise.all([
      paperTradeApi.list(tab),
      paperTradeApi.getStats(),
    ])
    setTrades(t.data || [])
    setStats(s.data)
  }

  const fetchPrice = async () => {
    if (!form.symbol) return
    try {
      const r = await stocksApi.getInfo(form.symbol)
      setForm(f => ({ ...f, entry_price: r.data.current_price || 0 }))
    } catch {}
  }

  useEffect(() => { load() }, [tab])

  const openTrade = async () => {
    setLoading(true); setMsg('')
    try {
      await paperTradeApi.open(form)
      setMsg('Trade opened successfully!')
      load()
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || 'Failed to open trade')
    } finally { setLoading(false) }
  }

  const closeTrade = async (id: number) => {
    try {
      await paperTradeApi.close(id)
      load()
    } catch {}
  }

  const totalPnl = stats?.total_pnl || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Paper Trading</h1>
        <p className="text-slate-400 text-sm mt-1">Simulate trades risk-free with real market prices</p>
      </div>

      {/* Portfolio Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total P&L', value: `₹${totalPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, positive: totalPnl >= 0 },
            { label: 'Win Rate', value: `${stats.win_rate}%`, positive: stats.win_rate >= 50 },
            { label: 'Open Trades', value: stats.open_trades, positive: true },
            { label: 'Closed Trades', value: stats.closed_trades, positive: true },
          ].map(m => (
            <div key={m.label} className="card text-center">
              <div className="text-xs text-slate-500 mb-1">{m.label}</div>
              <div className={`text-xl font-bold ${m.positive ? 'text-green-400' : 'text-red-400'}`}>{m.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Open Trade Form */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-4">Open New Trade</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Symbol</label>
            <div className="flex gap-2">
              <input className="input-field flex-1" value={form.symbol}
                onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))} />
              <button onClick={fetchPrice} className="btn-primary text-xs px-2 py-1 whitespace-nowrap">Get Price</button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Action</label>
            <select className="input-field" value={form.action}
              onChange={e => setForm(f => ({ ...f, action: e.target.value }))}>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL (Short)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Investment (₹)</label>
            <input type="number" className="input-field" value={form.investment_amount}
              onChange={e => setForm(f => ({ ...f, investment_amount: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Entry Price (₹)</label>
            <input type="number" className="input-field" value={form.entry_price}
              onChange={e => setForm(f => ({ ...f, entry_price: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Stop Loss (%)</label>
            <input type="number" className="input-field" value={form.stop_loss_pct}
              onChange={e => setForm(f => ({ ...f, stop_loss_pct: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Take Profit (%)</label>
            <input type="number" className="input-field" value={form.take_profit_pct}
              onChange={e => setForm(f => ({ ...f, take_profit_pct: Number(e.target.value) }))} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={openTrade} disabled={loading || !form.entry_price} className="btn-success flex items-center gap-2">
            <PlayCircle size={14} /> {loading ? 'Opening...' : 'Open Trade'}
          </button>
          {msg && <span className={`text-sm ${msg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>{msg}</span>}
        </div>
      </div>

      {/* Trade List */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          {(['OPEN', 'CLOSED'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-accent-blue text-white' : 'bg-dark-700 text-slate-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
          <button onClick={load} className="ml-auto text-slate-400 hover:text-white">
            <RefreshCw size={14} />
          </button>
        </div>

        {trades.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No {tab.toLowerCase()} trades yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-dark-600">
                  {['Symbol', 'Action', 'Qty', 'Entry ₹', tab === 'OPEN' ? 'Stop Loss' : 'Exit ₹', tab === 'OPEN' ? 'Take Profit' : 'P&L', 'Invested', tab === 'OPEN' ? 'Close' : 'Hold (min)'].map(h => (
                    <th key={h} className="text-left pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {trades.map((t: any) => (
                  <tr key={t.id} className="hover:bg-dark-700/50">
                    <td className="py-2 pr-4 font-mono font-bold text-white">{t.symbol}</td>
                    <td className="py-2 pr-4">
                      <span className={t.action === 'BUY' ? 'badge-buy' : 'badge-sell'}>{t.action}</span>
                    </td>
                    <td className="py-2 pr-4 text-slate-300">{t.quantity?.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-slate-300">₹{t.entry_price}</td>
                    <td className="py-2 pr-4">
                      {tab === 'OPEN'
                        ? <span className="text-red-400">₹{t.stop_loss}</span>
                        : <span className="text-slate-300">₹{t.exit_price}</span>
                      }
                    </td>
                    <td className="py-2 pr-4">
                      {tab === 'OPEN'
                        ? <span className="text-green-400">₹{t.take_profit}</span>
                        : <span className={t.pnl >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                            ₹{t.pnl?.toFixed(0)} ({t.pnl_percent?.toFixed(2)}%)
                          </span>
                      }
                    </td>
                    <td className="py-2 pr-4 text-slate-400">₹{t.investment_amount?.toLocaleString('en-IN')}</td>
                    <td className="py-2">
                      {tab === 'OPEN'
                        ? <button onClick={() => closeTrade(t.id)} className="text-red-400 hover:text-red-300 flex items-center gap-1">
                            <XCircle size={12} /> Close
                          </button>
                        : <span className="text-slate-500">{t.hold_minutes ?? '—'}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
