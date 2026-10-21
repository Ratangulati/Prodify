'use client'

import { useCallback, useEffect, useState } from 'react'
import { Github, Lock, X } from 'lucide-react'
import { toast } from '@/lib/toast'
import { apiError } from '@/lib/use-tasks'
import Overlay from '@/components/ui/Overlay'

interface GitHubSettingsProps {
  open: boolean
  onClose: () => void
}

interface Status {
  configured: boolean
  connection: { accountLogin: string } | null
  repos: { githubId: number; fullName: string }[]
  automation: boolean
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

  async function setAutomation(automation: boolean) {
    try {
      const res = await fetch('/api/github/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automation }),
      })
      if (!res.ok) throw new Error(await apiError(res))
      setStatus((s) => (s ? { ...s, automation } : s))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the setting')
    }
  }

  async function disconnect() {
    const res = await fetch('/api/github/connection', { method: 'DELETE' })
    if (!res.ok) { toast.error(await apiError(res)); return }
    toast.info('GitHub disconnected. Linked PRs on tasks are kept.')
    await load()
  }

  return (
    <Overlay
      open={open}
      onClose={onClose}
      className="items-center"
      panelClassName="material-panel w-full rounded-xl overflow-hidden"
      panelStyle={{ maxWidth: 480 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'rgb(var(--n6))' }}>
        <Github size={15} style={{ color: 'rgb(var(--n11))' }} />
        <span className="text-sm font-semibold" style={{ color: 'rgb(var(--n11))' }}>GitHub</span>
        <button onClick={onClose} aria-label="Close" className="ml-auto p-1 rounded hover:bg-overlay/10 transition-colors" style={{ color: 'rgb(var(--n9))' }}>
          <X size={14} />
        </button>
      </div>

      <div className="p-4 space-y-4 text-xs" style={{ color: 'rgb(var(--n10))' }}>
        {error && (
          <p className="rounded-lg px-3 py-2" style={{ background: 'rgb(var(--red) / 0.1)', color: 'rgb(var(--red-soft))' }}>{error}</p>
        )}

        {!status && !error && <p>Loading…</p>}

        {status && !status.configured && (
          <div className="space-y-2">
            <p style={{ color: 'rgb(var(--n11))' }}>The GitHub App isn&apos;t set up on the server yet.</p>
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
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-on-brand bg-brand hover:bg-brand-strong transition-colors"
            >
              <Github size={13} /> Connect GitHub
            </a>
          </div>
        )}

        {status?.connection && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p>Connected to <span style={{ color: 'rgb(var(--n11))' }}>@{status.connection.accountLogin}</span></p>
              <button onClick={disconnect} className="text-[11px] px-2 py-1 rounded transition-colors text-n8 hover:text-danger-fg hover:bg-danger/10">
                Disconnect
              </button>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'rgb(var(--n8))' }}>
                Repositories to track
              </p>
              {repos === null && !error && <p>Loading repositories…</p>}
              {repos?.length === 0 && (
                <p>The app can&apos;t see any repositories. Give it access on GitHub, then reopen this window.</p>
              )}
              {repos && repos.length > 0 && (
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {repos.map((r) => (
                    <label key={r.githubId} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-overlay/5">
                      <input type="checkbox" checked={selected.has(r.githubId)} onChange={() => toggle(r.githubId)} />
                      <span style={{ color: 'rgb(var(--n11))' }}>{r.fullName}</span>
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
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-on-brand bg-brand hover:bg-brand-strong disabled:opacity-40 transition-colors"
              >
                {saving ? 'Saving…' : 'Save repositories'}
              </button>
            )}

            <label className="flex items-start gap-2 pt-3 border-t cursor-pointer" style={{ borderColor: 'rgb(var(--n6))' }}>
              <input
                type="checkbox"
                className="mt-0.5"
                checked={status.automation}
                onChange={(e) => setAutomation(e.target.checked)}
              />
              <span>
                <span className="block" style={{ color: 'rgb(var(--n11))' }}>Move tasks automatically</span>
                When a linked PR is opened, move its task to Review; when it&apos;s merged, move it to Done. Each
                move is noted in the task&apos;s activity.
              </span>
            </label>
          </div>
        )}
      </div>
    </Overlay>
  )
}
