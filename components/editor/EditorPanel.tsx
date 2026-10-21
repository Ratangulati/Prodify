'use client'

import { useState, useRef, useEffect } from 'react'

import { format } from 'date-fns'
import { ChevronDown, Copy, Download, ChevronRight, Search, FileText, Plus, CheckCircle2 } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { useWorkspaceStore } from '@/lib/store'
import { springs } from '@/lib/motion'
import Editor from './Editor'
import DeliverySection from './DeliverySection'
import AutoPlanSummary, { type AutoPlanResult } from './AutoPlanSummary'
import { toast } from '@/lib/toast'
import { apiError, refreshTasks } from '@/lib/use-tasks'
import type { DocumentType } from '@/lib/types'

/* ── Export helpers ─────────────────────────────────────────────── */
function htmlToMarkdown(html: string): string {
  if (typeof document === 'undefined') return html
  const parser = new DOMParser()
  const parsed = parser.parseFromString(html, 'text/html')

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const el = node as Element
    const tag = el.tagName.toLowerCase()
    const inner = Array.from(el.childNodes).map(walk).join('')
    switch (tag) {
      case 'h1': return `# ${inner}\n\n`
      case 'h2': return `## ${inner}\n\n`
      case 'h3': return `### ${inner}\n\n`
      case 'h4': return `#### ${inner}\n\n`
      case 'h5': return `##### ${inner}\n\n`
      case 'h6': return `###### ${inner}\n\n`
      case 'p':  return `${inner}\n\n`
      case 'strong': case 'b': return `**${inner}**`
      case 'em': case 'i':     return `*${inner}*`
      case 'u':  return `__${inner}__`
      case 'code':
        return el.parentElement?.tagName.toLowerCase() === 'pre'
          ? inner
          : `\`${inner}\``
      case 'pre': return `\`\`\`\n${inner}\n\`\`\`\n\n`
      case 'blockquote':
        return inner.trim().split('\n').map(l => `> ${l}`).join('\n') + '\n\n'
      case 'ul': return inner + '\n'
      case 'ol': return inner + '\n'
      case 'li': return `- ${inner.trim()}\n`
      case 'br': return '\n'
      case 'hr': return '---\n\n'
      case 'a':  return `[${inner}](${el.getAttribute('href') ?? ''})`
      default:   return inner
    }
  }

  return walk(parsed.body).replace(/\n{3,}/g, '\n\n').trim()
}

function htmlToText(html: string): string {
  if (typeof document === 'undefined') return html
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent ?? div.innerHTML).trim()
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const TYPE_LABELS: Record<DocumentType, string> = {
  prd: 'PRD',
  'user-story': 'User Story',
  research: 'Research',
  roadmap: 'Roadmap',
  general: 'Note',
}

const TYPE_COLORS: Record<DocumentType, { bg: string; text: string }> = {
  prd:          { bg: 'rgb(var(--brand) / 0.15)', text: 'rgb(var(--brand-soft))' },
  'user-story': { bg: 'rgb(var(--green) / 0.12)',  text: 'rgb(var(--green-soft))' },
  research:     { bg: 'rgb(var(--amber) / 0.12)', text: 'rgb(var(--amber-soft))' },
  roadmap:      { bg: 'rgb(var(--blue) / 0.12)', text: 'rgb(var(--blue-soft))' },
  general:      { bg: 'rgb(var(--n8) / 0.12)',text: 'rgb(var(--n9))' },
}

