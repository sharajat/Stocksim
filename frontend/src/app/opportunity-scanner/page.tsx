'use client'
import { useState } from 'react'
import { reportsApi } from '@/lib/api'
import { Radar, Zap, Clock, AlertCircle, RefreshCw, ShieldAlert, IndianRupee, Building2, BarChart2, Info } from 'lucide-react'

const RiskColor: Record<string, string> = { LOW: 'text-green-400', MEDIUM: 'text-yellow-400', HIGH: 'text-red-400' }

const fmt = (n: number, d = 2) => n?.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d }) ?? '—'

export default function OpportunityScannerPage() {
  const [investment, setInvestment] = useState(10000)
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scanned, setScanned] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const scan = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await reportsApi.getOpportunities(investment)
      setResults(res.data?.opportunities || [])
      setScanned(true)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Scan failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Opportunity Scanner</h1>
        <p className="text-slate-400 text-sm mt-1">
          AI-ranked trade setups with full execution details — exchange, quantity, SL/TP, charges &amp; margin
        </p>
      </div>

      {/* Input */}
      <div className="card flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-1">Investment Amount (₹)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
            <input
              type="number"
              className="input-field pl-7"
              value={investment}
              onChange={e => setInvestment(Number(e.target.value))}
              min={100}
              step={100}
            />
          </div>
          <p className="text-xs text-slate-600 mt-1">Minimum ₹100 — quantity auto-calculated per stock price</p>
        </div>
        <button onClick={scan} disabled={loading} className="btn-primary flex items-center gap-2 sm:w-auto">
          {loading
            ? <><RefreshCw size={14} className="animate-spin" /> Scanning...</>
            : <><Radar size={14} /> Scan Now</>
          }
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {loading && (
        <div className="card text-center py-16">
          <div className="w-16 h-16 loading-spinner mx-auto mb-4" style={{ width: 64, height: 64, borderWidth: 3 }} />
          <div className="text-slate-400 text-sm">Scanning NSE universe — AI features, regime &amp; signals...</div>
          <div className="text-slate-600 text-xs mt-1">This may take 30–60 seconds</div>
        </div>
      )}

      {!loading && scanned && results.length === 0 && (
        <div className="card text-center py-12 text-slate-400">No strong opportunities found right now.</div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Zap size={14} className="text-yellow-400" />
            Found <span className="text-white font-semibold">{results.length}</span> opportunities — click a card to see execution details
          </div>

          {results.map((opp: any, i: number) => {
            const isOpen = expanded === opp.symbol
            const isBuy = opp.action === 'BUY'
            return (
              <div
                key={opp.symbol}
                className={`card relative overflow-hidden cursor-pointer transition-all ${i === 0 ? 'border-accent-blue/50' : 'card-hover'}`}
                onClick={() => setExpanded(isOpen ? null : opp.symbol)}
              >
                {i === 0 && (
                  <div className="absolute top-0 right-0 bg-accent-blue text-white text-xs px-3 py-1 rounded-bl-lg font-bold">
                    #1 TOP PICK
                  </div>
                )}

                {/* ── Header row ── */}
                <div className="flex flex-wrap gap-x-6 gap-y-3 items-center">
                  {/* Rank + Symbol */}
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                      ${i === 0 ? 'bg-accent-blue text-white' : 'bg-dark-700 text-slate-400'}`}>
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-white font-bold font-mono text-lg leading-tight">{opp.symbol}</div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Building2 size={10} />{opp.exchange} · {opp.sector}
                      </div>
                    </div>
                  </div>

                  {/* Signal */}
                  <div className="text-center">
                    <div className="text-xs text-slate-500 mb-1">Signal</div>
                    <span className={isBuy ? 'badge-buy' : 'badge-sell'}>{opp.action}</span>
                  </div>

                  {/* Confidence */}
                  <div className="text-center">
                    <div className="text-xs text-slate-500 mb-1">AI Confidence</div>
                    <div className={`text-base font-bold ${opp.confidence > 70 ? 'text-green-400' : opp.confidence > 55 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {opp.confidence?.toFixed(1)}%
                    </div>
                  </div>

                  {/* Entry */}
                  <div className="text-center">
                    <div className="text-xs text-slate-500 mb-1">Entry Price</div>
                    <div className="text-white font-mono font-semibold">₹{fmt(opp.entry_price)}</div>
                  </div>

                  {/* Qty */}
                  <div className="text-center">
                    <div className="text-xs text-slate-500 mb-1">Qty (shares)</div>
                    <div className="text-white font-bold text-base">{opp.quantity}</div>
                    <div className="text-xs text-slate-500">₹{fmt(opp.actual_investment, 0)}</div>
                  </div>

                  {/* RR Ratio */}
                  <div className="text-center">
                    <div className="text-xs text-slate-500 mb-1">R:R Ratio</div>
                    <div className={`font-bold text-base ${opp.risk_reward_ratio >= 2 ? 'text-green-400' : opp.risk_reward_ratio >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                      1 : {opp.risk_reward_ratio?.toFixed(1)}
                    </div>
                  </div>

                  {/* Risk */}
                  <div className="text-center">
                    <div className="text-xs text-slate-500 mb-1">Risk</div>
                    <div className={`font-semibold ${RiskColor[opp.risk]}`}>{opp.risk}</div>
                  </div>

                  {/* Hold */}
                  <div className="text-center">
                    <div className="text-xs text-slate-500 mb-1">Hold</div>
                    <div className="text-white text-sm flex items-center gap-1 justify-center">
                      <Clock size={11} />{opp.suggested_hold_time_minutes}m
                    </div>
                    <div className="text-xs text-slate-500">{opp.trade_type?.split(' ')[0]}</div>
                  </div>

                  {/* Score */}
                  <div className="ml-auto text-center">
                    <div className="text-xs text-slate-500 mb-1">Opp. Score</div>
                    <div className="text-accent-blue font-bold text-lg">{opp.opportunity_score?.toFixed(3)}</div>
                  </div>
                </div>

                {/* Score bar */}
                <div className="mt-3 h-1 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${i === 0 ? 'bg-accent-blue' : 'bg-slate-600'}`}
                    style={{ width: `${Math.min((opp.opportunity_score / (results[0]?.opportunity_score || 1)) * 100, 100)}%` }}
                  />
                </div>

                {/* ── Expanded execution details ── */}
                {isOpen && (
                  <div className="mt-5 pt-5 border-t border-dark-600 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">

                    {/* Order Ticket */}
                    <div className="bg-dark-800 rounded-xl p-4 space-y-2">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                        <BarChart2 size={12} /> Broker Order Ticket
                      </div>
                      <Row label="Symbol" value={opp.broker_symbol} mono />
                      <Row label="Exchange" value={opp.exchange} />
                      <Row label="Order Type" value={opp.order_type} />
                      <Row label="Trade Type" value={opp.trade_type} />
                      <Row label="Action" value={opp.action} color={isBuy ? 'text-green-400' : 'text-red-400'} />
                      <Row label="Quantity" value={`${opp.quantity} shares`} />
                      <Row label="Entry Price" value={`₹${fmt(opp.entry_price)}`} mono />
                      <Row label="Min. for 1 share" value={`₹${fmt(opp.min_investment_1_share)}`} />
                    </div>

                    {/* SL / TP */}
                    <div className="bg-dark-800 rounded-xl p-4 space-y-2">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                        <ShieldAlert size={12} /> Stop-Loss &amp; Target
                      </div>
                      <Row label="Stop-Loss Price" value={`₹${fmt(opp.stop_loss_price)}`} color="text-red-400" mono />
                      <Row label="SL Distance" value={`${opp.sl_pct?.toFixed(2)}%`} color="text-red-400" />
                      <Row label="Max Loss (total)" value={`₹${fmt(opp.max_loss_total)}`} color="text-red-400" />
                      <div className="border-t border-dark-600 my-1" />
                      <Row label="Take-Profit Price" value={`₹${fmt(opp.take_profit_price)}`} color="text-green-400" mono />
                      <Row label="TP Distance" value={`${opp.tp_pct?.toFixed(2)}%`} color="text-green-400" />
                      <Row label="Max Gain (total)" value={`₹${fmt(opp.max_gain_total)}`} color="text-green-400" />
                      <div className="border-t border-dark-600 my-1" />
                      <Row label="Risk : Reward" value={`1 : ${opp.risk_reward_ratio?.toFixed(2)}`} color={opp.risk_reward_ratio >= 2 ? 'text-green-400' : 'text-yellow-400'} />
                    </div>

                    {/* Charges */}
                    <div className="bg-dark-800 rounded-xl p-4 space-y-2">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                        <IndianRupee size={12} /> Charges &amp; Margin
                      </div>
                      <Row label="Brokerage (×2)" value={`₹${fmt(opp.charges?.brokerage)}`} />
                      <Row label="STT" value={`₹${fmt(opp.charges?.stt)}`} />
                      <Row label="Exchange Fee" value={`₹${fmt(opp.charges?.exchange_fee)}`} />
                      <Row label="SEBI Fee" value={`₹${fmt(opp.charges?.sebi_fee)}`} />
                      <Row label="Stamp Duty" value={`₹${fmt(opp.charges?.stamp_duty)}`} />
                      <Row label="GST (18%)" value={`₹${fmt(opp.charges?.gst)}`} />
                      <div className="border-t border-dark-600 my-1" />
                      <Row label="Total Charges" value={`₹${fmt(opp.charges?.total_charges)}`} color="text-yellow-400" />
                      <Row label="Net Profit (after charges)" value={`₹${fmt(opp.net_profit_after_charges)}`} color={opp.net_profit_after_charges > 0 ? 'text-green-400' : 'text-red-400'} />
                      <div className="border-t border-dark-600 my-1" />
                      <Row label="Margin Required" value={`₹${fmt(opp.margin_required)}`} color="text-accent-blue" />
                      <Row label="Hold Time" value={`${opp.suggested_hold_time_minutes} min`} />
                      <Row label="Market Regime" value={opp.market_regime} />
                    </div>

                    {/* Disclaimer */}
                    <div className="md:col-span-3 flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2 text-xs text-yellow-500/80">
                      <Info size={12} className="mt-0.5 flex-shrink-0" />
                      These are AI-generated hints only. Always verify with your broker. Use Stop-Loss strictly. Past signals do not guarantee future profits.
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!scanned && !loading && (
        <div className="card text-center py-16">
          <Radar size={48} className="mx-auto mb-4 text-slate-600" />
          <div className="text-slate-400 text-sm">Enter investment amount and scan to find actionable trade setups</div>
          <div className="text-slate-600 text-xs mt-2">Works with any amount — even ₹100</div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, mono = false, color = 'text-white' }: { label: string; value: any; mono?: boolean; color?: string }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-slate-500 text-xs flex-shrink-0">{label}</span>
      <span className={`text-xs font-medium ${color} ${mono ? 'font-mono' : ''} text-right`}>{value}</span>
    </div>
  )
}
