'use client'

import { useState, useRef } from 'react'
import { TrendingUp, AlertTriangle, Lightbulb, ArrowRight, BarChart2, LineChart, Loader2, Upload, RefreshCw, FileText } from 'lucide-react'
import { toast } from '@/lib/toast'
import {
  LineChart as ReLineChart,
  BarChart as ReBarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import Tip from '@/components/ui/Tip'
import { askAI } from '@/lib/ai-client'

/* ── Types ─────────────────────────────────────────────────────── */
type Confidence = 'high' | 'medium' | 'low'

interface DataInsight {
  id: string
  type: 'finding' | 'anomaly' | 'hypothesis' | 'next_step'
  text: string
  confidence: Confidence
  metric?: string
  delta?: string
}

interface ChartDataPoint {
  label: string
  [key: string]: string | number
}

interface AnalysisResult {
  summary: string
  insights: DataInsight[]
  chartType: 'line' | 'bar' | 'none'
  chartData: ChartDataPoint[]
  chartKeys: string[]
}

/* ── Helpers ────────────────────────────────────────────────────── */
function confidenceBadge(c: Confidence) {
  const map: Record<Confidence, { label: string; bg: string; color: string }> = {
    high:   { label: 'High',   bg: 'rgb(var(--green) / 0.12)',  color: 'rgb(var(--green-fg))' },
    medium: { label: 'Medium', bg: 'rgb(var(--yellow) / 0.12)',  color: 'rgb(var(--yellow-fg))' },
    low:    { label: 'Low',    bg: 'rgb(var(--red) / 0.12)',  color: 'rgb(var(--red-fg))' },
  }
  const s = map[c]
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

function insightIcon(type: DataInsight['type']) {
  const props = { size: 13, className: 'flex-shrink-0 mt-0.5' }
  switch (type) {
    case 'finding':    return <TrendingUp    {...props} style={{ color: 'rgb(var(--brand-fg))' }} />
    case 'anomaly':    return <AlertTriangle {...props} style={{ color: 'rgb(var(--amber))' }} />
    case 'hypothesis': return <Lightbulb     {...props} style={{ color: 'rgb(var(--emerald-fg))' }} />
    case 'next_step':  return <ArrowRight    {...props} style={{ color: 'rgb(var(--blue-fg))' }} />
  }
}

const TYPE_LABELS: Record<DataInsight['type'], string> = {
  finding:    'Finding',
  anomaly:    'Anomaly',
  hypothesis: 'Hypothesis',
  next_step:  'Next Step',
}

/* ── Extract JSON from streamed AI text ─────────────────────────── */
function extractJSON(text: string): AnalysisResult | null {
  try {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    const raw    = fenced ? fenced[1] : text.match(/(\{[\s\S]*\})/)?.[1]
    if (!raw) return null
    return JSON.parse(raw) as AnalysisResult
  } catch {
    return null
  }
}

const DATA_PROMPT = `You are a product analytics expert. Analyse the pasted metrics or CSV data and return ONLY valid JSON (no markdown, no explanation) in this exact shape:

{
  "summary": "2-3 sentence overview of the data",
  "insights": [
    {
      "id": "1",
      "type": "finding" | "anomaly" | "hypothesis" | "next_step",
      "text": "Insight text",
      "confidence": "high" | "medium" | "low",
      "metric": "optional metric name",
      "delta": "optional delta e.g. +12%"
    }
  ],
  "chartType": "line" | "bar" | "none",
  "chartData": [
    { "label": "Jan", "value": 1200 }
  ],
  "chartKeys": ["value"]
}

Rules:
- Produce 6–10 insights covering all four types (findings, anomalies, hypotheses, next steps)
- If data has a time dimension → chartType "line"; if categorical → "bar"; otherwise "none"
- chartData.label = x-axis label; other keys match chartKeys
- Confidence: high = clear signal, medium = probable, low = speculative
- Return ONLY the JSON object, nothing else`

/* ── InsightCard ────────────────────────────────────────────────── */
function InsightCard({ insight }: { insight: DataInsight }) {
  return (
    <div
      className="rounded-lg p-3 flex gap-2.5"
      style={{ background: 'rgb(var(--n5))', border: '1px solid rgb(var(--n6))' }}
    >
      {insightIcon(insight.type)}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--n8))' }}>
            {TYPE_LABELS[insight.type]}
          </span>
          {insight.metric && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgb(var(--n4))', color: 'rgb(var(--n9))' }}>
              {insight.metric}
            </span>
          )}
          {insight.delta && (
            <span
              className="text-[10px] font-semibold"
              style={{ color: insight.delta.startsWith('+') ? 'rgb(var(--green-fg))' : 'rgb(var(--red-fg))' }}
            >
              {insight.delta}
            </span>
          )}
          <span className="ml-auto">{confidenceBadge(insight.confidence)}</span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--n11))' }}>{insight.text}</p>
      </div>
    </div>
  )
}

