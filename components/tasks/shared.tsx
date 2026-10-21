'use client'

import { useState } from 'react'
import { Check, GitBranch } from 'lucide-react'
import { toast } from '@/lib/toast'
import type { TaskStatus } from '@/lib/tasks'

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo:        'To do',
  in_progress: 'In progress',
  review:      'Review',
  done:        'Done',
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo:        'rgb(var(--n8))',
  in_progress: 'rgb(var(--brand))',
  review:      'rgb(var(--amber))',
  done:        'rgb(var(--green))',
}

/** Copies the task's branch name (prod-42-add-csv-import) */
export function CopyBranchButton({ branch }: { branch: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(branch)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy to the clipboard')
    }
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); copy() }}
      title={`Copy branch name: ${branch}`}
      aria-label={`Copy branch name ${branch}`}
      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors text-n8 hover:text-n11 hover:bg-overlay/5"
    >
      {copied ? <Check size={11} className="text-success" /> : <GitBranch size={11} />}
      {copied ? 'Copied' : 'Branch'}
    </button>
  )
}
