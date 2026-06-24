from backend.config_loader import format_prompt
from backend.llm import call_llm
from backend.router import build_context, classify_intent


def chat(db, question: str) -> dict:
    routing = classify_intent(question)
    intent = routing.get("intent", "company_facts")
    domain = routing.get("company_domain")
    context, company_id = build_context(db, intent, domain)

    prompt = format_prompt("chat", context=context, question=question)
    mock = {
        "answer": _mock_answer(intent, context, question),
    }
    # chat returns plain text, not JSON
    if True:
        from backend.settings import settings
        if settings.mock_llm or not settings.anthropic_api_key:
            return {
                "answer": mock["answer"],
                "intent": intent,
                "company_id": company_id,
            }

    import anthropic
    from backend.settings import settings

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    answer = message.content[0].text
    return {"answer": answer, "intent": intent, "company_id": company_id}


def _mock_answer(intent: str, context: str, question: str) -> str:
    if intent == "thesis_fit" and "qualification" in context:
        return (
            "Acme scored 82/100 with strong ICP fit because it is a mid-market B2B SaaS "
            "company with ~120 employees and active sales leadership hiring "
            "[source: qualification:1]. Key talking point: growth-stage team expansion "
            "[source: qualification:1]."
        )
    if intent == "recent_signals":
        return (
            "Recent signals include press coverage and product updates linked to the company "
            "[source: signal:1]. Run RSS ingest to pull live feeds."
        )
    return (
        "Acme Corp (acme.com) is a B2B SaaS company with ~120 employees "
        "[source: company:1]. See stored documents for additional context "
        "[source: document:1]."
    )
