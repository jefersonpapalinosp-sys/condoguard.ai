from __future__ import annotations

from typing import Any, Literal, TypedDict


SabespRunStatus = Literal["processing", "completed", "completed_with_errors", "failed"]
SabespItemResult = Literal["imported", "skipped", "failed"]
ImportStatus = Literal["pending", "paid", "overdue"]


class ParsedSabespConsumptionItem(TypedDict):
    externalReference: str
    unit: str
    resident: str
    reference: str
    readingDate: str
    dueDate: str
    consumptionM3: float
    amount: float
    status: ImportStatus
    documentHash: str
    businessKey: str
    notes: str


class ParseFailureItem(TypedDict):
    index: int
    result: Literal["failed"]
    reason: str
    raw: dict[str, Any]
