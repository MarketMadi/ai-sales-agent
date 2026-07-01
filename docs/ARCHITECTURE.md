# Signal Desk — Architecture (stakeholder view)

Plain-language overview for non-technical reviewers. Technical details at the end.

---

## What Signal Desk does

Signal Desk automates the **first half of outbound sales**: capture a lead, score it with AI against your ICP, draft outreach, and hold it for **human approval** before anything sends. Every step is logged.

**Live demo:** https://marketmadi.github.io/ai-sales-agent/

---

## Happy path (how a lead moves)

```
Lead arrives (CSV import or webhook)
    → Saved to database immediately
    → AI scores against ICP + thesis config
    → If qualified: outreach draft created
    → Human reviews reasoning, edits, approves
    → Optional: Slack / HubSpot notification
    → Full audit trail
```

Nothing sends without a person clicking **Approve**.

---

## ROI framing (honest)

| Step | Manual (typical SDR) | Signal Desk |
|------|----------------------|-------------|
| Research + score one lead | ~8–15 min | ~30 sec AI + human review only if qualified |
| Dedupe check | ad hoc | automatic on email/domain |
| Document why we chased them | rarely | always (stored reasoning) |
| Audit "who approved what" | spreadsheet / memory | append-only activity log |

**Example:** 26 leads in the sample CSV → ingest + score in one click vs ~3–6 hours manual research. Human time shifts to **reviewing qualified drafts only**.

---

## Error handling — no lead lost

### Problem they asked about

> Webhook → OpenAI scoring → HubSpot fails 10% of the time when OpenAI takes >30s.

### Our architecture

```
Webhook POST
    │
    ├─► 1. INSERT lead + job row (status: pending)     ← lead is safe
    ├─► 2. Return 202 Accepted immediately             ← webhook never times out
    │
    └─► 3. Background worker (async)
            ├─ Try OpenAI score (timeout 30s)
            │     ├─ OK → continue
            │     └─ FAIL → retry (up to 3x, backoff 1s/2s/4s)
            ├─ HubSpot sync (separate step)
            └─ status: completed OR dead (payload kept for manual replay)
```

**Key rule:** ingestion and inference are **decoupled**. The webhook only acks after the lead is on disk.

### Other error paths already in the app

| Failure | What happens | Data lost? |
|---------|--------------|------------|
| Duplicate email/domain on ingest | `dedupe_rejected` in audit log | No — original kept |
| Slack notify fails on approve | `slack_notify_failed` logged; draft stays approved | No |
| One LLM model fails in compare | Other models still return; error shown per model | No |
| Pipeline scoring exhausts retries | `pipeline_dead` + lead row retained | No — replay possible |

---

## Stack

| Layer | Technology |
|-------|------------|
| API | Python, FastAPI |
| Database | PostgreSQL |
| Frontend | Next.js |
| AI | Claude (primary), OpenAI, Gemini, DeepSeek |
| Config | YAML (ICP, thesis cards) + text prompts |
| Integrations | Webhook ingest, HubSpot sync (mock/real), Slack on approve |

---

## For reviewers

- **Q1 Project proof:** Dashboard → Ingest or Simulate Webhook → Review → Audit Log  
- **Q2 Error handling:** Run `scripts/rework-demo.sh` → Audit Log filter `pipeline_*`  
- **Q3 This document** + optional Loom walkthrough  
- **Q4 Timeout fix:** See "Error handling" section above — implemented as async pipeline jobs
