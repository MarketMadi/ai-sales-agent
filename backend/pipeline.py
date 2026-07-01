"""Async lead capture pipeline: persist first, score + CRM sync with retries."""

from __future__ import annotations

import time
from datetime import datetime

from sqlalchemy.orm import Session

from backend.db import Company, PipelineJob, SessionLocal, log_activity
from backend.ingest import normalize_domain, normalize_email
from backend.integrations.hubspot import sync_contact
from backend.score import score_company

MAX_RETRIES = 3
BACKOFF_SECONDS = (1, 2, 4)


class ScoringTimeoutError(Exception):
    """Simulated or real scoring timeout."""


def enqueue_lead(db: Session, payload: dict) -> PipelineJob:
    job = PipelineJob(
        status="pending",
        payload=payload,
        retry_count=0,
    )
    db.add(job)
    db.flush()
    log_activity(
        db,
        action="lead_captured",
        entity_type="pipeline_job",
        entity_id=job.id,
        payload={"source": payload.get("source", "webhook")},
    )
    db.commit()
    db.refresh(job)
    return job


def process_lead_job(job_id: int) -> None:
    db = SessionLocal()
    try:
        job = db.query(PipelineJob).filter(PipelineJob.id == job_id).first()
        if not job or job.status in ("completed", "dead"):
            return

        job.status = "processing"
        job.updated_at = datetime.utcnow()
        db.commit()

        company = _upsert_company(db, job)
        job.company_id = company.id
        db.commit()

        _score_with_retries(db, job, company)
        contact_id = sync_contact(db, company, job.id)

        job.hubspot_contact_id = contact_id
        job.status = "completed"
        job.last_error = None
        job.updated_at = datetime.utcnow()
        log_activity(
            db,
            action="pipeline_completed",
            company_id=company.id,
            entity_type="pipeline_job",
            entity_id=job.id,
        )
        db.commit()
    except ScoringTimeoutError as exc:
        _mark_dead(db, job_id, str(exc))
    except Exception as exc:
        _mark_dead(db, job_id, str(exc))
    finally:
        db.close()


def _upsert_company(db: Session, job: PipelineJob) -> Company:
    payload = job.payload
    email = normalize_email(payload.get("email"))
    domain = normalize_domain(payload.get("domain"), email)
    if not domain:
        raise ValueError("lead payload missing domain/email")

    company = db.query(Company).filter(Company.domain == domain).first()
    if not company:
        company = Company(
            name=payload.get("company") or domain,
            domain=domain,
            email=email,
            raw_payload=payload,
            enriched_payload={
                k: payload.get(k)
                for k in ("title", "employees", "industry", "first_name", "last_name")
                if payload.get(k)
            },
        )
        db.add(company)
        db.flush()
        log_activity(
            db,
            action="company_imported",
            company_id=company.id,
            entity_type="pipeline_job",
            entity_id=job.id,
            payload={"source": "webhook", "domain": domain},
        )
    return company


def _score_with_retries(db: Session, job: PipelineJob, company: Company) -> None:
    simulate = int(job.payload.get("_simulate_retries", 0) or 0)
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            if simulate > 0:
                simulate -= 1
                job.payload = {**job.payload, "_simulate_retries": simulate}
                db.commit()
                raise ScoringTimeoutError("OpenAI scoring timed out (>30s)")
            use_mock = True  # pipeline demo path — architecture proof; CSV ingest uses live LLM
            score_company(db, company.id, force_mock=use_mock)
            log_activity(
                db,
                action="pipeline_scored",
                company_id=company.id,
                entity_type="pipeline_job",
                entity_id=job.id,
                payload={"attempt": attempt},
            )
            db.commit()
            return
        except ScoringTimeoutError:
            job.retry_count = attempt
            job.last_error = "OpenAI scoring timed out (>30s)"
            job.status = "retrying"
            job.updated_at = datetime.utcnow()
            log_activity(
                db,
                action="pipeline_scoring_retry",
                company_id=company.id,
                entity_type="pipeline_job",
                entity_id=job.id,
                payload={"attempt": attempt, "max_retries": MAX_RETRIES},
            )
            db.commit()
            if attempt >= MAX_RETRIES:
                raise ScoringTimeoutError("OpenAI scoring timed out (>30s)")
            time.sleep(BACKOFF_SECONDS[min(attempt - 1, len(BACKOFF_SECONDS) - 1)])


def _mark_dead(db: Session, job_id: int, error: str) -> None:
    job = db.query(PipelineJob).filter(PipelineJob.id == job_id).first()
    if not job:
        return
    job.status = "dead"
    job.last_error = error
    job.updated_at = datetime.utcnow()
    log_activity(
        db,
        action="pipeline_dead",
        company_id=job.company_id,
        entity_type="pipeline_job",
        entity_id=job.id,
        payload={"error": error, "retry_count": job.retry_count},
    )
    db.commit()
