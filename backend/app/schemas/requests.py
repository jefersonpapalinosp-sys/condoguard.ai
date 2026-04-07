from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ChatMessageBody(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    sessionId: str | None = Field(default=None, max_length=128)


class ChatFeedbackBody(BaseModel):
    messageId: str = Field(min_length=1, max_length=120)
    rating: Literal["up", "down"]
    comment: str | None = Field(default=None, max_length=500)


class CadastroCreateBody(BaseModel):
    tipo: Literal["unidade", "morador", "fornecedor", "servico"]
    titulo: str = Field(min_length=1, max_length=120)
    descricao: str = Field(min_length=1, max_length=240)
    status: Literal["active", "pending", "inactive"]


class CadastroStatusBody(BaseModel):
    status: Literal["active", "pending", "inactive"]


class ContractCreateBody(BaseModel):
    contractNumber: str | None = Field(default=None, max_length=60)
    name: str = Field(min_length=1, max_length=180)
    supplier: str = Field(min_length=1, max_length=180)
    category: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    serviceType: str = Field(min_length=1, max_length=180)
    startDate: str = Field(min_length=10, max_length=10)
    endDate: str = Field(min_length=10, max_length=10)
    termMonths: int | None = Field(default=None, ge=1, le=240)
    monthlyValue: float = Field(gt=0, le=999999999)
    index: Literal["IPCA", "IGPM", "INPC", "FIXO"] = "IPCA"
    adjustmentFrequencyMonths: int = Field(default=12, ge=1, le=24)
    nextAdjustmentDate: str | None = Field(default=None, min_length=10, max_length=10)
    internalOwner: str = Field(min_length=1, max_length=120)
    status: Literal["active", "expiring", "expired", "renewal_pending", "closed", "draft"] = "active"
    risk: Literal["low", "medium", "high"] = "low"
    notes: str | None = Field(default=None, max_length=500)


class ContractUpdateBody(BaseModel):
    contractNumber: str | None = Field(default=None, max_length=60)
    name: str | None = Field(default=None, min_length=1, max_length=180)
    supplier: str | None = Field(default=None, min_length=1, max_length=180)
    category: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    serviceType: str | None = Field(default=None, min_length=1, max_length=180)
    startDate: str | None = Field(default=None, min_length=10, max_length=10)
    endDate: str | None = Field(default=None, min_length=10, max_length=10)
    termMonths: int | None = Field(default=None, ge=1, le=240)
    monthlyValue: float | None = Field(default=None, gt=0, le=999999999)
    index: Literal["IPCA", "IGPM", "INPC", "FIXO"] | None = None
    adjustmentFrequencyMonths: int | None = Field(default=None, ge=1, le=24)
    nextAdjustmentDate: str | None = Field(default=None, min_length=10, max_length=10)
    internalOwner: str | None = Field(default=None, min_length=1, max_length=120)
    status: Literal["active", "expiring", "expired", "renewal_pending", "closed", "draft"] | None = None
    risk: Literal["low", "medium", "high"] | None = None
    notes: str | None = Field(default=None, max_length=500)


class ContractDocumentCreateBody(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: str = Field(min_length=1, max_length=80)
    sizeKb: float = Field(ge=0, le=102400)
    status: Literal["active", "archived", "pending_review"] = "active"
    url: str | None = Field(default=None, max_length=500)


class EnelInvoiceInputBody(BaseModel):
    externalReference: str | None = Field(default=None, max_length=120)
    unit: str = Field(min_length=1, max_length=30)
    resident: str | None = Field(default=None, max_length=180)
    reference: str | None = Field(default=None, max_length=20)
    dueDate: str = Field(min_length=8, max_length=30)
    amount: float = Field(gt=0, le=999999999)
    status: Literal["pending", "paid", "overdue"] = "pending"
    documentHash: str | None = Field(default=None, max_length=128)
    notes: str | None = Field(default=None, max_length=300)


class EnelRunCreateBody(BaseModel):
    source: Literal["manual_assisted", "upload_csv", "api_partner"] = "manual_assisted"
    notes: str | None = Field(default=None, max_length=500)
    items: list[EnelInvoiceInputBody] = Field(min_length=1, max_length=500)
