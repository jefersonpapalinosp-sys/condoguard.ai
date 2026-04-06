from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.core.config import settings
from app.observability.metrics_store import get_observability_metrics_snapshot


def get_settings_data(condominium_id: int) -> dict[str, Any]:
    observability = get_observability_metrics_snapshot(5, 5)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "tenant": {
            "condominiumId": condominium_id,
        },
        "platform": {
            "environment": settings.effective_env,
            "dbDialect": settings.db_dialect,
            "authProvider": settings.auth_provider,
            "oidcConfigured": settings.oidc_configured,
            "allowOracleSeedFallback": settings.allow_oracle_seed_fallback,
            "authPasswordLoginEnabled": settings.auth_password_login_enabled,
        },
        "security": {
            "rateLimitWindowMs": settings.rate_limit_window_ms,
            "rateLimitMax": settings.rate_limit_max,
            "loginRateLimitMax": settings.login_rate_limit_max,
            "securityAuditEnabled": settings.security_audit_log_enabled,
            "securityAuditPersistEnabled": settings.security_audit_persist_enabled,
        },
        "observability": {
            "channel": settings.obs_alert_channel,
            "thresholds": {
                "latencyP95WarnMs": settings.obs_alert_p95_latency_ms,
                "errorRateWarnPct": settings.obs_alert_error_rate_pct,
                "fallbackWarnCount": settings.obs_alert_fallback_count,
            },
            "fallbackEventsTotal": observability.get("fallbacks", {}).get("total", 0),
        },
    }
