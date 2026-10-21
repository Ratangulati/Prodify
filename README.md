# Prodify

An AI-powered product management workspace. Write PRDs, plan roadmaps, prioritise features and synthesise research in one place, with an AI co-pilot (Google Gemini) that streams its answer and writes it directly into your documents.

---

## Features

**AI workflows** (system prompts in `lib/prompts.ts`)
- **PRD** — problem statement, success metrics, user stories, scope, requirements, open questions
- **User Stories** — Gherkin acceptance criteria, story points, dependencies, definition of done
- **Roadmap** — Now / Next / Later plan with sequencing rationale and dependencies
- **Prioritization** — RICE scoring, MoSCoW classification and trade-off analysis
- **Research** — turns interview notes and feedback into themes, quotes and opportunities
- **Data** — funnel analysis, anomalies, falsifiable hypotheses and experiment design
- **Free Chat** — general PM co-pilot with no fixed output format

**Editor**
- Rich text editing with Tiptap, auto-saved 2 seconds after you stop typing
- PRD, Stories, Roadmap and Research answers are written straight into a document
- **Diff** toggle on each AI answer shows which lines were added or removed
- Copy or download a document as Markdown or plain text

**Workspace**
- Folder tree in the left sidebar: create, rename and delete folders and documents
- Roadmap board, RICE / MoSCoW prioritisation panel, research insights and data panel
- Everything is saved to PostgreSQL through small REST routes

**Tasks and GitHub**
- Tasks tab: each task gets a key like `PROD-42` and a "copy branch name" button (`prod-42-add-csv-import`)
- Connect a GitHub App: pull requests whose branch, title or description mention a task key are linked automatically, or paste a PR URL on a task
- PR badges on tasks (open / draft / merged / closed), a PR list in the task detail, and a **Delivery** strip on each PRD ("6 of 9 tasks shipped")
- Optional automation (off by default): PR opened → task to Review, PR merged → Done, always noted in the task's activity

**Keyboard shortcuts**

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Command palette |
| `Cmd+N` | New note in the current folder |
| `Cmd+Enter` | Send AI message |
| `Cmd+/` | Cycle right panel tabs |
| `?` | Show all shortcuts |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Rich text | Tiptap |
| State | Zustand |
| Database | PostgreSQL (Neon) via Prisma 5 |
| AI | Google Gemini via `@google/genai`, streamed |
| Layout | react-resizable-panels |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/Ratangulati/Prodify.git
cd Prodify
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) |
| `DATABASE_URL` | Yes | Postgres connection string used by the app (Neon **pooled** URL) |
| `DIRECT_URL` | Yes | Postgres connection string used by Prisma migrations (Neon **direct** URL) |
| `GEMINI_MODELS` | No | Comma-separated models to try in order. Default: `gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash-lite` |
| `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET` | No | Only for pull-request linking. See [GitHub pull-request linking](#github-pull-request-linking) |

Use `.env` (not `.env.local`): the Prisma CLI only reads `.env`. Never commit it — it is in `.gitignore`.

### 3. Set up the database

```bash
npm run db:migrate   # prisma migrate deploy: creates the tables
npm run db:seed      # optional: demo documents, features and insights (run once, on an empty DB)
```

### 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Tests

```bash
npm test   # Vitest: task keys, GitHub signatures, key matching, webhooks, manual linking
```

GitHub is never called in tests: requests go through a fake `fetch`, and the
webhook tests use an in-memory stand-in for the database.

---

## How the AI works

```
AIChatPanel ──POST /api/ai──▶ route.ts ──▶ lib/ai.ts ──▶ Gemini
     ▲                          │  (system prompt from lib/prompts.ts)
     └──── streamed text ◀──────┘
```

1. You pick a workflow tab (PRD, Stories, …) and type a prompt.
2. `AIChatPanel` sends the prompt, the conversation history for that workflow and (for document workflows) the current document text to `/api/ai`.
3. `app/api/ai/route.ts` builds the system prompt for the workflow and calls `streamChat` in `lib/ai.ts`.
4. `lib/ai.ts` tries each Gemini model in order. A 429 / 500 / 503 gets one retry after 1 second, then the next model is tried. A bad key or bad request stops straight away.
5. The text is streamed back to the browser with a `ReadableStream` and shown as it arrives.
6. If anything fails, the route returns a JSON error (or an error marker mid-stream) and the chat shows a clear message instead of a broken answer.
7. For PRD, Stories, Roadmap and Research, the finished Markdown is converted to HTML and written into the matching document (a new one is created if the open document is a different type). Prioritization, Data and Free Chat answer in the chat only.

### Diff view

After an answer is written into a document, the chat shows a card with a **Diff** toggle. It compares the document before and after line by line using a longest-common-subsequence (LCS) diff, and colours added lines green and removed lines red. Documents over 400 lines skip the LCS step and show everything as removed then added, to keep it fast.

---

## GitHub pull-request linking

Tasks show the pull requests that deliver them, and each PRD shows how much has
shipped. Prodify uses a **GitHub App**: it only sees the repositories you pick,
webhooks are built in, and no long-lived token is stored. The server signs a
short-lived token with the app's private key and exchanges it for a one-hour
installation token whenever it needs to call GitHub.

### How PRs get linked

- **Automatically:** a PR whose branch name, title or description contains a
  task key (`prod-42-add-csv-import`, `PROD-42: add CSV import`, "Closes PROD-42")
  is linked to that task when GitHub sends the webhook.
- **Manually:** open a task and paste the PR's URL. Prodify checks with GitHub
  that the PR exists in a tracked repository.

A task counts as **shipped** when it's Done or one of its PRs is merged.

### 1. Create the GitHub App

GitHub → Settings → Developer settings → GitHub Apps → **New GitHub App**:

| Setting | Value |
|---|---|
| Homepage URL | Your app URL, e.g. `http://localhost:3000` |
| Setup URL | `<app URL>/api/github/setup` and tick **Redirect on update** |
| Webhook URL | `<public URL>/api/github/webhook` (for local use, the smee.io URL from step 3) |
| Webhook secret | A long random string: `openssl rand -hex 32` |
| Repository permissions | **Pull requests: Read-only** (Metadata: Read-only is added automatically) |
| Subscribe to events | **Pull request** (installation events are always sent) |
| Where can it be installed | Only on this account (or any account, for an organisation) |

After creating it, note the **App ID** and the app's URL name (the *slug*:
`github.com/apps/<slug>`), then **Generate a private key** (a `.pem` file).

