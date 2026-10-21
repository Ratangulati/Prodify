import { generateKeyPairSync } from 'node:crypto'
import type { GitHubAppConfig, HttpFetch } from '@/lib/github/client'

export const keys = generateKeyPairSync('rsa', { modulusLength: 2048 })

export const testConfig: GitHubAppConfig = {
  appId: '12345',
  slug: 'prodify-test',
  privateKey: keys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
}

export function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' }, ...init })
}

/** A fake fetch that answers by URL path and records every call */
export function fakeFetch(routes: Record<string, (init?: RequestInit) => Response>) {
  const calls: { path: string; init?: RequestInit }[] = []
  const httpFetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url  = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const path = url.pathname + url.search
    calls.push({ path, init })
    const match = Object.keys(routes).find((p) => path === p || path.startsWith(p + '?'))
    if (!match) return json({ message: 'Not Found' }, { status: 404 })
    return routes[match](init)
  }) as HttpFetch
  return { httpFetch, calls }
}
