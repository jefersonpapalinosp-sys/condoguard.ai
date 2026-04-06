from __future__ import annotations

from typing import Any

import httpx

from app.core.config import settings


async def dispatch_observability_alerts(payload: dict[str, Any]) -> dict[str, Any]:
    channel = str(settings.obs_alert_channel or "log").lower()
    webhook_url = str(settings.obs_alert_webhook_url or "").strip()
    timeout_ms = max(500, int(settings.obs_alert_webhook_timeout_ms or 5000))

    if not payload.get("items"):
        return {"dispatched": False, "channel": channel, "reason": "no_alerts"}

    if channel == "log":
        return {"dispatched": True, "channel": channel, "reason": None}

    if channel != "webhook":
        return {"dispatched": False, "channel": channel, "reason": "channel_not_supported"}

    if not webhook_url:
        return {"dispatched": False, "channel": channel, "reason": "webhook_not_configured"}

    try:
        async with httpx.AsyncClient(timeout=timeout_ms / 1000) as client:
            response = await client.post(webhook_url, json=payload)
            if response.status_code >= 400:
                return {"dispatched": False, "channel": channel, "reason": "webhook_rejected", "status": response.status_code}
            return {"dispatched": True, "channel": channel, "reason": None}
    except Exception as exc:
        return {"dispatched": False, "channel": channel, "reason": "webhook_failed", "error": str(exc)}
