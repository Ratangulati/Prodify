'use client'

import { useState } from 'react'
import {
  Sparkles, ChevronDown, ChevronRight,
  Circle, User, Sun, Moon, Keyboard, Github,
} from 'lucide-react'
import type { Theme, FeatureStatus } from '@/lib/types'
import { useWorkspaceStore } from '@/lib/store'
import FileExplorer from './FileExplorer'

const STATUS_COLORS: Record<FeatureStatus, string> = {
  Now:  'rgb(var(--green))',
  Next: 'rgb(var(--brand))',
  Later:'rgb(var(--amber))',
  Done: 'rgb(var(--n8))',
}

const LIGHT_THEME_READY = false

interface LeftSidebarProps {
  onToggleTheme: () => void
  onOpenGitHub: () => void
  theme: Theme
}

export default function LeftSidebar({ onToggleTheme, onOpenGitHub, theme }: LeftSidebarProps) {
  const { features } = useWorkspaceStore()
  const [featuresOpen, setFeaturesOpen] = useState(true)

  const counts = features.reduce<Record<string, number>>((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1
    return acc
  }, {})

  return (
    <aside
      className="flex flex-col h-full w-full border-r"
      style={{ background: 'rgb(var(--n3))', borderColor: 'rgb(var(--n6))' }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-4 py-4 border-b flex-shrink-0"
        style={{ borderColor: 'rgb(var(--n6))' }}
      >
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{ width: 28, height: 28, background: 'rgb(var(--brand))' }}
        >
          <Sparkles size={14} className="text-white" />
        </div>
        <span className="font-semibold text-sm tracking-tight" style={{ color: 'rgb(var(--n12))' }}>
          Prodify-AI
        </span>
      </div>

      {/* File Explorer */}
      <FileExplorer />

      {/* Features */}
      <div className="flex-shrink-0 border-t" style={{ borderColor: 'rgb(var(--n6))' }}>
        <button
          onClick={() => setFeaturesOpen(v => !v)}
          className="press-tint flex items-center gap-1.5 w-full px-3 py-2 text-xs font-medium transition-colors hover:bg-white/5"
          style={{ color: 'rgb(var(--n9))' }}
        >
          {featuresOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          <span className="text-[10px] uppercase tracking-wider">Features</span>
        </button>

        {featuresOpen && (
          <div className="grid grid-cols-2 gap-1 px-2 pb-2.5">
            {(['Now', 'Next', 'Later', 'Done'] as FeatureStatus[]).map(s => (
              <div
                key={s}
                className="flex items-center justify-between px-2 py-1.5 rounded-md"
                style={{ background: 'rgb(var(--n4))' }}
              >
                <div className="flex items-center gap-1.5">
                  <Circle size={5} stroke="none" style={{ fill: STATUS_COLORS[s] }} />
                  <span className="text-[11px]" style={{ color: 'rgb(var(--n9))' }}>{s}</span>
                </div>
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: STATUS_COLORS[s] }}>
                  {counts[s] || 0}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-t flex-shrink-0"
        style={{ borderColor: 'rgb(var(--n6))' }}
      >
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{ width: 26, height: 26, background: 'rgb(var(--n7))', color: 'rgb(var(--n10))' }}
        >
          <User size={13} />
        </div>
        <p className="text-[11px] font-medium truncate flex-1" style={{ color: 'rgb(var(--n11))' }}>
          Product Manager
        </p>
        <button
          onClick={onOpenGitHub}
          className="p-1.5 rounded transition-colors hover:bg-white/10 flex-shrink-0"
          style={{ color: 'rgb(var(--n8))' }}
          title="GitHub settings"
          aria-label="GitHub settings"
        >
          <Github size={13} />
        </button>
        {/* Every surface is still dark-only, so the toggle stays hidden until light tokens exist */}
        {LIGHT_THEME_READY && <button
          onClick={onToggleTheme}
          className="p-1.5 rounded transition-colors hover:bg-white/10 flex-shrink-0"
          style={{ color: 'rgb(var(--n8))' }}
          title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>}
        <span className="flex-shrink-0" style={{ color: 'rgb(var(--n8))' }} title="Press ? for shortcuts">
          <Keyboard size={13} />
        </span>
      </div>
    </aside>
  )
}
