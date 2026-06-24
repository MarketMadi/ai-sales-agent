import json
import re

from backend.settings import settings


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return json.loads(text)


def call_llm(prompt: str, mock_response: dict | None = None) -> tuple[dict, str]:
    if settings.mock_llm or not settings.anthropic_api_key:
        data = mock_response or {"message": "mock response"}
        return data, "mock"

    import anthropic

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    text = message.content[0].text
    return _extract_json(text), "claude-sonnet-4-20250514"
