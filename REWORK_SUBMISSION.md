# REWORK Digital — submission cheat sheet

**Role:** AI Automation Specialist  
**Project:** Signal Desk (this repo)  
**Live demo:** https://marketmadi.github.io/ai-sales-agent/  
**Stakeholder doc:** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

Write answers in **your own words**. Attach screenshots/Loom — don’t paste AI-generated essays.

---

## Before you start (~10 min setup)

```bash
cd ~/ai-sales-agent
docker compose up -d
source .venv/bin/activate   # or: python -m venv .venv && pip install -r backend/requirements.txt
export PYTHONPATH=.
python scripts/seed.py        # optional fresh data
uvicorn backend.main:app --reload --port 8000   # terminal 1
cd frontend && npm run dev    # terminal 2 → http://localhost:3000
```

**Check `.env`:** every line must be `KEY=value` (no bare secrets on their own line — breaks Docker).

---

## Question 1 — Verifiable project + ROI

### Attach
1. Screenshot: **Dashboard** after "Ingest Apollo CSV"
2. Screenshot: **Review** — Acme score + reasoning expanded
3. Screenshot: **Audit Log** after approve
4. Optional: 60-sec Loom clip of that flow

### Say (your words)
- **Stack:** Webhook/CSV ingest → FastAPI → Postgres → Claude scoring → human approve → Slack/HubSpot
- **ROI:** ~8 min manual research/lead → automated score in seconds; human only reviews qualified drafts; dedupe prevents wasted reps
- **Link:** https://marketmadi.github.io/ai-sales-agent/

---

## Question 2 — Error handling architecture

### Attach
1. Screenshot: **Audit Log** on live demo — pipeline retries + HubSpot sync are pre-seeded at the top (pink rows)
2. Screenshot: **docs/ARCHITECTURE.md** on GitHub ([link](https://github.com/marketmadi/ai-sales-agent/blob/main/docs/ARCHITECTURE.md))
3. Terminal output from `./scripts/rework-demo.sh` (local stack — optional extra proof)

```bash
chmod +x scripts/rework-demo.sh
./scripts/rework-demo.sh
```

### Or use the UI (local stack)
1. Dashboard → **Simulate Webhook Lead** (fakes 2 OpenAI timeouts, then succeeds)
2. Wait 5 sec → refresh → see job table + Audit Log

### Say (your words)
- Lead persisted **before** AI runs (202 Accepted)
- Retries with backoff on scoring timeout
- Slack/HubSpot failures logged; core data not rolled back
- Dead-letter state `pipeline_dead` keeps payload for replay

---

## Question 3 — Async documentation

### Attach (pick one or both)
1. **Link:** `docs/ARCHITECTURE.md` in your GitHub repo (public)
2. **Loom:** 3–5 min using [LOOM_SCRIPT_REWORK.md](./LOOM_SCRIPT_REWORK.md)

### Say
- Built for async handoff — doc explains flow without a meeting
- Non-technical reader can understand happy path + failure modes

---

## Question 4 — Timeout fix (Webhook → OpenAI → HubSpot)

### Attach
1. Screenshot of **Dashboard pipeline jobs table** after simulate webhook
2. Bullets or screenshot of architecture diagram in `docs/ARCHITECTURE.md`

### Logic map (copy structure, rewrite in your voice)

```
OLD (broken):  Webhook ──waits──► OpenAI ──► HubSpot   (10% timeout = lead lost)

NEW (Signal Desk):
  Webhook ──► save lead + job ──► 202 Accepted
                    │
                    └──► background worker
                              ├── score (retry 3x)
                              └── HubSpot sync
```

---

## Loom recording order (one video covers all 4)

See **[LOOM_SCRIPT_REWORK.md](./LOOM_SCRIPT_REWORK.md)** — ~5 minutes total.

---

## Wellfound message template

> Hi REWORK team — proofs attached per your PoW format.
>
> **Q1:** Signal Desk pipeline — [Loom link] + screenshots. Stack: FastAPI/Postgres/Claude. ROI: manual lead research ~8min → automated score + human review only on qualified leads.
>
> **Q2:** Async webhook pipeline with retries — terminal demo + audit log screenshots. Lead persisted before AI; scoring failures retry without data loss.
>
> **Q3:** Architecture doc: [GitHub link to docs/ARCHITECTURE.md] (+ Loom if recorded).
>
> **Q4:** Re-architected as 202 + background queue — diagram in doc + working simulate button on Dashboard.
>
> Happy to proceed with the 45-min mapping challenge.

---

## Quick screenshot checklist

- [ ] Dashboard (ingest + pipeline cards)
- [ ] Dashboard (pipeline jobs table after webhook simulate)
- [ ] Review (reasoning visible)
- [ ] Audit Log (`pipeline_*` and `dedupe_*` events)
- [ ] docs/ARCHITECTURE.md (error handling section)
- [ ] Terminal running `./scripts/rework-demo.sh`
- [ ] (Optional) Chat with citation

---

## Time budget

| Task | Time |
|------|------|
| Local setup | 10 min |
| Screenshots | 10 min |
| Loom (optional) | 15–20 min |
| Write short Wellfound reply | 10 min |
| **Total** | **~45 min** |
