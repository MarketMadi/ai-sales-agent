# Signal Desk — REWORK submission Loom (~5 min)

One recording covers all four REWORK questions. Use **local stack** (not GitHub Pages) for webhook demo.

## Setup (before record)

```bash
docker compose up -d
uvicorn backend.main:app --reload --port 8000
cd frontend && npm run dev
```

Tabs open: Dashboard, Review, Audit Log, `docs/ARCHITECTURE.md` in browser or VS Code.

---

## 0:00–0:30 — Intro (Q1)

> "This is Signal Desk — an outbound lead pipeline I built. Leads come in via CSV or webhook, get AI-scored against ICP config, and nothing sends without human approval. Full audit trail."

Show home page briefly.

---

## 0:30–1:30 — Core automation (Q1)

**Dashboard → Ingest Apollo CSV**

> "26 Apollo-style leads. Dedupes on email and domain. Each company scored with stored reasoning — not a black box."

**Review → open one company → show score + talking points**

> "Stack is FastAPI, Postgres, Next.js, Claude. Config-driven ICP in YAML, not hardcoded. ROI-wise: manual research is roughly 8–10 minutes per lead; this does scoring in seconds and humans only review what's qualified."

---

## 1:30–2:45 — Error handling + timeout fix (Q2 + Q4)

**Dashboard → Simulate Webhook Lead**

> "This is the REWORK timeout scenario. Old design: webhook waits for OpenAI, times out, lead lost. New design: webhook persists the lead, returns 202 immediately, background worker scores with retries, then HubSpot sync."

Wait ~5 sec, refresh Dashboard.

> "You can see retries in the job table. Lead was never lost — it was on disk before AI ran."

**Audit Log**

> "Every retry, HubSpot sync, and failure mode is logged. Slack notify failures don't roll back approvals either."

---

## 2:45–3:45 — Async documentation (Q3)

**Show `docs/ARCHITECTURE.md`**

> "I document for async handoff — happy path, ROI table, and failure modes so a non-technical stakeholder doesn't need a meeting to understand the system."

---

## 3:45–4:30 — Chat + close (bonus)

**Chat → "Why did Acme score high?"**

> "Intent router picks the right data source. Answers cite sources. Same engine, different config per client."

---

## 4:30–5:00 — Close

> "This is the kind of automation I build: persist first, process async, human gate on outbound, full audit. Happy to walk through the 45-minute mapping challenge."

---

## Terminal B-roll (optional split screen)

```bash
./scripts/rework-demo.sh
```

Shows webhook 202 + pipeline events in JSON — strong Q2/Q4 proof.
