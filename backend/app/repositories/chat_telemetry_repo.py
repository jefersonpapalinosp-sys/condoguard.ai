from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

MAX_EVENTS = 200

_store: dict[int, dict[str, Any]] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _empty_state(condominium_id: int) -> dict[str, Any]:
    return {
        "condominiumId": condominium_id,
        "counters": {
            "messages": 0,
            "blocked": 0,
            "fallback": 0,
            "errors": 0,
            "lowConfidence": 0,
            "outOfScope": 0,
        },
        "satisfaction": {"total": 0, "positive": 0, "negative": 0},
        "recentEvents": [],
        "updatedAt": _now_iso(),
    }


def _state(condominium_id: int) -> dict[str, Any]:
    cid = int(condominium_id or 0)
    if cid not in _store:
        _store[cid] = _empty_state(cid)
    return _store[cid]


def reset_chat_telemetry_store() -> None:
    _store.clear()


def _push_event(state: dict[str, Any], event: dict[str, Any]) -> None:
    state["recentEvents"].insert(0, event)
    if len(state["recentEvents"]) > MAX_EVENTS:
        del state["recentEvents"][MAX_EVENTS:]
    state["updatedAt"] = _now_iso()


def record_chat_message_telemetry(condominium_id: int, payload: dict[str, Any]) -> None:
    state = _state(condominium_id)
    state["counters"]["messages"] += 1
    if payload.get("guardrails", {}).get("blocked"):
        state["counters"]["blocked"] += 1
        state["counters"]["fallback"] += 1
    if payload.get("confidence") == "low":
        state["counters"]["lowConfidence"] += 1
    if payload.get("guardrails", {}).get("reason") == "OUT_OF_SCOPE":
        state["counters"]["outOfScope"] += 1

    _push_event(
        state,
        {
            "ts": _now_iso(),
            "type": "message",
            "messageId": payload.get("id"),
            "intentId": payload.get("intentId"),
            "confidence": payload.get("confidence"),
            "guardrailBlocked": bool(payload.get("guardrails", {}).get("blocked")),
            "guardrailReason": payload.get("guardrails", {}).get("reason"),
        },
    )


def record_chat_error_telemetry(condominium_id: int, error_code: str) -> None:
    state = _state(condominium_id)
    state["counters"]["errors"] += 1
    _push_event(state, {"ts": _now_iso(), "type": "error", "errorCode": error_code or "UNKNOWN_ERROR"})


def record_chat_feedback_telemetry(condominium_id: int, feedback: dict[str, Any]) -> None:
    state = _state(condominium_id)
    state["satisfaction"]["total"] += 1
    if feedback.get("rating") == "up":
        state["satisfaction"]["positive"] += 1
    elif feedback.get("rating") == "down":
        state["satisfaction"]["negative"] += 1
    _push_event(
        state,
        {
            "ts": _now_iso(),
            "type": "feedback",
            "messageId": feedback.get("messageId"),
            "rating": feedback.get("rating"),
            "comment": feedback.get("comment"),
        },
    )


def get_chat_telemetry_snapshot(condominium_id: int, limit: int = 20) -> dict[str, Any]:
    state = _state(condominium_id)
    total = state["satisfaction"]["total"]
    score = round((state["satisfaction"]["positive"] / total) * 100, 2) if total > 0 else None
    return {
        "condominiumId": state["condominiumId"],
        "generatedAt": _now_iso(),
        "updatedAt": state["updatedAt"],
        "counters": dict(state["counters"]),
        "satisfaction": {**state["satisfaction"], "score": score},
        "recentEvents": state["recentEvents"][: max(1, limit)],
    }
