'use client'

import { useState } from 'react'
import {
  MessageSquare, Map, BarChart3, FlaskConical, TrendingUp, ListChecks,
  PanelRightClose, PanelRightOpen,
} from 'lucide-react'
import { m } from 'motion/react'
import { useWorkspaceStore } from '@/lib/store'
import { springs } from '@/lib/motion'
import AIChatPanel from './AIChatPanel'
import RoadmapBoard from '@/components/roadmap/RoadmapBoard'
import PrioritizationPanel from '@/components/prioritization/PrioritizationPanel'
import ResearchPanel from './ResearchPanel'
import DataPanel from './DataPanel'
import TasksBoard from '@/components/tasks/TasksBoard'

const TABS = [
  { id: 'chat',           label: 'Chat',       icon: <MessageSquare size={14} /> },
  { id: 'tasks',          label: 'Tasks',      icon: <ListChecks size={14} /> },
  { id: 'roadmap',        label: 'Roadmap',    icon: <Map size={14} /> },
  { id: 'prioritize',     label: 'Prioritize', icon: <BarChart3 size={14} /> },
  { id: 'research',       label: 'Research',   icon: <FlaskConical size={14} /> },
  { id: 'data',           label: 'Data',       icon: <TrendingUp size={14} /> },
] as const

type TabId = typeof TABS[number]['id']

/* ── Placeholder content per tab ──────────────────────────────── */
function TabPlaceholder({ tab }: { tab: TabId }) {
  const descriptions: Record<TabId, { title: string; body: string; icon: string }> = {
    tasks:      { icon: '☑', title: 'Tasks',           body: 'Engineering tasks with keys like PROD-1, linked to PRDs and pull requests.' },
    chat:       { icon: '✦', title: 'AI Chat',          body: 'Ask anything about your product, get PRDs written, stories generated, and strategies crafted.' },
    roadmap:    { icon: '🗺', title: 'Roadmap Board',    body: 'Drag and drop features across Now / Next / Later columns. Coming up next.' },
    prioritize: { icon: '⚖️', title: 'Prioritization',   body: 'RICE scoring, MoSCoW classification, and stack-ranked feature lists.' },
    research:   { icon: '🔬', title: 'Research Insights', body: 'Paste interview notes or survey data — AI surfaces themes and quotes automatically.' },
    data:       { icon: '📈', title: 'Data Analysis',    body: 'Drop in metrics and funnels for anomaly detection and hypothesis generation.' },
  }
  const d = descriptions[tab]
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 text-center gap-3 py-16">
      <div className="text-3xl">{d.icon}</div>
      <p className="text-sm font-semibold" style={{ color: 'rgb(var(--n11))' }}>{d.title}</p>
      <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--n8))' }}>{d.body}</p>
      <div
        className="mt-2 px-3 py-1.5 rounded-md text-xs font-medium"
        style={{ background: 'rgb(var(--brand) / 0.12)', color: 'rgb(var(--brand-fg))' }}
      >
        Coming soon
      </div>
    </div>
  )
}

export default function RightPanel() {
  const { activeSidebarTab, setActiveSidebarTab } = useWorkspaceStore()
  const [collapsed, setCollapsed] = useState(false)

  const VALID_TAB_IDS = TABS.map((t) => t.id)
  const activeTab: TabId = VALID_TAB_IDS.includes(activeSidebarTab as TabId)
    ? (activeSidebarTab as TabId)
    : 'chat'

  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center py-4 gap-4 border-l w-full h-full"
        style={{ background: 'rgb(var(--n3))', borderColor: 'rgb(var(--n6))' }}
      >
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded transition-colors hover:bg-overlay/5"
          style={{ color: 'rgb(var(--n8))' }}
          title="Expand panel"
        >
          <PanelRightOpen size={15} />
        </button>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveSidebarTab(tab.id); setCollapsed(false) }}
            className="p-1.5 rounded transition-colors"
            style={{ color: activeTab === tab.id ? 'rgb(var(--brand))' : 'rgb(var(--n8))' }}
            title={tab.label}
          >
            {tab.icon}
          </button>
        ))}
      </div>
    )
  }

  return (
    <aside
      className="flex flex-col w-full h-full border-l"
      style={{ background: 'rgb(var(--n3))', borderColor: 'rgb(var(--n6))' }}
    >
      {/* Tab bar */}
      <div
        className="flex items-center border-b flex-shrink-0 overflow-x-auto scrollbar-hide"
        style={{ borderColor: 'rgb(var(--n6))', background: 'rgb(var(--n2))' }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSidebarTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors relative flex-shrink-0 whitespace-nowrap"
              style={{ color: isActive ? 'rgb(var(--brand-soft))' : 'rgb(var(--n8))' }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: 'rgb(var(--brand))' }}
                />
              )}
            </button>
          )
        })}

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(true)}
          className="ml-auto mr-2 p-1.5 rounded transition-colors hover:bg-overlay/5"
          style={{ color: 'rgb(var(--n8))' }}
          title="Collapse panel"
        >
          <PanelRightClose size={14} />
        </button>
      </div>

      {/* Tab content */}
      <m.div
        key={activeTab}
        className="flex-1 overflow-hidden flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={springs.ui}
      >
        {activeTab === 'chat'       ? <AIChatPanel />          :
         activeTab === 'tasks'      ? <TasksBoard />           :
         activeTab === 'roadmap'    ? <RoadmapBoard />          :
         activeTab === 'prioritize' ? <PrioritizationPanel />   :
         activeTab === 'research'   ? <ResearchPanel />         :
         activeTab === 'data'       ? <DataPanel />             :
         <TabPlaceholder tab={activeTab} />}
      </m.div>
    </aside>
  )
}
