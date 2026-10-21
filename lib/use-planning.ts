'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiError, refreshTasks } from '@/lib/use-tasks'

export interface PlanningState {
  autoPlan: boolean
  members: { id: string; name: string; capacity: number; load: number }[]
  activeSprint: { id: string; name: string; startDate: string; endDate: string } | null
}

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await apiError(res))
  return res.json()
}

/** Team, sprint and auto-plan settings, with the actions that change them */
export function usePlanning() {
  const [state, setState] = useState<PlanningState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setState(await send('/api/planning', 'GET'))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load planning settings.')
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  // Every change reloads planning; sprint and team changes also move tasks
  const act = useCallback(async (url: string, method: string, body?: unknown) => {
    await send(url, method, body)
    await Promise.all([reload(), refreshTasks()])
  }, [reload])

  return {
    state, error, reload,
    setAutoPlan:    (autoPlan: boolean) => act('/api/planning', 'PATCH', { autoPlan }),
    addMember:      (name: string, capacity: number) => act('/api/members', 'POST', { name, capacity }),
    updateMember:   (id: string, capacity: number) => act(`/api/members/${id}`, 'PATCH', { capacity }),
    removeMember:   (id: string) => act(`/api/members/${id}`, 'DELETE'),
    startSprint:    (name: string, startDate: string, endDate: string) => act('/api/sprints', 'POST', { name, startDate, endDate }),
    completeSprint: (id: string) => act(`/api/sprints/${id}`, 'PATCH', { status: 'completed' }),
  }
}
