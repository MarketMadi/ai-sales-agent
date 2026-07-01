import json
import re
from typing import Any

from backend.settings import settings

# Major models we compare — add keys to .env to enable live calls
MODEL_REGISTRY: dict[str, dict[str, str]] = {
    "claude-sonnet": {
        "label": "Claude Sonnet",
        "provider": "anthropic",
        "model": "claude-sonnet-4-20250514",
    },
    "gpt-4o": {
        "label": "GPT-4o",
        "provider": "openai",
        "model": "gpt-4o",
    },
    "gemini-flash": {
        "label": "Gemini 2.0 Flash",
        "provider": "google",
        "model": "gemini-2.0-flash",
    },
    "deepseek-chat": {
        "label": "DeepSeek V3",
        "provider": "deepseek",
        "model": "deepseek-chat",
    },
}


def available_models() -> list[str]:
    available = []
    if settings.anthropic_api_key:
        available.append("claude-sonnet")
    if settings.openai_api_key:
        available.append("gpt-4o")
    if settings.google_api_key:
        available.append("gemini-flash")
    if settings.deepseek_api_key:
        available.append("deepseek-chat")
    return available


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return json.loads(text)


def _call_anthropic(prompt: str, model: str) -> str:
    import anthropic

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model=model,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def _call_openai(prompt: str, model: str) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=settings.openai_api_key)
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1024,
    )
    return response.choices[0].message.content or ""


def _call_deepseek(prompt: str, model: str) -> str:
    from openai import OpenAI

    client = OpenAI(
        api_key=settings.deepseek_api_key,
        base_url="https://api.deepseek.com",
    )
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1024,
    )
    return response.choices[0].message.content or ""


def _call_google(prompt: str, model: str) -> str:
    import google.generativeai as genai

    genai.configure(api_key=settings.google_api_key)
    gemini = genai.GenerativeModel(model)
    response = gemini.generate_content(prompt)
    return response.text or ""


def call_llm(
    prompt: str,
    model_id: str = "claude-sonnet",
    mock_response: dict | None = None,
) -> tuple[dict, str]:
    """Call a specific model. Falls back to mock when no API key or MOCK_LLM=true."""
    meta = MODEL_REGISTRY.get(model_id, MODEL_REGISTRY["claude-sonnet"])
    provider = meta["provider"]
    model_name = meta["model"]

    use_mock = settings.mock_llm
    if provider == "anthropic" and not settings.anthropic_api_key:
        use_mock = True
    if provider == "openai" and not settings.openai_api_key:
        use_mock = True
    if provider == "google" and not settings.google_api_key:
        use_mock = True
    if provider == "deepseek" and not settings.deepseek_api_key:
        use_mock = True

    if use_mock:
        data = mock_response or {"message": "mock response"}
        return data, f"mock:{model_id}"

    if provider == "anthropic":
        text = _call_anthropic(prompt, model_name)
    elif provider == "openai":
        text = _call_openai(prompt, model_name)
    elif provider == "google":
        text = _call_google(prompt, model_name)
    elif provider == "deepseek":
        text = _call_deepseek(prompt, model_name)
    else:
        raise ValueError(f"Unknown provider: {provider}")

    return _extract_json(text), model_id


def compare_models(
    prompt: str,
    mock_fn: Any,
) -> list[dict]:
    """Score with all registered models. Uses live API when keyed, mock otherwise."""
    results = []
    for model_id, meta in MODEL_REGISTRY.items():
        mock = mock_fn(model_id)
        try:
            provider = meta["provider"]
            has_key = (
                (provider == "anthropic" and settings.anthropic_api_key)
                or (provider == "openai" and settings.openai_api_key)
                or (provider == "google" and settings.google_api_key)
                or (provider == "deepseek" and settings.deepseek_api_key)
            )
            if not has_key and not settings.mock_llm:
                results.append({
                    "model_id": model_id,
                    "label": meta["label"],
                    "available": False,
                    "error": f"No API key for {meta['label']}",
                })
                continue

            data, used_model = call_llm(prompt, model_id=model_id, mock_response=mock)
            results.append({
                "model_id": model_id,
                "label": meta["label"],
                "available": True,
                "live": has_key and not settings.mock_llm,
                "model": used_model,
                "score": int(data["score"]),
                "icp_fit": data["icp_fit"],
                "reasoning": data["reasoning"],
                "disqualifiers": data.get("disqualifiers", []),
                "talking_points": data.get("talking_points", []),
            })
        except Exception as exc:
            results.append({
                "model_id": model_id,
                "label": meta["label"],
                "available": False,
                "error": str(exc),
            })
    return results
