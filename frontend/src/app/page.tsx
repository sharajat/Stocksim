'use client'
import { useEffect, useState } from 'react'
import { reportsApi, stocksApi } from '@/lib/api'
import { TrendingUp, TrendingDown, Activity, Target, DollarSign, Zap, RefreshCw } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const ActionBadge = ({ action }: { action: string }) => {
  const cls = action === 'BUY' ? 'badge-buy' : action === 'SELL' ? 'badge-sell' : 'badge-hold'
  return <span className={cls}>{action}</span>
}

const RiskBadge = ({ risk }: { risk: string }) => {
  const cls = risk === 'LOW' ? 'badge-low' : risk === 'HIGH' ? 'badge-high' : 'badge-medium'
  return <span className={cls}>{risk}</span>
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [universe, setUniverse] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [dash, univ] = await Promise.all([
        reportsApi.getDashboard(),
        stocksApi.getUniverse(),
      ])
      setData(dash.data)
      setUniverse(univ.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const stats = data?.stats || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">AI-Powered Intraday Trading Intelligence</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 btn-primary text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Predictions', value: stats.total_predictions ?? 0, icon: Target, color: 'text-accent-blue' },
          { label: 'Open Trades', value: stats.open_trades ?? 0, icon: Activity, color: 'text-yellow-400' },
          { label: 'Total P&L', value: `₹${(stats.total_pnl ?? 0).toLocaleString('en-IN')}`, icon: DollarSign, color: stats.total_pnl >= 0 ? 'text-green-400' : 'text-red-400' },
          { label: 'Win Rate', value: `${stats.win_rate ?? 0}%`, icon: Zap, color: 'text-accent-purple' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <div className="text-xs text-slate-500">{label}</div>
              <div className="text-lg font-bold text-white">{loading ? '...' : value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Overview */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Market Overview</h2>
            <div className={`text-xs px-2 py-0.5 rounded-full ${data?.market?.market_status === 'OPEN' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
              {data?.market?.market_status ?? 'Loading'}
            </div>
          </div>
          {data?.market && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">NIFTY 50</span>
                <div className="text-right">
                  <div className="text-white font-semibold text-sm">
                    {data.market.nifty_50?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                  <div className={`text-xs ${data.market.nifty_change_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.market.nifty_change_pct >= 0 ? '▲' : '▼'} {Math.abs(data.market.nifty_change_pct)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Predictions */}
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-white mb-4">Recent Predictions</h2>
          {loading ? (
            <div className="text-slate-500 text-sm text-center py-8">Loading...</div>
          ) : data?.recent_predictions?.length > 0 ? (
            <div className="space-y-2">
              {data.recent_predictions.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between bg-dark-700 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-mono text-sm font-semibold">{p.symbol}</span>
                    <ActionBadge action={p.action} />
                  </div>
                  <div className="flex items-center gap-3">
                    <RiskBadge risk={p.risk} />
                    <span className="text-slate-400 text-xs font-semibold">{p.confidence?.toFixed(1)}%</span>
                    <span className="text-xs text-slate-500">
                      {new Date(p.created_at).toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-sm text-center py-8">
              No predictions yet. Go to <strong>Stock Explorer</strong> to get started.
            </div>
          )}
        </div>
      </div>

      {/* Live Universe Ticker */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-4">NSE Universe — Live Quotes</h2>
        {universe.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {universe.slice(0, 15).map((s: any) => (
              <div key={s.symbol} className="bg-dark-700 rounded-lg p-3">
                <div className="text-xs text-slate-400 font-mono">{s.symbol}</div>
                <div className="text-white font-semibold text-sm mt-1">
                  ₹{s.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
                <div className={`text-xs flex items-center gap-1 mt-0.5 ${s.change_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {s.change_pct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {s.change_pct >= 0 ? '+' : ''}{s.change_pct?.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-500 text-sm text-center py-4">Loading quotes...</div>
        )}
      </div>
    </div>
  )
}
