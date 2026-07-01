from backend.config_loader import format_prompt, load_icp, load_thesis_card
from backend.db import Company, OutreachDraft, Qualification, Signal, log_activity
from backend.llm import MODEL_REGISTRY, call_llm, compare_models


def _company_context(company: Company) -> str:
  return json_dumps({
      "name": company.name,
      "domain": company.domain,
      "email": company.email,
      **company.enriched_payload,
  })


def json_dumps(obj) -> str:
    import json
    return json.dumps(obj, indent=2)


def _signals_context(db, company_id: int) -> str:
    signals = db.query(Signal).filter(Signal.company_id == company_id).limit(10).all()
    if not signals:
        return "No recent signals."
    return json_dumps(
        [{"title": s.title, "body": s.body, "source": s.source} for s in signals]
    )


def score_company(
    db, company_id: int, draft_if_qualified: bool = True, force_mock: bool = False
) -> Qualification | None:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        return None

    icp = load_icp()
    thesis = load_thesis_card(company.domain)
    prompt = format_prompt(
        "score",
        icp=json_dumps(icp),
        company=_company_context(company),
        signals=_signals_context(db, company_id),
        thesis=json_dumps(thesis) if thesis else "None",
    )

    mock = _mock_score(company, thesis)
    if force_mock:
        result, model = mock, "mock:claude-sonnet"
    else:
        result, model = call_llm(prompt, model_id="claude-sonnet", mock_response=mock)

    qual = Qualification(
        company_id=company_id,
        score=int(result["score"]),
        icp_fit=result["icp_fit"],
        reasoning=result["reasoning"],
        disqualifiers=result.get("disqualifiers", []),
        talking_points=result.get("talking_points", []),
        model=model,
    )
    db.add(qual)
    db.flush()
    log_activity(
        db,
        action="company_scored",
        company_id=company_id,
        entity_type="qualification",
        entity_id=qual.id,
        payload={"score": qual.score, "icp_fit": qual.icp_fit},
    )

    min_score = (thesis or icp).get("min_score_to_draft", 60)
    if draft_if_qualified and qual.score >= min_score and qual.icp_fit != "disqualified":
        draft_outreach(db, company_id, qual)

    db.commit()
    db.refresh(qual)
    return qual


def _build_score_prompt(db, company: Company) -> tuple[str, dict, dict | None]:
    icp = load_icp()
    thesis = load_thesis_card(company.domain)
    prompt = format_prompt(
        "score",
        icp=json_dumps(icp),
        company=_company_context(company),
        signals=_signals_context(db, company.id),
        thesis=json_dumps(thesis) if thesis else "None",
    )
    return prompt, icp, thesis


def compare_models_for_company(db, company_id: int) -> dict | None:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        return None

    prompt, _, thesis = _build_score_prompt(db, company)
    comparisons = compare_models(
        prompt,
        mock_fn=lambda model_id: _mock_score(company, thesis, model_id),
    )
    return {
        "company_id": company_id,
        "company_name": company.name,
        "comparisons": comparisons,
    }


def _mock_score(company: Company, thesis: dict | None, model_id: str = "claude-sonnet") -> dict:
    employees = int(company.enriched_payload.get("employees") or 0)
    industry = (company.enriched_payload.get("industry") or "").lower()
    score = 50
    disqualifiers = []
    talking_points = []

    if "consumer" in industry or "retail" in industry or "e-commerce" in industry:
        score = 25
        disqualifiers.append("Consumer-focused industry outside ICP")
    elif employees < 20:
        score = 30
        disqualifiers.append("Company too small for ICP")
    elif "eu" in company.domain:
        score = 35
        disqualifiers.append("Non-US headquarters")
    elif employees >= 50 and ("saas" in industry or "data" in industry or "fintech" in industry or "developer" in industry or "cloud" in industry or "marketing" in industry or "ai" in industry):
        score = 82
        talking_points.append(f"Growth-stage {industry} with {employees} employees")
        if thesis:
            talking_points.append(f"Aligns with thesis: {thesis.get('core_thesis')}")

    # Simulate model personality differences in demo/mock mode
    if model_id == "gpt-4o":
        score = max(0, min(100, score + 3))
        reasoning_suffix = " GPT emphasizes GTM motion and expansion signals."
    elif model_id == "gemini-flash":
        score = max(0, min(100, score - 5))
        reasoning_suffix = " Gemini weights geographic and firmographic fit more conservatively."
    elif model_id == "deepseek-chat":
        score = max(0, min(100, score + 1))
        reasoning_suffix = " DeepSeek applies a pragmatic B2B lens with emphasis on firmographic fit."
    else:
        reasoning_suffix = " Claude weights ICP criteria and sales leadership contacts heavily."

    icp_fit = "disqualified" if score < 40 else "strong" if score >= 70 else "moderate" if score >= 50 else "weak"
    return {
        "score": score,
        "icp_fit": icp_fit,
        "reasoning": (
            f"{company.name} ({company.domain}) scored {score}/100 based on "
            f"{employees} employees in {industry or 'unknown industry'}."
            f"{reasoning_suffix}"
        ),
        "disqualifiers": disqualifiers,
        "talking_points": talking_points or [f"Recent activity at {company.name}"],
    }


def draft_outreach(db, company_id: int, qual: Qualification) -> OutreachDraft:
    company = db.query(Company).filter(Company.id == company_id).first()
    prompt = format_prompt(
        "draft_outreach",
        company=_company_context(company),
        score=str(qual.score),
        reasoning=qual.reasoning,
        talking_points=json_dumps(qual.talking_points),
    )
    first_name = company.enriched_payload.get("first_name", "there")
    mock = {
        "subject": f"Quick idea for {company.name}",
        "body": (
            f"Hi {first_name},\n\n"
            f"I noticed {company.name} is scaling its team — {qual.talking_points[0] if qual.talking_points else qual.reasoning}. "
            f"Would it be worth a brief conversation this week?\n\nBest"
        ),
    }
    result, _ = call_llm(prompt, mock_response=mock)
    draft = OutreachDraft(
        company_id=company_id,
        subject=result["subject"],
        body=result["body"],
        status="pending",
    )
    db.add(draft)
    db.flush()
    log_activity(
        db,
        action="draft_created",
        company_id=company_id,
        entity_type="outreach_draft",
        entity_id=draft.id,
        payload={"subject": draft.subject},
    )
    return draft
