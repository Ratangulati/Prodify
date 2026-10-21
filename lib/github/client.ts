import { createSign } from 'node:crypto'

/** fetch, passed in so tests can hand in a fake (same idea as Prodly's export) */
export type HttpFetch = typeof fetch

export interface GitHubAppConfig {
  appId: string
  /** The app's URL name: github.com/apps/<slug> */
  slug: string
  privateKey: string
}

/** An error whose message is safe to show in the UI */
export class GitHubError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'GitHubError'
  }
}

/** Reads the GitHub App settings from the environment; null if any are missing */
export function githubAppConfig(): GitHubAppConfig | null {
  const appId      = process.env.GITHUB_APP_ID?.trim()
  const slug       = process.env.GITHUB_APP_SLUG?.trim()
  // .env files can't hold real newlines easily, so "\n" is accepted too
  const privateKey = process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n').trim()
  if (!appId || !slug || !privateKey) return null
  return { appId, slug, privateKey }
}

/**
 * A JSON Web Token that proves "I am this GitHub App". GitHub accepts it for
 * at most 10 minutes; we ask for 9 and backdate by 60s for clock drift.
 */
export function appJwt(config: GitHubAppConfig, now = Date.now()) {
  const seconds = Math.floor(now / 1000)
  const header  = { alg: 'RS256', typ: 'JWT' }
  const payload = { iat: seconds - 60, exp: seconds + 540, iss: config.appId }
  const encode  = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url')
  const unsigned = `${encode(header)}.${encode(payload)}`
  const signature = createSign('RSA-SHA256').update(unsigned).sign(config.privateKey).toString('base64url')
  return `${unsigned}.${signature}`
}

/** Turns a failed GitHub response into a clear, user-facing error */
export async function toGitHubError(res: Response): Promise<GitHubError> {
  const remaining = res.headers.get('x-ratelimit-remaining')
  const reset     = Number(res.headers.get('x-ratelimit-reset'))
  if ((res.status === 403 || res.status === 429) && remaining === '0') {
    const at = reset ? new Date(reset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'a few minutes'
    return new GitHubError(`GitHub's rate limit was reached. Try again after ${at}.`, 429)
  }
  if (res.status === 429 || res.headers.get('retry-after')) {
    return new GitHubError('GitHub is limiting requests right now. Wait a minute and try again.', 429)
  }
  const detail = await res.json().catch(() => null) as { message?: string } | null
  const message =
      res.status === 401 ? 'GitHub rejected Prodify\'s credentials. Check GITHUB_APP_ID and GITHUB_PRIVATE_KEY.'
    : res.status === 403 ? 'The GitHub App isn\'t allowed to do this. Check its repository access and permissions.'
    : res.status === 404 ? 'Not found on GitHub, or the GitHub App can\'t see it.'
    : detail?.message ? `GitHub said: ${detail.message}`
    : `GitHub returned an error (${res.status}).`
  return new GitHubError(message, res.status)
}

/** One call to the GitHub REST API with either an app JWT or an installation token */
export async function githubRequest<T>(
  httpFetch: HttpFetch,
  path: string,
  bearer: string,
  init: RequestInit = {},
): Promise<T> {
  let res: Response
  try {
    res = await httpFetch(`https://api.github.com${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${bearer}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Prodify',
        ...init.headers,
      },
    })
  } catch {
    throw new GitHubError('Could not reach GitHub. Check your internet connection.', 503)
  }
  if (!res.ok) throw await toGitHubError(res)
  return res.json() as Promise<T>
}

/* ── Installation tokens ──────────────────────────────────────────── */

// Installation tokens last an hour; keep each until 5 minutes before expiry
const tokenCache = new Map<number, { token: string; expiresAt: number }>()

export async function installationToken(httpFetch: HttpFetch, config: GitHubAppConfig, installationId: number) {
  const cached = tokenCache.get(installationId)
  if (cached && cached.expiresAt - Date.now() > 5 * 60_000) return cached.token

  const data = await githubRequest<{ token: string; expires_at: string }>(
    httpFetch, `/app/installations/${installationId}/access_tokens`, appJwt(config), { method: 'POST' },
  )
  tokenCache.set(installationId, { token: data.token, expiresAt: new Date(data.expires_at).getTime() })
  return data.token
}

/* ── The few GitHub calls Prodify makes ───────────────────────────── */

export interface GitHubInstallation {
  id: number
  account: { login: string } | null
}

/** Confirms an installation exists and belongs to our app (only our JWT can read it) */
export function getInstallation(httpFetch: HttpFetch, config: GitHubAppConfig, installationId: number) {
  return githubRequest<GitHubInstallation>(httpFetch, `/app/installations/${installationId}`, appJwt(config))
}

export interface GitHubRepoSummary {
  id: number
  full_name: string
  private: boolean
}

/** Every repository the installation was given access to (100 per page) */
export async function listInstallationRepos(httpFetch: HttpFetch, config: GitHubAppConfig, installationId: number) {
  const token = await installationToken(httpFetch, config, installationId)
  const repos: GitHubRepoSummary[] = []
  for (let page = 1; ; page++) {
    const data = await githubRequest<{ repositories: GitHubRepoSummary[] }>(
      httpFetch, `/installation/repositories?per_page=100&page=${page}`, token,
    )
    repos.push(...data.repositories)
    if (data.repositories.length < 100) return repos
  }
}
