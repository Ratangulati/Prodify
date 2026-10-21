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

## Project structure

```
app/
  api/ai/route.ts        Gemini streaming endpoint
  api/db/*               REST routes per table (documents, features, filenodes, insights, messages)
  page.tsx, layout.tsx
components/
  AppShell.tsx           Three-panel layout + global shortcuts
  editor/                EditorPanel (title, export) and Editor (Tiptap)
  sidebar/               FileExplorer, AIChatPanel (workflows, diff), Research and Data panels
  roadmap/, prioritization/, modals/, ui/
lib/
  ai.ts                  Gemini client, model fallback, error messages (server only)
  ai-client.ts           Browser-side AI error helpers
  prompts.ts             System prompt per workflow
  store.ts               Zustand store; updates the UI first, then syncs to the API
  prisma.ts              Prisma client singleton
  types.ts
prisma/
  schema.prisma, seed.ts, migrations/
```

---

## Deploying to Vercel

1. Import the repo in Vercel (framework: Next.js).
2. Add `GEMINI_API_KEY`, `DATABASE_URL` and `DIRECT_URL` in Project Settings → Environment Variables.
3. Run `npm run db:migrate` once against the production database.

The build runs `prisma generate && next build`.
