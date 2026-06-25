import json
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import (
    Activity,
    Company,
    Feedback,
    OutreachDraft,
    Qualification,
    SessionLocal,
    init_db,
    log_activity,
)
from backend.ingest import ingest_csv_leads, ingest_rss_feed, parse_csv_leads, seed_sample_documents
from backend.rag import chat
from backend.score import compare_models_for_company, score_company
from backend.settings import settings

app = FastAPI(title="Signal Desk API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_admin(x_admin_secret: str | None = Header(default=None)):
    if settings.admin_secret and x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")


ROOT = Path(__file__).resolve().parents[1]


class ApproveRequest(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None
    actor: str = "admin"


class RejectRequest(BaseModel):
    actor: str = "admin"
    reason: Optional[str] = None


class ChatRequest(BaseModel):
    question: str


class FeedbackRequest(BaseModel):
    company_id: int
    qualification_id: Optional[int] = None
    useful: bool
    note: Optional[str] = None


class RssIngestRequest(BaseModel):
    url: str
    company_domain: Optional[str] = None


@app.on_event("startup")
def startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ingest/csv")
def ingest_csv(
    score: bool = True,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    path = ROOT / "data" / "sample" / "apollo_export.csv"
    if not path.exists():
        path = ROOT / "data" / "sample" / "leads.csv"
    rows = parse_csv_leads(path)
    result = ingest_csv_leads(
        rows,
        db,
        score_fn=score_company if score else None,
    )
    seed_sample_documents(db)
    return result


@app.post("/ingest/rss")
def ingest_rss(body: RssIngestRequest, db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    return ingest_rss_feed(body.url, db, body.company_domain)


@app.get("/companies")
def list_companies(db: Session = Depends(get_db)):
    companies = db.query(Company).order_by(Company.created_at.desc()).all()
    out = []
    for c in companies:
        qual = (
            db.query(Qualification)
            .filter(Qualification.company_id == c.id)
            .order_by(Qualification.created_at.desc())
            .first()
        )
        out.append(
            {
                "id": c.id,
                "name": c.name,
                "domain": c.domain,
                "email": c.email,
                "enriched_payload": c.enriched_payload,
                "latest_score": qual.score if qual else None,
                "latest_icp_fit": qual.icp_fit if qual else None,
            }
        )
    return out


@app.get("/companies/{company_id}")
def get_company(company_id: int, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")
    qual = (
        db.query(Qualification)
        .filter(Qualification.company_id == company_id)
        .order_by(Qualification.created_at.desc())
        .first()
    )
    drafts = db.query(OutreachDraft).filter(OutreachDraft.company_id == company_id).all()
    return {
        "company": {
            "id": company.id,
            "name": company.name,
            "domain": company.domain,
            "email": company.email,
            "enriched_payload": company.enriched_payload,
        },
        "qualification": _qual_to_dict(qual) if qual else None,
        "drafts": [_draft_to_dict(d) for d in drafts],
    }


@app.get("/companies/{company_id}/compare")
def compare_company_models(company_id: int, db: Session = Depends(get_db)):
    result = compare_models_for_company(db, company_id)
    if not result:
        raise HTTPException(404, "Company not found")
    return result


@app.post("/companies/{company_id}/score")
def rescore(company_id: int, db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    qual = score_company(db, company_id)
    if not qual:
        raise HTTPException(404, "Company not found")
    return _qual_to_dict(qual)


@app.get("/review/pending")
def pending_reviews(db: Session = Depends(get_db)):
    drafts = (
        db.query(OutreachDraft)
        .filter(OutreachDraft.status == "pending")
        .order_by(OutreachDraft.created_at.desc())
        .all()
    )
    results = []
    for d in drafts:
        company = db.query(Company).filter(Company.id == d.company_id).first()
        qual = (
            db.query(Qualification)
            .filter(Qualification.company_id == d.company_id)
            .order_by(Qualification.created_at.desc())
            .first()
        )
        results.append(
            {
                "draft": _draft_to_dict(d),
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "domain": company.domain,
                    "enriched_payload": company.enriched_payload,
                },
                "qualification": _qual_to_dict(qual) if qual else None,
            }
        )
    return results


@app.post("/review/{draft_id}/approve")
async def approve_draft(
    draft_id: int,
    body: ApproveRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    draft = db.query(OutreachDraft).filter(OutreachDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(404, "Draft not found")
    if body.subject:
        draft.subject = body.subject
    if body.body:
        draft.body = body.body
    draft.status = "approved"
    draft.approved_by = body.actor
    draft.approved_at = datetime.utcnow()
    log_activity(
        db,
        action="draft_approved",
        company_id=draft.company_id,
        entity_type="outreach_draft",
        entity_id=draft.id,
        actor=body.actor,
        payload={"subject": draft.subject},
    )
    db.commit()

    if settings.slack_webhook_url:
        await _notify_slack(draft, db)

    return _draft_to_dict(draft)


@app.post("/review/{draft_id}/reject")
def reject_draft(
    draft_id: int,
    body: RejectRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    draft = db.query(OutreachDraft).filter(OutreachDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(404, "Draft not found")
    draft.status = "rejected"
    log_activity(
        db,
        action="draft_rejected",
        company_id=draft.company_id,
        entity_type="outreach_draft",
        entity_id=draft.id,
        actor=body.actor,
        payload={"reason": body.reason},
    )
    db.commit()
    return _draft_to_dict(draft)


@app.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    companies = db.query(Company).count()
    qualifications = db.query(Qualification).count()
    pending = db.query(OutreachDraft).filter(OutreachDraft.status == "pending").count()
    approved = db.query(OutreachDraft).filter(OutreachDraft.status == "approved").count()
    rejected = db.query(OutreachDraft).filter(OutreachDraft.status == "rejected").count()
    activities = db.query(Activity).count()
    return {
        "companies": companies,
        "qualified": qualifications,
        "pending_approval": pending,
        "approved": approved,
        "rejected": rejected,
        "activities": activities,
    }


@app.get("/activities")
def list_activities(limit: int = 50, db: Session = Depends(get_db)):
    rows = db.query(Activity).order_by(Activity.created_at.desc()).limit(limit).all()
    return [
        {
            "id": a.id,
            "company_id": a.company_id,
            "action": a.action,
            "actor": a.actor,
            "payload": a.payload,
            "created_at": a.created_at.isoformat(),
        }
        for a in rows
    ]


@app.post("/chat")
def chat_endpoint(body: ChatRequest, db: Session = Depends(get_db)):
    return chat(db, body.question)


@app.post("/feedback")
def submit_feedback(body: FeedbackRequest, db: Session = Depends(get_db)):
    from backend.db import Feedback

    fb = Feedback(
        company_id=body.company_id,
        qualification_id=body.qualification_id,
        useful=body.useful,
        note=body.note,
    )
    db.add(fb)
    log_activity(
        db,
        action="feedback_recorded",
        company_id=body.company_id,
        payload={"useful": body.useful, "note": body.note},
    )
    db.commit()
    return {"id": fb.id, "useful": fb.useful}


def _qual_to_dict(qual: Qualification) -> dict:
    return {
        "id": qual.id,
        "company_id": qual.company_id,
        "score": qual.score,
        "icp_fit": qual.icp_fit,
        "reasoning": qual.reasoning,
        "disqualifiers": qual.disqualifiers,
        "talking_points": qual.talking_points,
        "model": qual.model,
        "created_at": qual.created_at.isoformat(),
    }


def _draft_to_dict(draft: OutreachDraft) -> dict:
    return {
        "id": draft.id,
        "company_id": draft.company_id,
        "subject": draft.subject,
        "body": draft.body,
        "status": draft.status,
        "approved_by": draft.approved_by,
        "approved_at": draft.approved_at.isoformat() if draft.approved_at else None,
        "created_at": draft.created_at.isoformat(),
    }


async def _notify_slack(draft: OutreachDraft, db: Session):
    company = db.query(Company).filter(Company.id == draft.company_id).first()
    payload = {
        "text": f"Approved outreach for {company.name}: {draft.subject}",
    }
    try:
        async with httpx.AsyncClient() as client:
            await client.post(settings.slack_webhook_url, json=payload, timeout=10)
        log_activity(
            db,
            action="slack_notified",
            company_id=draft.company_id,
            entity_type="outreach_draft",
            entity_id=draft.id,
        )
        db.commit()
    except Exception as exc:
        log_activity(
            db,
            action="slack_notify_failed",
            company_id=draft.company_id,
            payload={"error": str(exc)},
        )
        db.commit()
