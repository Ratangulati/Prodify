import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { githubAppConfig } from '@/lib/github/client'

export const dynamic = 'force-dynamic'

// GET /api/github/install — sends the browser to GitHub to install our app.
// The random `state` is also kept in a cookie; /api/github/setup checks they
// match, so only an install started from here can connect a workspace.
export function GET(req: NextRequest) {
  const config = githubAppConfig()
  if (!config) return NextResponse.redirect(new URL('/?github=not-configured', req.url))

  const state = randomBytes(16).toString('hex')
  const res = NextResponse.redirect(`https://github.com/apps/${config.slug}/installations/new?state=${state}`)
  res.cookies.set('github_install_state', state, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 600, path: '/',
  })
  return res
}
