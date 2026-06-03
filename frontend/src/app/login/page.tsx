'use client'
import { useState } from 'react'
import { authApi } from '@/lib/api'
import { TrendingUp, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  const submit = async () => {
    setLoading(true); setError('')
    try {
      if (mode === 'login') {
        const res = await authApi.login(form.username, form.password)
        localStorage.setItem('token', res.data.access_token)
        window.location.href = '/'
      } else {
        await authApi.register(form.username, form.email, form.password)
        setMode('login')
        setError('')
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || (mode === 'login' ? 'Invalid credentials' : 'Registration failed'))
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-blue-600 flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Stocksim</span>
          </div>
          <div className="text-slate-400 text-sm">AI-powered NSE intraday research platform</div>
        </div>

        <div className="card">
          {/* Tab Switch */}
          <div className="flex gap-1 bg-dark-700 rounded-lg p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'login' ? 'bg-accent-blue text-white' : 'text-slate-400 hover:text-white'}`}>
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'register' ? 'bg-accent-blue text-white' : 'text-slate-400 hover:text-white'}`}>
              Register
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Username</label>
              <input className="input-field" placeholder="Enter username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email</label>
                <input className="input-field" type="email" placeholder="Enter email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-400 mb-1">Password</label>
              <div className="relative">
                <input
                  className="input-field pr-10"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && submit()} />
                <button
                  onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-xs">
                {error}
              </div>
            )}

            <button onClick={submit} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? <><LogIn size={16} /> Sign In</>
                  : <><UserPlus size={16} /> Create Account</>
              }
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-dark-600 text-center text-xs text-slate-500">
            Demo: username <span className="text-slate-300 font-mono">admin</span> / password <span className="text-slate-300 font-mono">admin123</span>
          </div>
        </div>
      </div>
    </div>
  )
}
