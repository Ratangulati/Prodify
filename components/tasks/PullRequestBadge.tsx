'use client'

import { GitMerge, GitPullRequest, GitPullRequestClosed, GitPullRequestDraft } from 'lucide-react'
import type { PullRequestDto } from '@/lib/task-dto'
import type { PullRequestState } from '@/lib/github/pull-requests'

// GitHub's own conventions: green open, gray draft, purple merged, red closed
export const PR_STATE_STYLE: Record<PullRequestState, { label: string; color: string; bg: string; Icon: typeof GitPullRequest }> = {
  open:   { label: 'Open',   color: '#4ade80', bg: 'rgba(34,197,94,0.12)',   Icon: GitPullRequest },
  draft:  { label: 'Draft',  color: '#a1a1aa', bg: 'rgba(113,113,122,0.15)', Icon: GitPullRequestDraft },
  merged: { label: 'Merged', color: '#c4b5fd', bg: 'rgba(139,92,246,0.15)',  Icon: GitMerge },
  closed: { label: 'Closed', color: '#f87171', bg: 'rgba(239,68,68,0.12)',   Icon: GitPullRequestClosed },
}

/** Small link chip: icon, #number and state, opening the PR on GitHub */
export default function PullRequestBadge({ pr }: { pr: PullRequestDto }) {
  const style = PR_STATE_STYLE[pr.state]
  return (
    <a
      href={pr.url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`${pr.repoFullName}#${pr.number}: ${pr.title} (${style.label.toLowerCase()})`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium hover:brightness-125 transition"
      style={{ background: style.bg, color: style.color }}
    >
      <style.Icon size={10} aria-hidden />
      #{pr.number}
      <span className="sr-only"> {style.label}</span>
      <span aria-hidden>· {style.label}</span>
    </a>
  )
}
