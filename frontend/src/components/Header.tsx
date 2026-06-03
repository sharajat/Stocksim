'use client'
import { Bell, Activity, Wifi } from 'lucide-react'
import { useEffect, useState } from 'react'
import { stocksApi } from '@/lib/api'

export default function Header() {
  const [market, setMarket] = useState<any>(null)
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    stocksApi.getMarketBreadth().then(r => setMarket(r.data)).catch(() => {})
  }, [])

  const niftyChange = market?.nifty_change_pct ?? 0
  const isUp = niftyChange >= 0

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-dark-800 border-b border-dark-600 shrink-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${market?.market_status === 'OPEN' ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-xs text-slate-400">
            Market: <span className={market?.market_status === 'OPEN' ? 'text-green-400' : 'text-slate-400'}>
              {market?.market_status ?? '...'}
            </span>
          </span>
        </div>
        {market && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">NIFTY 50:</span>
            <span className="text-white font-semibold">
              {market.nifty_50?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) ?? '—'}
            </span>
            <span className={isUp ? 'text-green-400' : 'text-red-400'}>
              {isUp ? '+' : ''}{niftyChange?.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Wifi size={12} className="text-green-400" />
          <span>Live</span>
        </div>
        <div className="text-xs text-slate-400 font-mono">{time} IST</div>
        <button className="relative p-2 rounded-lg hover:bg-dark-700 text-slate-400 hover:text-white transition-colors">
          <Bell size={16} />
        </button>
        <div className="w-8 h-8 rounded-lg bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center">
          <Activity size={14} className="text-accent-blue" />
        </div>
      </div>
    </header>
  )
}
