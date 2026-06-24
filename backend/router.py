from backend.config_loader import format_prompt
from backend.db import Company, Document, Qualification, Signal
from backend.llm import call_llm


def classify_intent(question: str) -> dict:
    prompt = format_prompt("classify_intent", question=question)
    mock = _mock_intent(question)
    result, _ = call_llm(prompt, mock_response=mock)
    return result


def _mock_intent(question: str) -> dict:
    q = question.lower()
    intent = "company_facts"
    domain = None

    if any(w in q for w in ["score", "why", "fit", "icp", "thesis", "qualified"]):
        intent = "thesis_fit"
    elif any(w in q for w in ["news", "signal", "recent", "alert", "happened"]):
        intent = "recent_signals"

    for d in ["acme.com", "brightpath.io", "nimbus.ai"]:
        token = d.split(".")[0]
        if token in q:
            domain = d
            break
    if "acme" in q:
        domain = "acme.com"
    if "brightpath" in q:
        domain = "brightpath.io"

    return {"intent": intent, "company_domain": domain}


def build_context(db, intent: str, company_domain: str | None) -> tuple[str, int | None]:
    company = None
    if company_domain:
        company = db.query(Company).filter(Company.domain == company_domain).first()

    if not company and intent != "company_facts":
        companies = db.query(Company).limit(1).all()
        company = companies[0] if companies else None

    if not company:
        return "No company data available.", None

    parts = []
    if intent == "company_facts":
        parts.append(
            {
                "type": "company",
                "id": company.id,
                "name": company.name,
                "domain": company.domain,
                "email": company.email,
                **company.enriched_payload,
            }
        )
        docs = db.query(Document).filter(Document.company_id == company.id).limit(5).all()
        for d in docs:
            parts.append({"type": "document", "id": d.id, "title": d.title, "body": d.body})

    elif intent == "recent_signals":
        signals = db.query(Signal).filter(Signal.company_id == company.id).limit(10).all()
        for s in signals:
            parts.append(
                {"type": "signal", "id": s.id, "title": s.title, "body": s.body, "source": s.source}
            )
        if not signals:
            parts.append({"type": "note", "body": "No signals ingested yet for this company."})

    elif intent == "thesis_fit":
        qual = (
            db.query(Qualification)
            .filter(Qualification.company_id == company.id)
            .order_by(Qualification.created_at.desc())
            .first()
        )
        if qual:
            parts.append(
                {
                    "type": "qualification",
                    "id": qual.id,
                    "score": qual.score,
                    "icp_fit": qual.icp_fit,
                    "reasoning": qual.reasoning,
                    "disqualifiers": qual.disqualifiers,
                    "talking_points": qual.talking_points,
                }
            )
        else:
            parts.append({"type": "note", "body": "Company has not been scored yet."})

    import json
    return json.dumps(parts, indent=2), company.id