export default function EditorPanel({ onOpenPalette }: { onOpenPalette: () => void }) {
  const {
    documents, activeDocId, updateDocument, saveStatus, fileNodes,
    addDocumentFile, setActiveDoc, activeFolderId,
  } = useWorkspaceStore()
  const doc = documents.find((d) => d.id === activeDocId)

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue,   setTitleValue]   = useState('')
  const [exportOpen,   setExportOpen]   = useState(false)
  const [copyDone,     setCopyDone]     = useState('')
  const [statusBusy,   setStatusBusy]   = useState(false)
  const [planResult,   setPlanResult]   = useState<AutoPlanResult | null>(null)
  const titleRef  = useRef<HTMLInputElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!exportOpen) return
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [exportOpen])

  async function copyText(text: string, label: string) {
    await navigator.clipboard.writeText(text)
    setCopyDone(label)
    setTimeout(() => setCopyDone(''), 1800)
    setExportOpen(false)
  }

  useEffect(() => {
    if (doc) setTitleValue(doc.title)
  }, [doc?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const commitTitle = () => {
    if (doc && titleValue.trim()) {
      updateDocument(doc.id, { title: titleValue.trim() })
    }
    setEditingTitle(false)
  }

  if (!doc) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'rgb(var(--n0))' }}>
        <div className="text-center max-w-xs space-y-3">
          <FileText size={22} className="mx-auto" style={{ color: 'rgb(var(--n8))' }} aria-hidden />
          <h2 className="font-serif text-[28px] font-semibold leading-tight tracking-[-0.015em]" style={{ color: 'rgb(var(--n12))' }}>
            No document open
          </h2>
          <p className="text-sm" style={{ color: 'rgb(var(--n9))' }}>Pick one from the sidebar, or start a new one.</p>
          <button
            // Same as ⌘N: a new note in the current folder
            onClick={() => setActiveDoc(addDocumentFile('general', 'Untitled Note', activeFolderId))}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-brand text-on-brand hover:bg-brand-strong transition-colors"
          >
            <Plus size={14} aria-hidden /> New document
          </button>
        </div>
      </div>
    )
  }

  // The folder this document sits in, for the breadcrumb
  const parentId   = fileNodes.find((n) => n.id === doc.id)?.parentId
  const folderName = parentId ? fileNodes.find((n) => n.id === parentId)?.name : undefined

  const typeStyle = TYPE_COLORS[doc.type]
  const savedAt   = format(new Date(doc.updatedAt), 'h:mm a')
  const isFinal   = doc.status === 'final'

  /* Draft ⇄ Final. Becoming final runs auto-plan on the server when it's on. */
  async function toggleFinal() {
    if (!doc) return
    const status = isFinal ? 'draft' : 'final'
    setStatusBusy(true)
    try {
      const res = await fetch(`/api/documents/${doc.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error(await apiError(res))
      const data = await res.json() as { autoPlan: AutoPlanResult | null; error?: string }
      updateDocument(doc.id, { status })
      if (data.error) toast.error(data.error)
      else if (data.autoPlan) { await refreshTasks(); setPlanResult(data.autoPlan) }
      else toast.success(status === 'final' ? 'Marked final' : 'Back to draft')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change the status')
    } finally {
      setStatusBusy(false)
    }
  }

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden" style={{ background: 'rgb(var(--n0))' }}>
      {/* Top bar — a translucent layer the document scrolls underneath */}
      <div className="material-bar absolute inset-x-0 top-0 z-30 flex items-center gap-3 px-6 py-3">
        {/* Breadcrumb: folder › title */}
        {folderName && (
          <>
            <span className="text-[13px] truncate max-w-[160px] flex-shrink-0" style={{ color: 'rgb(var(--n8))' }}>{folderName}</span>
            <ChevronRight size={13} className="flex-shrink-0 -mx-1.5" style={{ color: 'rgb(var(--n8))' }} aria-hidden />
          </>
        )}

        {/* Title */}
        {editingTitle ? (
          <input
            ref={titleRef}
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') commitTitle() }}
            autoFocus
            className="flex-1 min-w-0 bg-transparent text-sm font-semibold outline-none border-b"
            style={{ color: 'rgb(var(--n12))', borderColor: 'rgb(var(--brand))' }}
          />
        ) : (
          <h1
            className="flex-1 min-w-0 text-sm font-semibold truncate cursor-text"
            style={{ color: 'rgb(var(--n12))' }}
            onClick={() => { setTitleValue(doc.title); setEditingTitle(true) }}
            title="Click to edit"
          >
            {doc.title}
          </h1>
        )}

        {/* Type badge */}
        <span
          className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider flex-shrink-0"
          style={{ background: typeStyle.bg, color: typeStyle.text }}
        >
          {TYPE_LABELS[doc.type]}
        </span>

        {/* Draft / Final (PRDs only); marking final can run auto-plan */}
        {doc.type === 'prd' && (
          <button
            onClick={toggleFinal}
            disabled={statusBusy}
            aria-pressed={isFinal}
            title={isFinal ? 'Final. Click to move back to draft' : 'Mark this PRD as final'}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex-shrink-0 disabled:opacity-50 ${
              isFinal ? 'bg-success/15 text-success-fg hover:bg-success/25' : 'border border-n7 text-n9 hover:text-n12 hover:bg-overlay/5'
            }`}
          >
            {isFinal && <CheckCircle2 size={12} aria-hidden />}
            {statusBusy ? (isFinal ? 'Reopening…' : 'Planning…') : isFinal ? 'Final' : 'Mark final'}
          </button>
        )}

        {/* Save indicator */}
        <div className="flex items-center gap-1 flex-shrink-0 min-w-[80px]">
          {saveStatus === 'saving' ? (
            <span className="text-[10px]" style={{ color: 'rgb(var(--brand-fg))' }}>Saving…</span>
          ) : saveStatus === 'saved' ? (
            <span className="text-[10px]" style={{ color: 'rgb(var(--green-fg))' }}>Saved {savedAt}</span>
          ) : (
            <span className="text-[10px]" style={{ color: 'rgb(var(--n8))' }}>Saved {savedAt}</span>
          )}
        </div>

        {/* Command palette hint */}
        <button
          onClick={onOpenPalette}
          title="Search and AI workflows (⌘K)"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors border bg-n3 border-n6 text-n8 hover:text-n11 hover:border-n7 flex-shrink-0"
        >
          <Search size={12} aria-hidden />
          <span>Search</span>
          <kbd className="text-[10px] px-1 rounded font-sans" style={{ background: 'rgb(var(--n5))', color: 'rgb(var(--n9))' }}>⌘K</kbd>
        </button>

        {/* Export */}
        <div ref={exportRef} className="relative flex-shrink-0">
          <button
            onClick={() => setExportOpen(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border bg-n4 border-n6 hover:bg-n5 ${copyDone ? 'text-success-fg' : 'text-n10'}`}
          >
            {copyDone ? copyDone : 'Export'}
            <ChevronDown size={11} className={`transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
          {exportOpen && (
            <m.div
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={springs.ui}
              className="absolute right-0 top-full mt-1 w-48 rounded-lg py-1 z-50 origin-top-right"
              style={{ background: 'rgb(var(--n4))', border: '1px solid rgb(var(--n6))', boxShadow: 'var(--elev-md)' }}
            >
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--n8))' }}>Copy</p>
              <button
                onClick={() => copyText(htmlToMarkdown(doc.content), 'Copied!')}
                className="press-tint flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors text-left text-n10 hover:bg-n5 hover:text-n12"
              >
                <Copy size={12} style={{ color: 'rgb(var(--n8))' }} />
                Copy as Markdown
              </button>
              <button
                onClick={() => copyText(htmlToText(doc.content), 'Copied!')}
                className="press-tint flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors text-left text-n10 hover:bg-n5 hover:text-n12"
              >
                <Copy size={12} style={{ color: 'rgb(var(--n8))' }} />
                Copy as Plain Text
              </button>

              <div className="my-1" style={{ borderTop: '1px solid rgb(var(--n6))' }} />
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--n8))' }}>Download</p>
              <button
                onClick={() => {
                  downloadBlob(htmlToMarkdown(doc.content), `${doc.title}.md`, 'text/markdown')
                  setExportOpen(false)
                }}
                className="press-tint flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors text-left text-n10 hover:bg-n5 hover:text-n12"
              >
                <Download size={12} style={{ color: 'rgb(var(--n8))' }} />
                Download .md
              </button>
              <button
                onClick={() => {
                  downloadBlob(htmlToText(doc.content), `${doc.title}.txt`, 'text/plain')
                  setExportOpen(false)
                }}
                className="press-tint flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors text-left text-n10 hover:bg-n5 hover:text-n12"
              >
                <Download size={12} style={{ color: 'rgb(var(--n8))' }} />
                Download .txt
              </button>
            </m.div>
          )}
          </AnimatePresence>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Editor docId={doc.id} header={doc.type === 'prd' ? <DeliverySection docId={doc.id} /> : null} />
        <AutoPlanSummary result={planResult} onClose={() => setPlanResult(null)} />
      </div>
    </div>
  )
}
