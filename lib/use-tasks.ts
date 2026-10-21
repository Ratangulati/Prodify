'use client'

import { useEffect } from 'react'
import { create } from 'zustand'
import type { TaskDto } from '@/lib/task-dto'
import type { TaskStatus } from '@/lib/tasks'

/** Reads the error message our API routes send back, with a fallback */
export async function apiError(res: Response) {
  const body = await res.json().catch(() => null)
  return typeof body?.error === 'string' ? body.error : `Request failed (${res.status})`
}

/*
 * Tasks live on the server (GitHub webhooks change them too), so they're
 * kept in this small store rather than the workspace store. The Tasks board
 * and a PRD's Delivery section share it, and while either is on screen it
 * refetches every 15s and whenever the window regains focus.
 */
interface TaskState {
  tasks: TaskDto[]
  loading: boolean
  error: string | null
}

const useTaskStore = create<TaskState>(() => ({ tasks: [], loading: true, error: null }))

export async function refreshTasks() {
  try {
    const res = await fetch('/api/tasks')
    if (!res.ok) throw new Error(await apiError(res))
    useTaskStore.setState({ tasks: await res.json(), loading: false, error: null })
  } catch (err) {
    useTaskStore.setState({ loading: false, error: err instanceof Error ? err.message : 'Could not load tasks.' })
  }
}

/** Replace one task in the store with the server's latest copy */
function putTask(task: TaskDto) {
  useTaskStore.setState(({ tasks }) => ({
    tasks: tasks.some((t) => t.id === task.id) ? tasks.map((t) => (t.id === task.id ? task : t)) : [task, ...tasks],
  }))
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

export async function createTask(title: string, docId: string | null): Promise<TaskDto> {
  const task: TaskDto = await send('/api/tasks', 'POST', { title, docId })
  putTask(task)
  return task
}

export async function updateTask(id: string, changes: { title?: string; status?: TaskStatus; docId?: string | null }) {
  putTask(await send(`/api/tasks/${id}`, 'PATCH', changes))
}

export async function deleteTask(id: string) {
  await send(`/api/tasks/${id}`, 'DELETE')
  useTaskStore.setState(({ tasks }) => ({ tasks: tasks.filter((t) => t.id !== id) }))
}

/** Reloads one task (with PRs) and returns its activity notes */
export async function loadTaskDetail(id: string) {
  const data: { task: TaskDto; activity: { id: string; message: string; createdAt: string }[] } =
    await send(`/api/tasks/${id}`, 'GET')
  putTask(data.task)
  return data.activity
}

export async function linkPullRequest(taskId: string, url: string) {
  await send(`/api/tasks/${taskId}/pull-requests`, 'POST', { url })
}

export async function unlinkPullRequest(taskId: string, linkId: string) {
  await send(`/api/tasks/${taskId}/pull-requests/${linkId}`, 'DELETE')
}

// Poll only while at least one component is using tasks
let users = 0
let timer: ReturnType<typeof setInterval> | undefined

function startPolling() {
  if (users++ > 0) return
  refreshTasks()
  timer = setInterval(refreshTasks, 15_000)
  window.addEventListener('focus', refreshTasks)
}

function stopPolling() {
  if (--users > 0) return
  clearInterval(timer)
  window.removeEventListener('focus', refreshTasks)
}

export function useTasks() {
  const state = useTaskStore()
  useEffect(() => {
    startPolling()
    return stopPolling
  }, [])
  return state
}