/* ── Chart ──────────────────────────────────────────────────────── */
// Recharts writes these as SVG attributes, which can't read CSS variables.
// Values mirror --brand, --emerald-fg, --amber, --red-fg, --blue-fg and --n6 / --n8.
const CHART_COLORS = ['#6366f1', '#34d399', '#f59e0b', '#f87171', '#60a5fa']

function DataChart({ result }: { result: AnalysisResult }) {
  const [chartView, setChartView] = useState<'line' | 'bar'>(result.chartType === 'none' ? 'bar' : result.chartType)

  if (!result.chartData?.length || result.chartType === 'none') return null

  return (
    <div className="rounded-lg p-3" style={{ background: 'rgb(var(--n5))', border: '1px solid rgb(var(--n6))' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium" style={{ color: 'rgb(var(--n10))' }}>Chart Preview</p>
        <div className="flex gap-1">
          <Tip label="Line chart">
            <button
              onClick={() => setChartView('line')}
              className="p-1 rounded transition-colors"
              style={{ background: chartView === 'line' ? 'rgb(var(--brand) / 0.2)' : 'transparent', color: chartView === 'line' ? 'rgb(var(--brand-fg))' : 'rgb(var(--n8))' }}
              aria-label="Line chart"
              aria-pressed={chartView === 'line'}
            >
              <LineChart size={13} />
            </button>
          </Tip>
          <Tip label="Bar chart">
            <button
              onClick={() => setChartView('bar')}
              className="p-1 rounded transition-colors"
              style={{ background: chartView === 'bar' ? 'rgb(var(--brand) / 0.2)' : 'transparent', color: chartView === 'bar' ? 'rgb(var(--brand-fg))' : 'rgb(var(--n8))' }}
              aria-label="Bar chart"
              aria-pressed={chartView === 'bar'}
            >
              <BarChart2 size={13} />
            </button>
          </Tip>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        {chartView === 'line' ? (
          <ReLineChart data={result.chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="label" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'rgb(var(--n4))', border: '1px solid rgb(var(--n7))', borderRadius: 6, fontSize: 11 }}
              labelStyle={{ color: 'rgb(var(--n9))' }}
              itemStyle={{ color: 'rgb(var(--n11))' }}
            />
            <Legend wrapperStyle={{ fontSize: 10, color: 'rgb(var(--n8))' }} />
            {(result.chartKeys || ['value']).map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </ReLineChart>
        ) : (
          <ReBarChart data={result.chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'rgb(var(--n4))', border: '1px solid rgb(var(--n7))', borderRadius: 6, fontSize: 11 }}
              labelStyle={{ color: 'rgb(var(--n9))' }}
              itemStyle={{ color: 'rgb(var(--n11))' }}
            />
            <Legend wrapperStyle={{ fontSize: 10, color: 'rgb(var(--n8))' }} />
            {(result.chartKeys || ['value']).map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                radius={[3, 3, 0, 0]}
              />
            ))}
          </ReBarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

/* ── Filter bar ─────────────────────────────────────────────────── */
const FILTERS: { id: DataInsight['type'] | 'all'; label: string }[] = [
  { id: 'all',        label: 'All'         },
  { id: 'finding',    label: 'Findings'    },
  { id: 'anomaly',    label: 'Anomalies'   },
  { id: 'hypothesis', label: 'Hypotheses'  },
  { id: 'next_step',  label: 'Next Steps'  },
]

/* ── Main Component ─────────────────────────────────────────────── */
export default function DataPanel() {
  const [input, setInput]           = useState('')
  const [status, setStatus]         = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [streamText, setStreamText] = useState('')
  const [result, setResult]         = useState<AnalysisResult | null>(null)
  const [filter, setFilter]         = useState<DataInsight['type'] | 'all'>('all')
  const [isDragging, setIsDragging] = useState(false)
  const abortRef                    = useRef<AbortController | null>(null)
  const fileInputRef                = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    const isCSV = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel'
    if (!isCSV) {
      toast.error('Please upload a CSV file')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setInput(text)
      toast.success(`Loaded ${file.name} — ${text.split('\n').length} rows`)
    }
    reader.readAsText(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function analyse() {
    if (!input.trim() || status === 'loading') return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setStatus('loading')
    setErrorMsg('')
    setStreamText('')
    setResult(null)

    try {
      const full = await askAI(
        { workflow: 'data', userMessage: `${DATA_PROMPT}\n\nData to analyse:\n${input}` },
        { signal: ctrl.signal, onText: setStreamText },
      )

      const parsed = extractJSON(full)
      if (parsed) {
        setResult(parsed)
        setStatus('done')
        toast.success(`Analysis complete — ${parsed.insights.length} insights found`)
      } else {
        setErrorMsg('')   // the AI answered, but not in a shape we could read
        setStatus('error')
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setErrorMsg(err.message)
        setStatus('error')
      }
    }
  }

  function reset() {
    abortRef.current?.abort()
    setInput('')
    setStatus('idle')
    setStreamText('')
    setResult(null)
    setFilter('all')
  }

  const filteredInsights = result?.insights.filter(
    i => filter === 'all' || i.type === filter
  ) ?? []

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'rgb(var(--n3))' }}>

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b"
        style={{ borderColor: 'rgb(var(--n6))' }}
      >
        <div>
          <p className="text-xs font-semibold" style={{ color: 'rgb(var(--n11))' }}>Data Analysis</p>
          <p className="text-[10px]" style={{ color: 'rgb(var(--n8))' }}>Upload, paste, or drag CSV → AI interprets</p>
        </div>
        {result && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors hover:bg-overlay/5"
            style={{ color: 'rgb(var(--n8))' }}
          >
            <RefreshCw size={11} />
            Reset
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* Input */}
        {status !== 'done' && (
          <div className="flex flex-col gap-3">
            {/* CSV upload row */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileInput}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={status === 'loading'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-40 border bg-n5 border-n6 text-n10 enabled:hover:bg-n6"
              >
                <FileText size={12} />
                Upload CSV
              </button>
              <span className="text-[10px]" style={{ color: 'rgb(var(--n8))' }}>or paste data below</span>
            </div>

            <div
              className="relative"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragging && (
                <div
                  className="absolute inset-0 rounded-lg flex items-center justify-center z-10 pointer-events-none"
                  style={{ background: 'rgb(var(--brand) / 0.12)', border: '2px dashed rgb(var(--brand))' }}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <FileText size={20} style={{ color: 'rgb(var(--brand-fg))' }} />
                    <span className="text-xs font-medium" style={{ color: 'rgb(var(--brand-fg))' }}>Drop CSV file here</span>
                  </div>
                </div>
              )}
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Paste your metrics, CSV data, or funnel numbers here…\n\nExample:\nDate,DAU,Revenue,Churn\n2024-01,12000,48000,2.1%\n2024-02,13400,51200,1.8%\n…`}
                className="w-full rounded-lg text-xs leading-relaxed resize-none outline-none transition-colors"
                style={{
                  background: isDragging ? 'rgb(var(--brand) / 0.05)' : 'rgb(var(--n5))',
                  border: `1px solid ${isDragging ? 'rgb(var(--brand))' : 'rgb(var(--n6))'}`,
                  color: 'rgb(var(--n11))',
                  padding: '12px',
                  minHeight: 160,
                  fontFamily: 'monospace',
                }}
                disabled={status === 'loading'}
              />
              {input && (
                <span
                  className="absolute bottom-2 right-2 text-[10px]"
                  style={{ color: 'rgb(var(--n8))' }}
                >
                  {input.split('\n').length} lines
                </span>
              )}
            </div>

            <button
              onClick={analyse}
              disabled={!input.trim() || status === 'loading'}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
              style={{
                background: status === 'loading' ? 'rgb(var(--brand) / 0.2)' : 'rgb(var(--brand))',
                color: 'rgb(var(--on-brand))',
                cursor: !input.trim() || status === 'loading' ? 'not-allowed' : 'pointer',
              }}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Analysing…
                </>
              ) : (
                <>
                  <Upload size={13} />
                  Analyse Data
                </>
              )}
            </button>
          </div>
        )}

        {/* Streaming preview */}
        {status === 'loading' && streamText && (
          <div
            className="rounded-lg p-3 text-[10px] font-mono leading-relaxed max-h-32 overflow-y-auto"
            style={{ background: 'rgb(var(--n1))', color: 'rgb(var(--n8))', border: '1px solid rgb(var(--n4))' }}
          >
            {streamText.slice(-600)}
            <span className="animate-pulse">▌</span>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div
            className="rounded-lg p-3 text-xs"
            style={{ background: 'rgb(var(--red) / 0.08)', border: '1px solid rgb(var(--red) / 0.2)', color: 'rgb(var(--red-fg))' }}
          >
            {errorMsg || 'Analysis failed. Check that your data has clear column headers and try again.'}
          </div>
        )}

        {/* Results */}
        {result && status === 'done' && (
          <>
            {/* Summary */}
            <div
              className="rounded-lg p-3"
              style={{ background: 'rgb(var(--brand) / 0.08)', border: '1px solid rgb(var(--brand) / 0.15)' }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgb(var(--brand-fg))' }}>
                Summary
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--n11))' }}>{result.summary}</p>
            </div>

            {/* Chart */}
            <DataChart result={result} />

            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-2">
              {(['finding', 'anomaly', 'hypothesis', 'next_step'] as const).map(t => {
                const count = result.insights.filter(i => i.type === t).length
                return (
                  <div
                    key={t}
                    className="rounded-lg p-2 text-center cursor-pointer transition-colors"
                    style={{
                      background: filter === t ? 'rgb(var(--brand) / 0.15)' : 'rgb(var(--n5))',
                      border: `1px solid ${filter === t ? 'rgb(var(--brand) / 0.3)' : 'rgb(var(--n6))'}`,
                    }}
                    onClick={() => setFilter(filter === t ? 'all' : t)}
                  >
                    <p className="text-base font-bold" style={{ color: filter === t ? 'rgb(var(--brand-fg))' : 'rgb(var(--n11))' }}>{count}</p>
                    <p className="text-[10px] uppercase tracking-wide leading-tight" style={{ color: 'rgb(var(--n8))' }}>
                      {TYPE_LABELS[t].slice(0, 6)}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Filter pills */}
            <div className="flex gap-1.5 flex-wrap">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as DataInsight['type'] | 'all')}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors"
                  style={{
                    background: filter === f.id ? 'rgb(var(--brand) / 0.2)' : 'rgb(var(--n5))',
                    color: filter === f.id ? 'rgb(var(--brand-fg))' : 'rgb(var(--n8))',
                    border: `1px solid ${filter === f.id ? 'rgb(var(--brand) / 0.3)' : 'rgb(var(--n6))'}`,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Insight cards */}
            <div className="flex flex-col gap-2">
              {filteredInsights.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: 'rgb(var(--n8))' }}>
                  No {filter === 'all' ? 'insights' : TYPE_LABELS[filter as DataInsight['type']].toLowerCase()} found.
                </p>
              ) : (
                filteredInsights.map(insight => (
                  <InsightCard key={insight.id} insight={insight} />
                ))
              )}
            </div>

            {/* Re-analyse */}
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs transition-colors hover:bg-overlay/5"
              style={{ color: 'rgb(var(--n8))', border: '1px solid rgb(var(--n6))' }}
            >
              <RefreshCw size={11} />
              Analyse different data
            </button>
          </>
        )}
      </div>
    </div>
  )
}
