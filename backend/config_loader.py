import json
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


def load_yaml(path: Path) -> dict:
    with open(path) as f:
        return yaml.safe_load(f) or {}


def load_icp() -> dict:
    return load_yaml(ROOT / "config" / "icp.yaml")


def load_thesis_card(domain: str) -> dict | None:
    path = ROOT / "config" / "thesis_cards" / f"{domain.split('.')[0]}.yaml"
    if not path.exists():
        # try full domain slug
        slug = domain.replace(".", "_")
        path = ROOT / "config" / "thesis_cards" / f"{slug}.yaml"
    if not path.exists():
        for card in (ROOT / "config" / "thesis_cards").glob("*.yaml"):
            data = load_yaml(card)
            if data.get("domain") == domain:
                return data
        return None
    return load_yaml(path)


def load_prompt(name: str) -> str:
    return (ROOT / "config" / "prompts" / f"{name}.txt").read_text()


def format_prompt(name: str, **kwargs: str) -> str:
    template = load_prompt(name)
    return template.format(**kwargs)
