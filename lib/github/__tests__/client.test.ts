import { createVerify } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { appJwt, GitHubError, installationToken, listInstallationRepos, toGitHubError } from '@/lib/github/client'
import { fakeFetch, json, keys, testConfig } from './helpers'

describe('appJwt', () => {
  it('is signed with the app private key and expires within 10 minutes', () => {
    const now = Date.UTC(2026, 0, 1)
    const [header, payload, signature] = appJwt(testConfig, now).split('.')

    const valid = createVerify('RSA-SHA256').update(`${header}.${payload}`)
      .verify(keys.publicKey, Buffer.from(signature, 'base64url'))
    expect(valid).toBe(true)

    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString())
    expect(claims.iss).toBe('12345')
    expect(claims.exp - claims.iat).toBeLessThanOrEqual(600)
  })
})

describe('toGitHubError', () => {
  it('explains an exhausted rate limit with the reset time', async () => {
    const res = json({ message: 'API rate limit exceeded' }, {
      status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1767225600' },
    })
    const err = await toGitHubError(res)
    expect(err.status).toBe(429)
    expect(err.message).toMatch(/rate limit was reached/)
  })

  it('maps 401 and 404 to readable messages', async () => {
    expect((await toGitHubError(json({}, { status: 401 }))).message).toMatch(/credentials/)
    expect((await toGitHubError(json({}, { status: 404 }))).message).toMatch(/Not found/)
  })
})

describe('installationToken', () => {
  it('asks GitHub once and reuses the token until it nears expiry', async () => {
    const { httpFetch, calls } = fakeFetch({
      '/app/installations/7/access_tokens': () =>
        json({ token: 'ghs_abc', expires_at: new Date(Date.now() + 3600_000).toISOString() }),
    })
    expect(await installationToken(httpFetch, testConfig, 7)).toBe('ghs_abc')
    expect(await installationToken(httpFetch, testConfig, 7)).toBe('ghs_abc')
    expect(calls).toHaveLength(1)
    expect(calls[0].init?.method).toBe('POST')
  })
})

describe('listInstallationRepos', () => {
  it('follows pages until a short page', async () => {
    const page = (n: number, count: number) =>
      Array.from({ length: count }, (_, i) => ({ id: n * 1000 + i, full_name: `acme/repo-${n}-${i}`, private: false }))
    const { httpFetch } = fakeFetch({
      '/app/installations/8/access_tokens': () => json({ token: 't', expires_at: new Date(Date.now() + 3600_000).toISOString() }),
      '/installation/repositories?per_page=100&page=1': () => json({ repositories: page(1, 100) }),
      '/installation/repositories?per_page=100&page=2': () => json({ repositories: page(2, 3) }),
    })
    const repos = await listInstallationRepos(httpFetch, testConfig, 8)
    expect(repos).toHaveLength(103)
  })

  it('surfaces GitHub errors as GitHubError', async () => {
    const { httpFetch } = fakeFetch({})
    await expect(listInstallationRepos(httpFetch, testConfig, 9)).rejects.toBeInstanceOf(GitHubError)
  })
})
