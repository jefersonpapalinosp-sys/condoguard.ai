from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ChatMessageBody(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


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
