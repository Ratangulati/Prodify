'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'
import { springs } from '@/lib/motion'
import { useWorkspaceStore } from '@/lib/store'
import LeftSidebar from './sidebar/LeftSidebar'
import EditorPanel from './editor/EditorPanel'
import RightPanel from './sidebar/RightPanel'
import ToastContainer from './ui/Toast'
import CommandPalette from './modals/CommandPalette'
import KeyboardShortcuts from './modals/KeyboardShortcuts'
import GitHubSettings from './modals/GitHubSettings'
import { toast } from '@/lib/toast'
import { applyTheme, currentTheme } from '@/lib/theme'
import WelcomeScreen from './onboarding/WelcomeScreen'

export default function AppShell() {
  const {
    documents, theme, setTheme,
    addDocumentFile, setActiveDoc, setActiveSidebarTab,
    activeSidebarTab, activeFolderId, loadWorkspace, isLoading,
  } = useWorkspaceStore()

  useEffect(() => { loadWorkspace() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false)
  const [shortcutsOpen,  setShortcutsOpen]  = useState(false)
  const [githubOpen,     setGithubOpen]     = useState(false)
  const router = useRouter()

  /* ── Coming back from GitHub's install page (?github=…) ─────────── */
  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get('github')
    if (!result) return
    // Through Next's router: a plain history.replaceState gets overwritten by it
    router.replace(window.location.pathname, { scroll: false })
    const messages: Record<string, () => void> = {
      'connected':      () => toast.success('GitHub connected. Pick the repositories to track.'),
      'taken':          () => toast.error('That GitHub installation is already linked to another workspace.'),
      'rate-limited':   () => toast.error('GitHub is rate limiting requests. Try connecting again in a few minutes.'),
      'not-configured': () => toast.error('The GitHub App is not configured on the server.'),
    }
    ;(messages[result] ?? (() => toast.error('Could not connect GitHub. Please try again.')))()
    setGithubOpen(true)
  }, [router])

  /* ── Theme ───────────────────────────────────────────────────────
     The page's theme is set before paint by themeInitScript (layout.tsx);
     the store just mirrors it so the toggle shows the right icon. */
  useEffect(() => { setTheme(currentTheme()) }, [setTheme])

  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  /* ── Global keyboard shortcuts ───────────────────────────────── */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName

      // CMD+K → command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdPaletteOpen(true)
        return
      }
      // CMD+N → new general note (always creates a FileNode so it appears in the tree)
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        const id = addDocumentFile('general', 'Untitled Note', activeFolderId)
        setActiveDoc(id)
        return
      }
      // CMD+/ → cycle AI sidebar tabs
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        const tabs = ['chat', 'tasks', 'roadmap', 'prioritize', 'research', 'data']
        const idx  = tabs.indexOf(activeSidebarTab)
        setActiveSidebarTab(tabs[(idx + 1) % tabs.length])
        return
      }
      // ? → keyboard shortcuts (not when in input/textarea/contenteditable)
      if (
        e.key === '?' &&
        tag !== 'INPUT' && tag !== 'TEXTAREA' &&
        !(e.target as HTMLElement).isContentEditable &&
        !e.metaKey && !e.ctrlKey
      ) {
        setShortcutsOpen(true)
        return
      }
      // Esc → close modals
      if (e.key === 'Escape') {
        setCmdPaletteOpen(false)
        setShortcutsOpen(false)
        setGithubOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeSidebarTab, activeFolderId, addDocumentFile, setActiveDoc, setActiveSidebarTab])

  const noDocuments = documents.length === 0

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'rgb(var(--n0))' }}>
        <div className="text-center space-y-3">
          <div className="animate-spin inline-block w-5 h-5 border-2 border-brand border-t-transparent rounded-full" />
          <p className="text-xs" style={{ color: 'rgb(var(--n8))' }}>Loading workspace…</p>
        </div>
      </div>
    )
  }

  return (
    // reducedMotion="user": with Reduce Motion on, transforms are skipped and only opacity animates
    <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user" transition={springs.ui}>
      <div
        className="h-screen overflow-hidden"
        style={{ background: 'rgb(var(--n0))', minWidth: 1024 }}
      >
        <PanelGroup direction="horizontal" className="h-full">
          {/* Left sidebar */}
          <Panel defaultSize={18} minSize={12} maxSize={30}>
            <LeftSidebar
              onToggleTheme={toggleTheme}
              onOpenGitHub={() => setGithubOpen(true)}
              onOpenShortcuts={() => setShortcutsOpen(true)}
              theme={theme}
            />
          </Panel>

          <PanelResizeHandle className="group w-px relative" style={{ background: 'rgb(var(--n6))' }}>
            <div className="absolute inset-y-0 -left-px -right-px group-hover:bg-brand/40 group-data-[resize-handle-active]:bg-brand transition-colors" />
          </PanelResizeHandle>

          {/* Center editor */}
          <Panel minSize={30}>
            <div className="flex flex-col h-full overflow-hidden">
              {noDocuments ? <WelcomeScreen /> : <EditorPanel onOpenPalette={() => setCmdPaletteOpen(true)} />}
            </div>
          </Panel>

          <PanelResizeHandle className="group w-px relative" style={{ background: 'rgb(var(--n6))' }}>
            <div className="absolute inset-y-0 -left-px -right-px group-hover:bg-brand/40 group-data-[resize-handle-active]:bg-brand transition-colors" />
          </PanelResizeHandle>

          {/* Right panel */}
          <Panel defaultSize={28} minSize={20} maxSize={45}>
            <RightPanel />
          </Panel>
        </PanelGroup>
      </div>

      {/* Overlays */}
      <CommandPalette    open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
      <KeyboardShortcuts open={shortcutsOpen}  onClose={() => setShortcutsOpen(false)} />
      <GitHubSettings    open={githubOpen}     onClose={() => setGithubOpen(false)} />
      <ToastContainer />
    </MotionConfig>
    </LazyMotion>
  )
}