### 2. Environment variables

Print the private key as one line, with `\n` for each line break:

```bash
awk 'NF {printf "%s\\n", $0}' prodify-yourname.private-key.pem
```

Then add to `.env` (paste that output inside the quotes):

```bash
GITHUB_APP_ID=123456
GITHUB_APP_SLUG=prodify-yourname
GITHUB_WEBHOOK_SECRET=the-secret-from-step-1
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\n"
```

Keep the key out of git (`.env` is ignored) and delete the downloaded `.pem` once it's in `.env`.
Then apply the new tables with `npm run db:migrate` and restart the app.

### 3. Receive webhooks locally

GitHub can't reach `localhost`, so forward webhooks with [smee.io](https://smee.io):

```bash
# 1. Open https://smee.io/new and copy the channel URL into the app's Webhook URL
# 2. Forward it to the dev server:
npx smee-client --url https://smee.io/<your-channel> --target http://localhost:3000/api/github/webhook
```

([ngrok](https://ngrok.com) works too: `ngrok http 3000`, then use
`https://<id>.ngrok-free.app/api/github/webhook` as the Webhook URL.)
To test duplicate handling, open the app's **Advanced** tab on GitHub and
click **Redeliver** on any delivery: the second copy is answered with
`{"status":"duplicate"}`.

### 4. Connect

In Prodify, click the GitHub icon in the left sidebar → **Connect GitHub**,
install the app on your repositories, and back in Prodify pick which
repositories to track. Optionally turn on **Move tasks automatically**.

### How the webhook stays safe

- Every delivery's `X-Hub-Signature-256` is checked against the raw body
  with the webhook secret (constant-time compare); anything else gets a 401.
- Each delivery id is stored in the same transaction as its changes: a
  repeated delivery is skipped, and a failed one rolls back so redelivering
  it (the app's **Advanced** tab) works. GitHub doesn't retry failed
  deliveries on its own. Events older than the stored PR data are ignored.
- A repository can be tracked by only one workspace, and the repository
  decides which workspace's tasks a webhook may touch.

### Limits worth knowing

- Prodify has no sign-in yet, so anyone who can open the app can change the
  GitHub settings. Only run it where that's acceptable.
- `WebhookDelivery` keeps every delivery id. Clear old ones occasionally:
  `DELETE FROM "WebhookDelivery" WHERE "receivedAt" < now() - interval '30 days';`
- GitHub API errors, including rate limits, are shown in the UI with when to retry.

---

## Project structure

```
app/
  api/ai/route.ts        Gemini streaming endpoint
  api/db/*               REST routes per table (documents, features, filenodes, insights, messages)
  api/tasks/*            Tasks, and linking/unlinking PRs on a task
  api/github/*           Install + setup flow, repos, settings, webhook
  page.tsx, layout.tsx
components/
  AppShell.tsx           Three-panel layout + global shortcuts
  editor/                EditorPanel (title, export) and Editor (Tiptap)
  sidebar/               FileExplorer, AIChatPanel (workflows, diff), Research and Data panels
  tasks/                 Tasks board, task detail, PR badge
  roadmap/, prioritization/, modals/, ui/
lib/
  ai.ts                  Gemini client, model fallback, error messages (server only)
  ai-client.ts           Browser-side AI error helpers
  prompts.ts             System prompt per workflow
  store.ts               Zustand store; updates the UI first, then syncs to the API
  prisma.ts              Prisma client singleton
  tasks.ts, task-dto.ts  Task keys, branch names, "shipped" rule
  use-tasks.ts           Browser store for tasks (polls while visible)
  github/                App auth + API client, signature check, key matching, webhook, manual linking
  types.ts
prisma/
  schema.prisma, seed.ts, migrations/
```

---

## Deploying to Vercel

1. Import the repo in Vercel (framework: Next.js).
2. Add `GEMINI_API_KEY`, `DATABASE_URL` and `DIRECT_URL` in Project Settings → Environment Variables
   (plus the four `GITHUB_*` variables if you use pull-request linking, with the app's Setup and
   Webhook URLs pointing at your Vercel domain).
3. Run `npm run db:migrate` once against the production database.

The build runs `prisma generate && next build`.
