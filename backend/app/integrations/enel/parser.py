from __future__ import annotations

import hashlib
import json
import re
from datetime import date, datetime
from typing import Any

from .types import ParsedEnelInvoiceItem

_MONTH_MAP = {
    "jan": 1,
    "fev": 2,
    "mar": 3,
    "abr": 4,
    "mai": 5,
    "jun": 6,
    "jul": 7,
    "ago": 8,
    "set": 9,
    "out": 10,
    "nov": 11,
    "dez": 12,
}


def _parse_amount(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    raw = str(value or "").strip()
    if not raw:
        raise ValueError("valor ausente")
    cleaned = raw.replace("R$", "").replace(".", "").replace(",", ".").strip()
    parsed = float(cleaned)
    if parsed <= 0:
        raise ValueError("valor deve ser maior que zero")
    return round(parsed, 2)


def _parse_due_date(value: Any) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()

    raw = str(value or "").strip()
    if not raw:
        raise ValueError("dueDate ausente")

    for pattern in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(raw, pattern).date().isoformat()
        except ValueError:
            continue

    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).date().isoformat()
    except ValueError as exc:
        raise ValueError("dueDate invalida") from exc


def _normalize_status(value: Any) -> str:
    raw = str(value or "").strip().lower()
    return raw if raw in {"pending", "paid", "overdue"} else "pending"


def _reference_from_due_date(due_date: str) -> str:
    dt = datetime.strptime(due_date, "%Y-%m-%d")
    return f"{dt.month:02d}/{dt.year}"


def _normalize_reference(value: Any, due_date: str) -> str:
    raw = str(value or "").strip()
    if not raw:
        return _reference_from_due_date(due_date)

    raw_upper = raw.upper()
    if re.fullmatch(r"\d{2}/\d{4}", raw_upper):
        return raw_upper

    if re.fullmatch(r"\d{4}-\d{2}", raw_upper):
        year, month = raw_upper.split("-")
        return f"{month}/{year}"

    if re.fullmatch(r"\d{4}/\d{2}", raw_upper):
        year, month = raw_upper.split("/")
        return f"{month}/{year}"

    month_match = re.fullmatch(r"([A-Z]{3})/(\d{4})", raw_upper)
    if month_match:
        month = _MONTH_MAP.get(month_match.group(1).lower())
        if month:
            return f"{month:02d}/{month_match.group(2)}"

    return _reference_from_due_date(due_date)


def _normalize_unit(value: Any) -> str:
    raw = str(value or "").strip().upper()
    if not raw:
        raise ValueError("unidade ausente")
    normalized = re.sub(r"\s+", "", raw)
    if "-" in normalized:
        return normalized
    pair = re.fullmatch(r"([A-Z]+)(\d+)", normalized)
    if pair:
        return f"{pair.group(1)}-{pair.group(2)}"
    return normalized


def _build_business_key(condominium_id: int, unit: str, reference: str, due_date: str, amount: float) -> str:
    return f"{condominium_id}|{unit}|{reference}|{due_date}|{amount:.2f}".lower()


def _build_document_hash(raw: dict[str, Any], external_reference: str, business_key: str) -> str:
    explicit_hash = str(raw.get("documentHash") or "").strip().lower()
    if explicit_hash:
        return explicit_hash
    digest_source = {
        "externalReference": external_reference,
        "businessKey": business_key,
        "raw": raw,
    }
    raw_digest = json.dumps(digest_source, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(raw_digest).hexdigest()


def parse_enel_invoice_item(raw: dict[str, Any], condominium_id: int) -> ParsedEnelInvoiceItem:
    due_date = _parse_due_date(raw.get("dueDate"))
    amount = _parse_amount(raw.get("amount"))
    unit = _normalize_unit(raw.get("unit"))
    reference = _normalize_reference(raw.get("reference"), due_date)
    external_reference = str(raw.get("externalReference") or raw.get("invoiceNumber") or f"ENEL-{reference}-{unit}").strip()
    if not external_reference:
        external_reference = f"ENEL-{reference}-{unit}"

    business_key = _build_business_key(condominium_id, unit, reference, due_date, amount)
    document_hash = _build_document_hash(raw, external_reference, business_key)

    return {
        "externalReference": external_reference,
        "unit": unit,
        "resident": str(raw.get("resident") or "-").strip() or "-",
        "reference": reference,
        "dueDate": due_date,
        "amount": amount,
        "status": _normalize_status(raw.get("status")),  # type: ignore[typeddict-item]
        "documentHash": document_hash,
        "businessKey": business_key,
        "notes": str(raw.get("notes") or "").strip(),
    }

