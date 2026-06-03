'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Search, Radar, FlaskConical, BarChart2,
  PlayCircle, ClipboardList, TrendingUp, Cpu, BookOpen,
  BrainCircuit, ChevronLeft, ChevronRight, Beaker
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

const NAV = [
  { href: '/',                      icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/stock-explorer',        icon: Search,          label: 'Stock Explorer' },
  { href: '/opportunity-scanner',   icon: Radar,           label: 'Opportunity Scanner' },
  { href: '/strategy-lab',          icon: FlaskConical,    label: 'Strategy Lab' },
  { href: '/backtesting',           icon: BarChart2,       label: 'Backtesting' },
  { href: '/paper-trading',         icon: PlayCircle,      label: 'Paper Trading' },
  { href: '/prediction-audit',      icon: ClipboardList,   label: 'Prediction Audit' },
  { href: '/feature-importance',    icon: TrendingUp,      label: 'Feature Importance' },
  { href: '/model-center',          icon: Cpu,             label: 'Model Center' },
  { href: '/ai-research',           icon: BookOpen,        label: 'AI Research Center' },
  { href: '/simulation',            icon: Beaker,          label: 'Trade Simulation' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={clsx(
      'flex flex-col bg-dark-800 border-r border-dark-600 transition-all duration-300 shrink-0',
      collapsed ? 'w-16' : 'w-56'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-dark-600">
        <div className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center shrink-0">
          <BrainCircuit size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-bold text-white leading-tight">Quant AI</div>
            <div className="text-xs text-slate-500">Trader Platform</div>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                  : 'text-slate-400 hover:bg-dark-700 hover:text-slate-200'
              )}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-3 border-t border-dark-600 text-slate-500 hover:text-slate-200 transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  )
}
