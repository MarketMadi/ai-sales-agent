"""HubSpot CRM sync — mock in dev; swap for real API when keyed."""

from __future__ import annotations

import uuid

from backend.db import Company, log_activity


def sync_contact(db, company: Company, job_id: int) -> str:
    """Create or update a HubSpot contact. Returns contact id."""
    contact_id = f"hs_{company.id}_{uuid.uuid4().hex[:8]}"
    log_activity(
        db,
        action="hubspot_synced",
        company_id=company.id,
        entity_type="pipeline_job",
        entity_id=job_id,
        payload={"hubspot_contact_id": contact_id, "email": company.email, "domain": company.domain},
    )
    return contact_id
