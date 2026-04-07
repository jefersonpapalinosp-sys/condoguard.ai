from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4


_pending_actions: dict[str, dict[str, Any]] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def _purge_expired() -> None:
    now = _now()
    expired = [item_id for item_id, item in _pending_actions.items() if datetime.fromisoformat(item["expiresAt"]) <= now]
    for item_id in expired:
        _pending_actions.pop(item_id, None)


def reset_chat_pending_actions_store() -> None:
    _pending_actions.clear()


def create_pending_action(
    condominium_id: int,
    action_type: str,
    target_id: str,
    target_label: str,
    confirmation_prompt: str,
    actor_sub: str | None = None,
    payload: dict[str, Any] | None = None,
    ttl_seconds: int = 900,
) -> dict[str, Any]:
    _purge_expired()
    now = _now()
    expires_at = now + timedelta(seconds=max(30, int(ttl_seconds or 900)))
    item_id = f"act-{uuid4().hex[:12]}"
    item = {
        "id": item_id,
        "condominiumId": int(condominium_id),
        "actionType": action_type,
        "targetId": str(target_id),
        "targetLabel": str(target_label),
        "confirmationPrompt": confirmation_prompt,
        "createdAt": now.isoformat(),
        "expiresAt": expires_at.isoformat(),
        "actorSub": actor_sub,
        "payload": payload or {},
    }
    _pending_actions[item_id] = item
    return item


def get_pending_action(condominium_id: int, pending_action_id: str) -> dict[str, Any] | None:
    _purge_expired()
    item = _pending_actions.get(str(pending_action_id))
    if not item or int(item.get("condominiumId") or 0) != int(condominium_id):
        return None
    return dict(item)


def take_pending_action(condominium_id: int, pending_action_id: str) -> dict[str, Any] | None:
    item = get_pending_action(condominium_id, pending_action_id)
    if not item:
        return None
    _pending_actions.pop(str(pending_action_id), None)
    return item


def cancel_pending_action(condominium_id: int, pending_action_id: str) -> dict[str, Any] | None:
    item = take_pending_action(condominium_id, pending_action_id)
    if not item:
        return None
    return {
        "id": item["id"],
        "actionType": item["actionType"],
        "targetId": item["targetId"],
        "targetLabel": item["targetLabel"],
        "cancelledAt": _now_iso(),
    }
