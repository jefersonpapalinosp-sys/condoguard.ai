from __future__ import annotations

from typing import Any, Literal, TypedDict


EnelRunStatus = Literal["processing", "completed", "completed_with_errors", "failed"]
EnelItemResult = Literal["imported", "skipped", "failed"]
InvoiceStatus = Literal["pending", "paid", "overdue"]


class ParsedEnelInvoiceItem(TypedDict):
    externalReference: str
    unit: str
    resident: str
    reference: str
    dueDate: str
    amount: float
    status: InvoiceStatus
    documentHash: str
    businessKey: str
    notes: str


class ParseFailureItem(TypedDict):
    index: int
    result: Literal["failed"]
    reason: str
    raw: dict[str, Any]

