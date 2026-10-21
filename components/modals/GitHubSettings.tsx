'use client'

import { useCallback, useEffect, useState } from 'react'
import { Github, Lock, X } from 'lucide-react'
import { toast } from '@/lib/toast'
import { apiError } from '@/lib/use-tasks'

interface GitHubSettingsProps {
  open: boolean
  onClose: () => void
}

interface Status {
  configured: boolean
  connection: { accountLogin: string } | null
  repos: { githubId: number; fullName: string }[]
}

interface RepoOption {
  githubId: number
  fullName: string
  private: boolean
  selected: boolean
}

export default function GitHubSettings({ open, onClose }: GitHubSettingsProps) {
  const [status, setStatus]       = useState<Status | null>(null)
  const [repos, setRepos]         = useState<RepoOption[] | null>(null)
  const [selected, setSelected]   = useState<Set<number>>(new Set())
  const [error, setError]         = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)

  const load = useCallback(async () => {
    setError(null)
    setRepos(null)
    try {
      const res = await fetch('/api/github/status')
      if (!res.ok) throw new Error(await apiError(res))
      const s: Status = await res.json()
      setStatus(s)
      if (!s.connection) return

      const reposRes = await fetch('/api/github/repos')
      if (!reposRes.ok) throw new Error(await apiError(reposRes))
      const options: RepoOption[] = await reposRes.json()
      setRepos(options)
      setSelected(new Set(options.filter((r) => r.selected).map((r) => r.githubId)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load GitHub settings.')
    }
  }, [])

  useEffect(() => { if (open) load() }, [open, load])

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function saveRepos() {
    setSaving(true)
    try {
      const res = await fetch('/api/github/repos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoIds: Array.from(selected) }),
      })
      if (!res.ok) throw new Error(await apiError(res))
      toast.success(`Tracking ${selected.size} ${selected.size === 1 ? 'repository' : 'repositories'}`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save repositories')
    } finally {
      setSaving(false)
    }
  }

  async function disconnect() {
    const res = await fetch('/api/github/connection', { method: 'DELETE' })
    if (!res.ok) { toast.error(await apiError(res)); return }
    toast.info('GitHub disconnected. Linked PRs on tasks are kept.')
    await load()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="GitHub settings"
        className="w-full rounded-xl shadow-2xl overflow-hidden"
        style={{ maxWidth: 480, background: '#161616', border: '1px solid #2a2a2a' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: '#2a2a2a' }}>
          <Github size={15} style={{ color: '#e0e0e0' }} />
          <span className="text-sm font-semibold" style={{ color: '#e0e0e0' }}>GitHub</span>
          <button onClick={onClose} aria-label="Close" className="ml-auto p-1 rounded hover:bg-white/10 transition-colors" style={{ color: '#888' }}>
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs" style={{ color: '#aaa' }}>
          {error && (
            <p className="rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>{error}</p>
          )}

          {!status && !error && <p>Loading…</p>}

          {status && !status.configured && (
            <div className="space-y-2">
              <p style={{ color: '#ddd' }}>The GitHub App isn&apos;t set up on the server yet.</p>
              <p>
                Set <code>GITHUB_APP_ID</code>, <code>GITHUB_APP_SLUG</code>, <code>GITHUB_PRIVATE_KEY</code> and{' '}
                <code>GITHUB_WEBHOOK_SECRET</code> in <code>.env</code>, then restart. The README&apos;s
                &ldquo;GitHub pull-request linking&rdquo; section walks through creating the app.
              </p>
            </div>
          )}

          {status?.configured && !status.connection && (
            <div className="space-y-3">
              <p>
                Connect GitHub to link pull requests to tasks. Name a branch, PR title or description after a task
                key (like <code>PROD-42</code>) and the PR shows up on that task.
              </p>
              <a
                href="/api/github/install"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
              >
                <Github size={13} /> Connect GitHub
              </a>
            </div>
          )}

          {status?.connection && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p>Connected to <span style={{ color: '#ddd' }}>@{status.connection.accountLogin}</span></p>
                <button onClick={disconnect} className="text-[11px] px-2 py-1 rounded transition-colors text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
                  Disconnect
                </button>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: '#666' }}>
                  Repositories to track
                </p>
                {repos === null && !error && <p>Loading repositories…</p>}
                {repos?.length === 0 && (
                  <p>The app can&apos;t see any repositories. Give it access on GitHub, then reopen this window.</p>
                )}
                {repos && repos.length > 0 && (
                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {repos.map((r) => (
                      <label key={r.githubId} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-white/5">
                        <input type="checkbox" checked={selected.has(r.githubId)} onChange={() => toggle(r.githubId)} />
                        <span style={{ color: '#ddd' }}>{r.fullName}</span>
                        {r.private && <Lock size={10} aria-label="Private" />}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {repos && repos.length > 0 && (
                <button
                  onClick={saveRepos}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Saving…' : 'Save repositories'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
