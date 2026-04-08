from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.core.config import settings
from app.core.tenancy import ensure_condominium_id
from app.observability.metrics_store import get_observability_metrics_snapshot

# In-memory threshold overrides (live until process restart)
_threshold_overrides: dict[str, int] = {}


def get_thresholds() -> dict[str, int]:
    return {
        "latencyP95WarnMs": _threshold_overrides.get("latencyP95WarnMs", settings.obs_alert_p95_latency_ms),
        "errorRateWarnPct": _threshold_overrides.get("errorRateWarnPct", settings.obs_alert_error_rate_pct),
        "fallbackWarnCount": _threshold_overrides.get("fallbackWarnCount", settings.obs_alert_fallback_count),
    }


def update_thresholds(condominium_id: int, payload: dict[str, Any]) -> dict[str, int]:
    ensure_condominium_id(condominium_id)
    for key in ("latencyP95WarnMs", "errorRateWarnPct", "fallbackWarnCount"):
        if payload.get(key) is not None:
            _threshold_overrides[key] = int(payload[key])
    return get_thresholds()


def get_settings_data(condominium_id: int) -> dict[str, Any]:
    condominium_id = ensure_condominium_id(condominium_id)
    observability = get_observability_metrics_snapshot(5, 5)
    thresholds = get_thresholds()
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
            "oidcRoleClaim": settings.oidc_role_claim,
            "oidcTenantClaim": settings.oidc_tenant_claim,
            "oidcAllowedAlgs": settings.oidc_allowed_algorithms,
            "oidcReady": settings.oidc_ready,
            "oidcMissingConfig": settings.oidc_missing_fields,
            "oidcIssues": settings.oidc_readiness_issues,
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
            "thresholds": thresholds,
            "fallbackEventsTotal": observability.get("fallbacks", {}).get("total", 0),
        },
    }
