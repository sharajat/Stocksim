'use client'
import { useState } from 'react'
import { modelsApi, featuresApi } from '@/lib/api'
import { TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function FeatureImportancePage() {
  const [symbol, setSymbol] = useState('RELIANCE')
  const [importance, setImportance] = useState<any[]>([])
  const [features, setFeatures] = useState<any>(null)
  const [allFeaturesList, setAllFeaturesList] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [impRes, featRes, listRes] = await Promise.all([
        modelsApi.getFeatureImportance(symbol),
        featuresApi.getFeatures(symbol),
        featuresApi.listFeatures(),
      ])
      const imp = impRes.data?.feature_importance || {}
      const sorted = Object.entries(imp)
        .map(([name, value]: [string, any]) => ({ name, value: parseFloat(value.toFixed(4)) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 20)
      setImportance(sorted)
      setFeatures(featRes.data)
      setAllFeaturesList(listRes.data?.features || [])
    } catch (e) {
      console.error(e)
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Feature Importance</h1>
        <p className="text-slate-400 text-sm mt-1">Understand which signals drive the AI model decisions</p>
      </div>

      <div className="card flex gap-3">
        <input
          className="input-field flex-1"
          value={symbol}
          onChange={e => setSymbol(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="Symbol (e.g. RELIANCE)"
        />
        <button onClick={load} disabled={loading} className="btn-primary">
          {loading ? 'Loading...' : 'Analyze'}
        </button>
      </div>

      {importance.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-accent-blue" />
              Top 20 Features — {symbol}
            </h3>
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={importance} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} width={130} />
                <Tooltip
                  contentStyle={{ background: '#0f1629', border: '1px solid #1a2540', fontSize: 11 }}
                  formatter={(v: any) => [v.toFixed(4), 'Importance']}
                />
                <Bar dataKey="value" fill="#4c9eff" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-4">Current Feature Values</h3>
            {features ? (
              <div className="space-y-1 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                {Object.entries(features).filter(([k]) => !['symbol', 'datetime'].includes(k)).map(([k, v]: [string, any]) => (
                  <div key={k} className="flex items-center justify-between bg-dark-700 rounded px-3 py-1.5 text-xs">
                    <span className="text-slate-400 font-mono">{k}</span>
                    <span className={`font-semibold ${
                      typeof v === 'number' && v > 0 ? 'text-green-400' : typeof v === 'number' && v < 0 ? 'text-red-400' : 'text-slate-300'
                    }`}>
                      {typeof v === 'number' ? v.toFixed(4) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-500 text-sm text-center py-8">
                Click Analyze to load feature values
              </div>
            )}
          </div>
        </div>
      )}

      {allFeaturesList.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">All Available Features ({allFeaturesList.length})</h3>
          <div className="flex flex-wrap gap-2">
            {allFeaturesList.map(f => (
              <span key={f} className="text-xs bg-dark-700 text-slate-400 px-2 py-1 rounded font-mono">{f}</span>
            ))}
          </div>
        </div>
      )}

      {!importance.length && !loading && (
        <div className="card text-center py-16">
          <TrendingUp size={48} className="mx-auto mb-4 text-slate-600" />
          <div className="text-slate-400 text-sm">Enter a symbol and click Analyze to view feature importance</div>
          <div className="text-slate-600 text-xs mt-1">Requires a trained ML model for the symbol</div>
        </div>
      )}
    </div>
  )
}
