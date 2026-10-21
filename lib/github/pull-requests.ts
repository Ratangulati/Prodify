/** The parts of GitHub's pull_request object Prodify uses */
export interface GitHubPullRequest {
  number: number
  title: string
  body: string | null
  html_url: string
  state: 'open' | 'closed'
  draft?: boolean
  merged?: boolean
  merged_at?: string | null
  updated_at: string
  user: { login: string } | null
  head: { ref: string }
}

export type PullRequestState = 'open' | 'draft' | 'merged' | 'closed'

/** GitHub's state + draft + merged flags folded into the four states we show */
export function pullRequestState(pr: GitHubPullRequest): PullRequestState {
  if (pr.merged || pr.merged_at) return 'merged'
  if (pr.state === 'closed') return 'closed'
  return pr.draft ? 'draft' : 'open'
}

/** The columns a PullRequestLink copies from GitHub */
export function linkFields(pr: GitHubPullRequest) {
  return {
    title:       pr.title,
    url:         pr.html_url,
    state:       pullRequestState(pr),
    author:      pr.user?.login ?? 'unknown',
    prUpdatedAt: new Date(pr.updated_at),
  }
}
