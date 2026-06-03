'use client'
import { useState, useEffect } from 'react'
import { predictionsApi } from '@/lib/api'
import { ClipboardList, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'

const StatusIcon = ({ s }: { s: string }) => {
  if (s === 'CORRECT') return <CheckCircle size={14} className="text-green-400" />
  if (s === 'INCORRECT') return <XCircle size={14} className="text-red-400" />
  return <Clock size={14} className="text-yellow-400" />
}

export default function PredictionAuditPage() {
  const [predictions, setPredictions] = useState<any[]>([])
  const [audit, setAudit] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const PER_PAGE = 20

  const load = async () => {
    setLoading(true)
    try {
      const [pRes, aRes] = await Promise.all([
        predictionsApi.getHistory(undefined, PER_PAGE),
        predictionsApi.getAuditStats(),
      ])
      setPredictions(pRes.data || [])
      setAudit(aRes.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [page])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Prediction Audit</h1>
          <p className="text-slate-400 text-sm mt-1">Track AI prediction accuracy and self-learning loop</p>
        </div>
        <button onClick={load} className="btn-primary flex items-center gap-2 text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {audit && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Predictions', value: audit.total_predictions, color: 'text-white' },
            { label: 'Accuracy Rate', value: `${audit.accuracy_rate ?? 0}%`, color: audit.accuracy_rate >= 60 ? 'text-green-400' : 'text-red-400' },
            { label: 'Correct', value: audit.correct, color: 'text-green-400' },
            { label: 'Incorrect', value: audit.incorrect, color: 'text-red-400' },
          ].map(m => (
            <div key={m.label} className="card text-center">
              <div className="text-xs text-slate-500 mb-1">{m.label}</div>
              <div className={`text-2xl font-bold ${m.color}`}>{loading ? '...' : m.value}</div>
            </div>
          ))}
        </div>
      )}

      {audit?.by_action && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Accuracy by Signal</h3>
          <div className="flex gap-6 flex-wrap">
            {Object.entries(audit.by_action).map(([action, stats]: [string, any]) => (
              <div key={action} className="text-center">
                <div className="text-xs text-slate-500 mb-1">{action}</div>
                <div className="text-lg font-bold text-white">{stats.total} trades</div>
                <div className="text-sm text-green-400">{stats.correct} correct</div>
                <div className={`text-sm font-bold ${stats.accuracy >= 60 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.accuracy?.toFixed(1)}% acc.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <ClipboardList size={16} /> Prediction Log
        </h3>
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No predictions yet. Start by analyzing stocks in the <strong>Stock Explorer</strong>.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-dark-600">
                    {['Time', 'Symbol', 'Action', 'Confidence', 'Entry ₹', 'Target ₹', 'Risk', 'Regime', 'Status', 'P&L%'].map(h => (
                      <th key={h} className="text-left pb-2 pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {predictions.map((p: any) => (
                    <tr key={p.id} className="hover:bg-dark-700/50">
                      <td className="py-2 pr-3 text-slate-500">
                        {new Date(p.created_at).toLocaleDateString('en-IN')} {new Date(p.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </td>
                      <td className="py-2 pr-3 font-mono font-bold text-white">{p.symbol}</td>
                      <td className="py-2 pr-3">
                        <span className={p.action === 'BUY' ? 'badge-buy' : p.action === 'SELL' ? 'badge-sell' : 'badge-hold'}>{p.action}</span>
                      </td>
                      <td className={`py-2 pr-3 font-semibold ${p.confidence > 70 ? 'text-green-400' : p.confidence > 55 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {p.confidence?.toFixed(1)}%
                      </td>
                      <td className="py-2 pr-3 text-slate-300">₹{p.entry_price}</td>
                      <td className="py-2 pr-3 text-slate-300">₹{p.target_price}</td>
                      <td className={`py-2 pr-3 ${p.risk === 'LOW' ? 'text-green-400' : p.risk === 'HIGH' ? 'text-red-400' : 'text-yellow-400'}`}>{p.risk}</td>
                      <td className="py-2 pr-3 text-slate-400">{p.market_regime}</td>
                      <td className="py-2 pr-3">
                        <span className="flex items-center gap-1">
                          <StatusIcon s={p.outcome_status} />
                          <span className={p.outcome_status === 'CORRECT' ? 'text-green-400' : p.outcome_status === 'INCORRECT' ? 'text-red-400' : 'text-yellow-400'}>
                            {p.outcome_status}
                          </span>
                        </span>
                      </td>
                      <td className={`py-2 font-semibold ${(p.actual_pnl_percent ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {p.actual_pnl_percent != null ? `${p.actual_pnl_percent > 0 ? '+' : ''}${p.actual_pnl_percent}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="btn-secondary text-xs" >Prev</button>
              <span className="text-slate-400 text-xs flex items-center">Page {page + 1}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={predictions.length < PER_PAGE}
                className="btn-secondary text-xs">Next</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
