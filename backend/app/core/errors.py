from __future__ import annotations

from fastapi import HTTPException


class ApiRequestError(HTTPException):
    def __init__(self, status_code: int, code: str, message: str, details: dict | None = None):
        self.code = code
        self.message = message
        self.details = details
        super().__init__(status_code=status_code, detail={"code": code, "message": message, "details": details})


def summarize_oracle_error(error: Exception) -> str:
    raw = str(error or "oracle_unavailable").strip()
    if not raw:
        return "oracle_unavailable"
    return " ".join(raw.split())[:160]


def create_oracle_unavailable_error(error: Exception) -> ApiRequestError:
    return ApiRequestError(
        status_code=503,
        code="ORACLE_UNAVAILABLE",
        message="Oracle indisponivel para este ambiente.",
        details={"fallbackAllowed": False, "summary": summarize_oracle_error(error)},
    )
