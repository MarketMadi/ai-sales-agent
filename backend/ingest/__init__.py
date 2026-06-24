import hashlib
import json
import re
from pathlib import Path

import feedparser

ROOT = Path(__file__).resolve().parents[1]


def normalize_email(email: str | None) -> str | None:
    if not email:
        return None
    return email.strip().lower()


def normalize_domain(domain: str | None, email: str | None = None) -> str | None:
    if domain:
        return domain.strip().lower().removeprefix("www.")
    if email and "@" in email:
        return email.split("@", 1)[1].lower()
    return None


def parse_csv_leads(path: Path) -> list[dict]:
    import csv

    leads = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            leads.append(dict(row))
    return leads


def ingest_csv_leads(rows: list[dict], db, score_fn=None) -> dict:
    from backend.db import Company, log_activity

    imported = 0
    duplicates = 0
    companies_seen: set[str] = set()

    for row in rows:
        email = normalize_email(row.get("email"))
        domain = normalize_domain(row.get("domain"), email)
        if not domain:
            continue

        if email:
            existing = db.query(Company).filter(Company.email == email).first()
            if existing:
                duplicates += 1
                log_activity(
                    db,
                    action="dedupe_rejected",
                    company_id=existing.id,
                    payload={"email": email, "reason": "duplicate_email"},
                )
                continue

        company = db.query(Company).filter(Company.domain == domain).first()
        if not company:
            company = Company(
                name=row.get("company") or domain,
                domain=domain,
                email=email,
                raw_payload=row,
                enriched_payload={
                    "title": row.get("title"),
                    "employees": row.get("employees"),
                    "industry": row.get("industry"),
                    "first_name": row.get("first_name"),
                    "last_name": row.get("last_name"),
                },
            )
            db.add(company)
            db.flush()
            imported += 1
            log_activity(
                db,
                action="company_imported",
                company_id=company.id,
                payload={"source": "csv", "domain": domain},
            )
        else:
            if email and not company.email:
                company.email = email
            duplicates += 1
            log_activity(
                db,
                action="dedupe_merged",
                company_id=company.id,
                payload={"email": email, "reason": "duplicate_domain"},
            )

        companies_seen.add(domain)

    db.commit()

    scored = 0
    if score_fn:
        for domain in companies_seen:
            company = db.query(Company).filter(Company.domain == domain).first()
            if company:
                score_fn(db, company.id)
                scored += 1

    return {"imported": imported, "duplicates": duplicates, "scored": scored}


def signal_dedupe_key(source: str, title: str | None, url: str | None) -> str:
    raw = f"{source}|{title or ''}|{url or ''}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def ingest_rss_feed(url: str, db, default_company_domain: str | None = None) -> dict:
    from backend.db import Company, Signal, log_activity

    feed = feedparser.parse(url)
    added = 0
    skipped = 0

    for entry in feed.entries[:20]:
        title = entry.get("title", "")
        body = entry.get("summary", entry.get("description", ""))
        link = entry.get("link")
        key = signal_dedupe_key("rss", title, link)

        if db.query(Signal).filter(Signal.dedupe_key == key).first():
            skipped += 1
            continue

        domain = default_company_domain
        if not domain:
            # try to match company name in title
            for company in db.query(Company).all():
                if company.name.lower() in title.lower():
                    domain = company.domain
                    break

        company_id = None
        if domain:
            company = db.query(Company).filter(Company.domain == domain).first()
            company_id = company.id if company else None

        signal = Signal(
            company_id=company_id,
            source="rss",
            title=title,
            body=body,
            url=link,
            dedupe_key=key,
            raw_payload={"feed": url},
        )
        db.add(signal)
        added += 1
        log_activity(
            db,
            action="signal_ingested",
            company_id=company_id,
            entity_type="signal",
            payload={"source": "rss", "title": title},
        )

    db.commit()
    return {"added": added, "skipped": skipped}


def seed_sample_documents(db) -> int:
    from backend.db import Company, Document

    samples = {
        "acme.com": [
            {
                "title": "Acme hires new CRO",
                "body": "Acme Corp announced Jane Smith will lead global sales as CRO.",
                "source": "press_release",
            },
            {
                "title": "Acme Series B",
                "body": "Acme closed a $40M Series B to expand mid-market GTM.",
                "source": "news",
            },
        ],
        "brightpath.io": [
            {
                "title": "Brightpath platform migration",
                "body": "Brightpath Analytics completed migration to a modern data stack.",
                "source": "blog",
            },
        ],
    }
    count = 0
    for domain, docs in samples.items():
        company = db.query(Company).filter(Company.domain == domain).first()
        if not company:
            continue
        for doc in docs:
            exists = (
                db.query(Document)
                .filter(Document.company_id == company.id, Document.title == doc["title"])
                .first()
            )
            if exists:
                continue
            db.add(
                Document(
                    company_id=company.id,
                    title=doc["title"],
                    body=doc["body"],
                    source=doc["source"],
                )
            )
            count += 1
    db.commit()
    return count
