'use client'
import { useState, useEffect } from 'react'
import { modelsApi } from '@/lib/api'
import { Cpu, Play, RefreshCw } from 'lucide-react'

const NSE_UNIVERSE = [
  'RELIANCE','TCS','HDFCBANK','ICICIBANK','INFY','HINDUNILVR','ITC','KOTAKBANK',
  'LT','SBIN','AXISBANK','BAJFINANCE','BHARTIARTL','ASIANPAINT','MARUTI',
  'SUNPHARMA','WIPRO','ULTRACEMCO','TITAN','NESTLEIND',
]

export default function ModelCenterPage() {
  const [models, setModels] = useState<any[]>([])
  const [performance, setPerformance] = useState<any[]>([])
  const [trainSymbol, setTrainSymbol] = useState('RELIANCE')
  const [trainPeriod, setTrainPeriod] = useState('2y')
  const [training, setTraining] = useState(false)
  const [trainResult, setTrainResult] = useState<any>(null)
  const [trainError, setTrainError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [mRes, pRes] = await Promise.all([
        modelsApi.listModels(),
        modelsApi.getPerformance(),
      ])
      setModels(mRes.data || [])
      setPerformance(pRes.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const train = async () => {
    setTraining(true); setTrainError(''); setTrainResult(null)
    try {
      const res = await modelsApi.train(trainSymbol, trainPeriod)
      setTrainResult(res.data)
      load()
    } catch (e: any) {
      setTrainError(e?.response?.data?.detail || 'Training failed')
    } finally { setTraining(false) }
  }

  const allSymbols = Array.from(new Set([...NSE_UNIVERSE, ...models.map((m: any) => m.symbol)]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Model Center</h1>
        <p className="text-slate-400 text-sm mt-1">Train, manage and monitor ML models for each NSE stock</p>
      </div>

      {/* Train Form */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-4">Train New Model</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Symbol</label>
            <select className="input-field" value={trainSymbol}
              onChange={e => setTrainSymbol(e.target.value)}>
              {NSE_UNIVERSE.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Period</label>
            <select className="input-field" value={trainPeriod}
              onChange={e => setTrainPeriod(e.target.value)}>
              <option value="1y">1 Year</option>
              <option value="2y">2 Years</option>
              <option value="3y">3 Years</option>
              <option value="5y">5 Years</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={train} disabled={training} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              {training ? <><RefreshCw size={14} className="animate-spin" /> Training...</> : <><Play size={14} /> Train Model</>}
            </button>
          </div>
        </div>
        {trainError && <div className="text-red-400 text-xs mt-2">{trainError}</div>}
        {trainResult && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="text-green-400 text-sm font-semibold mb-2">Training Complete — {trainResult.symbol}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {Object.entries(trainResult.metrics || {}).map(([k, v]: [string, any]) => (
                <div key={k} className="bg-dark-700 rounded p-2">
                  <div className="text-slate-500">{k}</div>
                  <div className="text-white font-semibold">{typeof v === 'number' ? v.toFixed(3) : v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Available Models */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Cpu size={16} className="text-accent-blue" /> Available Models ({models.length})
          </h3>
          <button onClick={load} className="text-slate-400 hover:text-white">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {models.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No models trained yet. Train your first model above.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {models.map((m: any) => (
              <div key={m.symbol + m.model_type} className="bg-dark-700 rounded-lg p-3">
                <div className="font-mono font-bold text-white text-sm">{m.symbol}</div>
                <div className="text-xs text-slate-400 mt-0.5">{m.model_type}</div>
                <div className="text-xs text-accent-blue mt-1">
                  {m.accuracy ? `${(m.accuracy * 100).toFixed(1)}% acc.` : 'Trained'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {m.trained_at ? new Date(m.trained_at).toLocaleDateString('en-IN') : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performance Table */}
      {performance.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Model Performance History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-dark-600">
                  {['Symbol', 'Model', 'Period', 'Accuracy', 'Precision', 'Recall', 'F1', 'Features', 'Trained'].map(h => (
                    <th key={h} className="text-left pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {performance.map((p: any) => (
                  <tr key={p.id} className="hover:bg-dark-700/50">
                    <td className="py-2 pr-4 font-mono font-bold text-white">{p.symbol}</td>
                    <td className="py-2 pr-4 text-slate-300">{p.model_type}</td>
                    <td className="py-2 pr-4 text-slate-400">{p.training_period}</td>
                    <td className={`py-2 pr-4 font-semibold ${p.accuracy > 0.7 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {(p.accuracy * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 pr-4 text-slate-300">{(p.precision_score * 100).toFixed(1)}%</td>
                    <td className="py-2 pr-4 text-slate-300">{(p.recall_score * 100).toFixed(1)}%</td>
                    <td className="py-2 pr-4 text-slate-300">{(p.f1_score * 100).toFixed(1)}%</td>
                    <td className="py-2 pr-4 text-slate-400">{p.num_features}</td>
                    <td className="py-2 text-slate-500">{new Date(p.trained_at).toLocaleDateString('en-IN')}</td>
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
