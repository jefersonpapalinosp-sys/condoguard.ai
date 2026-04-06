from __future__ import annotations

import re
import unicodedata
from typing import Any

from app.utils.seed_loader import read_seed_json

ACTIVE_INTENTS_FILE = "chat_intents.v1.json"


def get_chat_intent_catalog() -> dict[str, Any]:
    payload = read_seed_json(ACTIVE_INTENTS_FILE)
    return {"version": str(payload.get("version") or "unknown"), "intents": payload.get("intents") or []}


def _normalize(value: str) -> str:
    text = (value or "").lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return text


def _stem(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9\s]", "", _normalize(value)).strip()
    if not normalized:
        return ""
    return re.sub(r"(oes|aes|ais|eis|res|is|ns|s|os|as|o|a|es|e)$", "", normalized)


def classify_intent(message: str) -> dict[str, str]:
    catalog = get_chat_intent_catalog()
    normalized = _normalize(message or "")
    if not normalized.strip():
        return {"catalogVersion": catalog["version"], "intentId": "general_overview", "confidence": "low"}

    winner = {"id": "general_overview", "score": 0}
    for intent in catalog["intents"]:
        score = 0
        for keyword in intent.get("keywords", []):
            stem = _stem(keyword)
            if stem and stem in normalized:
                score += 1
        if score > winner["score"]:
            winner = {"id": intent["id"], "score": score}

    confidence = "high" if winner["score"] >= 3 else "medium" if winner["score"] >= 1 else "low"
    return {"catalogVersion": catalog["version"], "intentId": winner["id"], "confidence": confidence}


def list_intent_suggestions(limit: int = 3) -> list[dict[str, str]]:
    catalog = get_chat_intent_catalog()
    return [
        {"id": intent["id"], "label": intent["label"], "prompt": intent.get("promptTemplate")}
        for intent in catalog["intents"][:limit]
    ]
