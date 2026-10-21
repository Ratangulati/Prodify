'use client'

import { useCallback, useEffect, useState } from 'react'
import type { TaskDto } from '@/lib/task-dto'
import type { TaskStatus } from '@/lib/tasks'

/** Reads the error message our API routes send back, with a fallback */
export async function apiError(res: Response) {
  const body = await res.json().catch(() => null)
  return typeof body?.error === 'string' ? body.error : `Request failed (${res.status})`
}

/**
 * Tasks live on the server (GitHub webhooks change them too), so this hook
 * fetches them directly instead of going through the workspace store. It
 * refetches when the window regains focus and every 15s while mounted.
 */
export function useTasks() {
  const [tasks, setTasks]     = useState<TaskDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      if (!res.ok) throw new Error(await apiError(res))
      setTasks(await res.json())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load tasks.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 15_000)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [refresh])

  const createTask = useCallback(async (title: string, docId: string | null) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, docId }),
    })
    if (!res.ok) throw new Error(await apiError(res))
    const task: TaskDto = await res.json()
    setTasks((prev) => [task, ...prev])
    return task
  }, [])

  const updateTask = useCallback(async (id: string, changes: { title?: string; status?: TaskStatus; docId?: string | null }) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    })
    if (!res.ok) throw new Error(await apiError(res))
    const task: TaskDto = await res.json()
    setTasks((prev) => prev.map((t) => (t.id === id ? task : t)))
    return task
  }, [])

  const deleteTask = useCallback(async (id: string) => {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(await apiError(res))
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { tasks, loading, error, refresh, createTask, updateTask, deleteTask }
}
