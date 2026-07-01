# Signal Desk

AI outbound pipeline + analyst triage practice project. Ingest Apollo-style leads, score with reviewable reasoning, approve outreach, chat with citations.

**Live demo:** https://marketmadi.github.io/ai-sales-agent/

## Sample data

Realistic Apollo export CSV: [`data/sample/apollo_export.csv`](data/sample/apollo_export.csv) — 26 contacts across 14 companies (ICP fits, dupes, disqualifiers).

Download from the Dashboard in the app, or ingest via **Ingest Apollo CSV**.

## Modes

| Mode | Command | Backend needed? |
|------|---------|-----------------|
| **Local full stack** | backend + `npm run dev` | Yes (Postgres + FastAPI) |
| **GitHub Pages demo** | `npm run build:pages` | No — client-side demo store |

## Quick start (local full stack)

### 1. Postgres

```bash
docker compose up -d
```

### 2. Backend

```bash
cd /home/dave/ai-sales-agent
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp .env.example .env
# Optional: set ANTHROPIC_API_KEY for live Claude calls
# Without a key, MOCK_LLM=true behavior is automatic when key is empty
export PYTHONPATH=.
python scripts/seed.py
uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev   # kills anything on :3000 first, then starts on :3000
```

Or from repo root: `bash scripts/dev-frontend.sh`

Open http://localhost:3000 (not 3001 — if you see 3001 in the terminal, an old server was still on 3000).

### 4. Demo flow

1. **Dashboard** → click **Ingest Sample CSV**
2. **Review** → inspect LLM reasoning → edit draft → **Approve**
3. **Audit Log** → see `draft_approved` event
4. **Chat** → ask "Why did Acme score high?" → see cited answer → mark useful/not useful

Or run the API demo script: `./scripts/demo.sh`

## GitHub Pages

Pushes to `main` auto-deploy via GitHub Actions. The live site runs in **demo mode** (browser-only, pre-seeded from `apollo_export.csv`).

Local pages build:

```bash
node scripts/generate-demo-state.mjs
cd frontend && npm run build:pages
# static files in frontend/out
```

## Loom script

See [LOOM_SCRIPT.md](./LOOM_SCRIPT.md) for a 5-minute recording outline.

**REWORK Digital application:** see [REWORK_SUBMISSION.md](./REWORK_SUBMISSION.md) and [LOOM_SCRIPT_REWORK.md](./LOOM_SCRIPT_REWORK.md).

## Config (no redeploy needed)

| Path | Purpose |
|------|---------|
| `config/icp.yaml` | Sales ICP scoring rubric |
| `config/thesis_cards/*.yaml` | Per-company thesis / ICP cards |
| `config/prompts/*.txt` | LLM prompts |

## API highlights (local full stack)

| Endpoint | Description |
|----------|-------------|
| `POST /ingest/csv` | Import sample leads, dedupe, score (admin) |
| `POST /ingest/rss` | Ingest RSS feed as signals (admin) |
| `GET /review/pending` | Pending outreach drafts |
| `POST /review/{id}/approve` | Approve + audit log (+ optional Slack) |
| `POST /chat` | Intent-routed Q&A with citations |
| `POST /feedback` | Useful / not useful loop |
| `GET /dashboard` | Pipeline counts |

Admin routes require header: `X-Admin-Secret: dev-secret`

## Stack

- Python 3.11 + FastAPI + SQLAlchemy + Postgres
- Next.js 15 (App Router)
- Claude API (optional; mock mode when no key)

## Environment

```bash
DATABASE_URL=postgresql://signaldesk:signaldesk@localhost:5433/signaldesk
ANTHROPIC_API_KEY=           # optional
OPENAI_API_KEY=              # optional — model compare
GOOGLE_API_KEY=              # optional — model compare
DEEPSEEK_API_KEY=            # optional — model compare (cheap: platform.deepseek.com)
MOCK_LLM=false               # auto-mocks when API key empty
SLACK_WEBHOOK_URL=           # optional, fires on approve
ADMIN_SECRET=dev-secret
```
