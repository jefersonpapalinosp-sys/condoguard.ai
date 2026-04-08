from __future__ import annotations

import hashlib
import json
import re
from datetime import date, datetime
from typing import Any

from .types import ParsedSabespConsumptionItem

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
        parsed = float(value)
        if parsed <= 0:
            raise ValueError("valor deve ser maior que zero")
        return round(parsed, 2)

    raw = str(value or "").strip()
    if not raw:
        raise ValueError("valor ausente")
    cleaned = raw.replace("R$", "").replace(".", "").replace(",", ".").strip()
    parsed = float(cleaned)
    if parsed <= 0:
        raise ValueError("valor deve ser maior que zero")
    return round(parsed, 2)


def _parse_consumption_m3(value: Any) -> float:
    if isinstance(value, (int, float)):
        parsed = float(value)
        if parsed <= 0:
            raise ValueError("consumptionM3 deve ser maior que zero")
        return round(parsed, 2)

    raw = str(value or "").strip().lower().replace("m3", "").replace("m^3", "")
    if not raw:
        raise ValueError("consumptionM3 ausente")
    cleaned = raw.replace(".", "").replace(",", ".").strip()
    parsed = float(cleaned)
    if parsed <= 0:
        raise ValueError("consumptionM3 deve ser maior que zero")
    return round(parsed, 2)


def _parse_date(value: Any, field_name: str) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()

    raw = str(value or "").strip()
    if not raw:
        raise ValueError(f"{field_name} ausente")

    for pattern in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(raw, pattern).date().isoformat()
        except ValueError:
            continue

    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).date().isoformat()
    except ValueError as exc:
        raise ValueError(f"{field_name} invalida") from exc


def _normalize_status(value: Any) -> str:
    raw = str(value or "").strip().lower()
    return raw if raw in {"pending", "paid", "overdue"} else "pending"


def _reference_from_date(date_iso: str) -> str:
    dt = datetime.strptime(date_iso, "%Y-%m-%d")
    return f"{dt.month:02d}/{dt.year}"


def _normalize_reference(value: Any, date_iso: str) -> str:
    raw = str(value or "").strip()
    if not raw:
        return _reference_from_date(date_iso)

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

    return _reference_from_date(date_iso)


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


def _build_business_key(
    condominium_id: int,
    unit: str,
    reference: str,
    reading_date: str,
    due_date: str,
    consumption_m3: float,
    amount: float,
) -> str:
    return f"{condominium_id}|{unit}|{reference}|{reading_date}|{due_date}|{consumption_m3:.2f}|{amount:.2f}".lower()


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


def parse_sabesp_consumption_item(raw: dict[str, Any], condominium_id: int) -> ParsedSabespConsumptionItem:
    reading_date = _parse_date(raw.get("readingDate"), "readingDate")
    due_date = _parse_date(raw.get("dueDate"), "dueDate")
    amount = _parse_amount(raw.get("amount"))
    consumption_m3 = _parse_consumption_m3(raw.get("consumptionM3"))
    unit = _normalize_unit(raw.get("unit"))
    reference = _normalize_reference(raw.get("reference"), reading_date)
    external_reference = str(raw.get("externalReference") or raw.get("invoiceNumber") or f"SABESP-{reference}-{unit}").strip()
    if not external_reference:
        external_reference = f"SABESP-{reference}-{unit}"

    business_key = _build_business_key(
        condominium_id,
        unit,
        reference,
        reading_date,
        due_date,
        consumption_m3,
        amount,
    )
    document_hash = _build_document_hash(raw, external_reference, business_key)

    return {
        "externalReference": external_reference,
        "unit": unit,
        "resident": str(raw.get("resident") or "-").strip() or "-",
        "reference": reference,
        "readingDate": reading_date,
        "dueDate": due_date,
        "consumptionM3": consumption_m3,
        "amount": amount,
        "status": _normalize_status(raw.get("status")),  # type: ignore[typeddict-item]
        "documentHash": document_hash,
        "businessKey": business_key,
        "notes": str(raw.get("notes") or "").strip(),
    }
