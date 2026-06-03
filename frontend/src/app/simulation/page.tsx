'use client'
import { useState } from 'react'
import { simulationApi } from '@/lib/api'
import {
  FlaskConical, Play, RefreshCw, AlertCircle, TrendingUp, TrendingDown,
  CheckCircle2, XCircle, BrainCircuit, BarChart2, IndianRupee, Info
} from 'lucide-react'

const fmt = (n: number, d = 2) =>
  n?.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d }) ?? '—'

const CalibColor: Record<string, string> = {
  CALIBRATED: 'text-green-400',
  UNDER_CONFIDENT: 'text-yellow-400',
  OVER_CONFIDENT: 'text-red-400',
}

export default function SimulationPage() {
  const [numTrades, setNumTrades] = useState(5)
  const [amount, setAmount] = useState(10000)
  const [seed, setSeed] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)

  const run = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await simulationApi.run(numTrades, amount, seed ? Number(seed) : undefined)
      setResult(res.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Simulation failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const s = result?.summary
  const trades = result?.trades || []
  const curve = result?.capital_curve || []

  const maxCurve = curve.length > 0 ? Math.max(...curve) : 1
  const minCurve = curve.length > 0 ? Math.min(...curve) : 0
  const curveRange = maxCurve - minCurve || 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FlaskConical size={22} className="text-accent-blue" /> Trade Simulation
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          AI scans the market, auto-selects trades, simulates outcomes via Monte Carlo price paths, and evaluates model calibration
        </p>
      </div>

      {/* Config card */}
      <div className="card grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Number of Trades</label>
          <input
            type="number" min={1} max={20}
            className="input-field"
            value={numTrades}
            onChange={e => setNumTrades(Math.min(20, Math.max(1, Number(e.target.value))))}
          />
          <p className="text-xs text-slate-600 mt-0.5">Max 20</p>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Amount per Trade (₹)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
            <input
              type="number" min={100} step={100}
              className="input-field pl-7"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Random Seed (optional)</label>
          <input
            type="number"
            className="input-field"
            placeholder="Leave blank for random"
            value={seed}
            onChange={e => setSeed(e.target.value)}
          />
          <p className="text-xs text-slate-600 mt-0.5">Same seed = same result</p>
        </div>

        <div className="sm:col-span-3 flex items-center gap-4">
          <button onClick={run} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <><RefreshCw size={14} className="animate-spin" /> Simulating...</> : <><Play size={14} /> Run Simulation</>}
          </button>
          <p className="text-xs text-slate-500">
            Total capital: ₹{fmt(numTrades * amount, 0)}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {loading && (
        <div className="card text-center py-16">
          <div className="w-16 h-16 loading-spinner mx-auto mb-4" style={{ width: 64, height: 64, borderWidth: 3 }} />
          <div className="text-slate-400 text-sm">Scanning market → Simulating {numTrades} trades...</div>
          <div className="text-slate-600 text-xs mt-1">This may take 30–90 seconds</div>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-5">

          {/* ── Summary stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Total P&L"
              value={`${s.total_pnl >= 0 ? '+' : ''}₹${fmt(s.total_pnl)}`}
              sub={`${s.total_pnl_pct >= 0 ? '+' : ''}${fmt(s.total_pnl_pct)}%`}
              color={s.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}
              icon={s.total_pnl >= 0 ? TrendingUp : TrendingDown}
            />
            <StatCard
              label="Win Rate"
              value={`${fmt(s.win_rate)}%`}
              sub={`${s.winners}W / ${s.losers}L of ${s.total_trades}`}
              color={s.win_rate >= 55 ? 'text-green-400' : s.win_rate >= 40 ? 'text-yellow-400' : 'text-red-400'}
              icon={BarChart2}
            />
            <StatCard
              label="Profit Factor"
              value={fmt(s.profit_factor)}
              sub={`Avg Win ₹${fmt(s.avg_win, 0)} / Avg Loss ₹${fmt(Math.abs(s.avg_loss), 0)}`}
              color={s.profit_factor >= 1.5 ? 'text-green-400' : s.profit_factor >= 1 ? 'text-yellow-400' : 'text-red-400'}
              icon={IndianRupee}
            />
            <StatCard
              label="Ending Capital"
              value={`₹${fmt(s.ending_capital, 0)}`}
              sub={`Started ₹${fmt(s.starting_capital, 0)}`}
              color={s.ending_capital >= s.starting_capital ? 'text-green-400' : 'text-red-400'}
              icon={IndianRupee}
            />
          </div>

          {/* ── Capital curve + Model calibration ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Capital curve */}
            <div className="md:col-span-2 card">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Capital Curve</div>
              <div className="flex items-end gap-1 h-28">
                {curve.map((v: number, i: number) => {
                  const heightPct = ((v - minCurve) / curveRange) * 100
                  const isUp = i === 0 ? true : v >= curve[i - 1]
                  return (
                    <div
                      key={i}
                      title={`₹${fmt(v, 0)}`}
                      className={`flex-1 rounded-sm transition-all ${isUp ? 'bg-green-500/70' : 'bg-red-500/70'}`}
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    />
                  )
                })}
              </div>
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>Start ₹{fmt(curve[0], 0)}</span>
                <span>End ₹{fmt(curve[curve.length - 1], 0)}</span>
              </div>
            </div>

            {/* Model calibration */}
            <div className="card flex flex-col gap-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <BrainCircuit size={12} /> Model Calibration
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Expected Win Rate (avg confidence)</div>
                  <div className="text-lg font-bold text-slate-300">{fmt(s.expected_win_rate)}%</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Actual Win Rate (simulation)</div>
                  <div className="text-lg font-bold text-white">{fmt(s.win_rate)}%</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Delta</div>
                  <div className={`text-base font-bold ${s.calibration_delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {s.calibration_delta >= 0 ? '+' : ''}{fmt(s.calibration_delta)}%
                  </div>
                </div>
                <div className={`text-xs font-semibold px-2 py-1 rounded ${CalibColor[s.calibration_status]}`}>
                  {s.calibration_status.replace('_', ' ')}
                </div>
              </div>
              <div className="bg-dark-700 rounded-lg px-3 py-2 flex items-start gap-2">
                <Info size={11} className="text-slate-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-500">{s.model_feedback}</p>
              </div>
            </div>
          </div>

          {/* ── Trade log ── */}
          <div className="card">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Simulated Trade Log</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-dark-600">
                    <th className="text-left pb-2 pr-3">#</th>
                    <th className="text-left pb-2 pr-3">Symbol</th>
                    <th className="text-left pb-2 pr-3">Action</th>
                    <th className="text-right pb-2 pr-3">Entry</th>
                    <th className="text-right pb-2 pr-3">Exit</th>
                    <th className="text-right pb-2 pr-3">Qty</th>
                    <th className="text-right pb-2 pr-3">Net P&L</th>
                    <th className="text-right pb-2 pr-3">P&L %</th>
                    <th className="text-right pb-2 pr-3">Conf.</th>
                    <th className="text-right pb-2 pr-3">R:R</th>
                    <th className="text-right pb-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t: any, i: number) => (
                    <tr key={i} className="border-b border-dark-700 hover:bg-dark-700/50 transition-colors">
                      <td className="py-2 pr-3 text-slate-500">{i + 1}</td>
                      <td className="py-2 pr-3 font-mono font-semibold text-white">{t.symbol}</td>
                      <td className="py-2 pr-3">
                        <span className={t.action === 'BUY' ? 'badge-buy' : 'badge-sell'}>{t.action}</span>
                      </td>
                      <td className="py-2 pr-3 text-right font-mono">₹{fmt(t.entry_price)}</td>
                      <td className="py-2 pr-3 text-right font-mono">₹{fmt(t.exit_price)}</td>
                      <td className="py-2 pr-3 text-right">{t.quantity}</td>
                      <td className={`py-2 pr-3 text-right font-semibold font-mono ${t.net_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {t.net_pnl >= 0 ? '+' : ''}₹{fmt(t.net_pnl)}
                      </td>
                      <td className={`py-2 pr-3 text-right ${t.pnl_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {t.pnl_pct >= 0 ? '+' : ''}{fmt(t.pnl_pct)}%
                      </td>
                      <td className="py-2 pr-3 text-right text-slate-400">{fmt(t.confidence, 1)}%</td>
                      <td className="py-2 pr-3 text-right text-slate-400">1:{fmt(t.risk_reward, 1)}</td>
                      <td className="py-2 text-right">
                        {t.outcome === 'WIN'
                          ? <CheckCircle2 size={14} className="text-green-400 inline" />
                          : <XCircle size={14} className="text-red-400 inline" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-4 py-3 text-xs text-yellow-500/70">
            <Info size={12} className="mt-0.5 flex-shrink-0" />
            Simulation uses Monte Carlo price paths seeded by AI confidence — not guaranteed to reflect actual market outcomes.
            Use this to evaluate model quality and strategy logic, not as trading advice.
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="card text-center py-16">
          <FlaskConical size={48} className="mx-auto mb-4 text-slate-600" />
          <div className="text-slate-400 text-sm">Configure and run a simulation to see AI-driven trade outcomes</div>
          <div className="text-slate-600 text-xs mt-2">The model learns from each run — calibration improves over time</div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, color, icon: Icon }: any) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">{label}</span>
        <Icon size={14} className={color} />
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
    </div>
  )
}
