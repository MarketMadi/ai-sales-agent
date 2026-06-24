# Signal Desk — 5-Minute Loom Script

Use this script to record one demo reused across Jobs 01, 06, and 09 applications.

## Setup before recording

1. `docker compose up -d`
2. Backend running on :8000, frontend on :3000
3. Fresh DB: `python scripts/seed.py` OR use Dashboard ingest button
4. Browser tabs: Dashboard, Review, Chat, Audit Log

---

## 0:00–0:15 — Intro

> "My favorite color is [COLOR]. This is Signal Desk — a reusable framework I use for outbound pipeline and analyst triage. Same engine, different config files."

---

## 0:15–1:15 — Ingest + dedupe + score (Job 01 / 06)

**Screen:** Dashboard → click **Ingest Sample CSV**

> "I'm importing an Apollo-style CSV. Duplicates on email and domain get rejected — you can see dupes in the audit log. Each net-new company is scored against our ICP and thesis cards in plain YAML config."

**Screen:** Review queue — click Acme Corp

> "Every score stores full LLM reasoning — score, fit, disqualifiers, talking points. Nothing is a black box."

---

## 1:15–2:30 — Human approval + audit (Job 01 / 02)

**Screen:** Review panel — show reasoning, edit subject line, click **Approve**

> "Nothing sends without human approval. I can edit the draft before approving. Approval writes to the audit log — same pattern as an internal audit-log tool."

**Screen:** Audit Log tab

> "Every action is traceable: import, score, approve, feedback."

---

## 2:30–3:45 — Chat + citations + feedback (Job 06 / 09)

**Screen:** Chat → ask "Why did Acme score high?"

> "The chat layer classifies intent — company facts, recent signals, or thesis fit — and routes to the right data source. Answers include source citations. That's non-negotiable for analyst workflows."

Click **Yes** on feedback.

> "Feedback loops back into the system so filters improve over time."

---

## 3:45–4:30 — Architecture (all jobs)

**Screen:** VS Code — show `config/prompts/`, `config/icp.yaml`, `backend/`

> "Prompts and ICP live in config files, not buried in code. Stack is Python, FastAPI, Postgres, Next.js, Claude API — with mock mode for local dev. Integrations like Attio, Instantly, or Slack are webhook-ready on approve."

---

## 4:30–5:00 — Close + founder question

> "Hardest part is integration glue under real client config — not the LLM. I'd onboard a new client by scoping one vertical slice in 48 hours: ingest, score, approve, one CRM sync."

**Question for founder (Job 02 style):**

> "Who has deploy access and veto power on third-party dev shop PRs — you, or do I need their buy-in for standards to stick?"

---

## Pitch variants (same video)

| Job | Emphasize |
|-----|-----------|
| **01 Sales agent** | ingest → score → approve → draft outreach |
| **06 Hedge fund** | thesis cards, signals, citations, feedback |
| **09 Sales chatbot** | intent router, multi-source grounding |

---

## API-only demo (terminal)

```bash
./scripts/demo.sh
```

Records well as a split-screen with the UI.
