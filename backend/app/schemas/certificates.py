"""Certificate DTOs."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        ser_json_by_alias=True,
    )


class CertificateIssueRequest(CamelModel):
    user_id: UUID = Field(alias="userId")
    # Имя, которое печатается на сертификате; пусто → full_name пользователя → email
    display_name: str | None = Field(None, alias="displayName", max_length=200)


class CertificateOut(CamelModel):
    id: UUID
    number: int
    user_id: UUID = Field(alias="userId")
    full_name: str = Field(alias="fullName")
    file_path: str = Field(alias="filePath")
    issued_at: datetime = Field(alias="issuedAt")


class CertificateVerifyOut(CamelModel):
    number: int
    full_name: str = Field(alias="fullName")
    issued_at: datetime = Field(alias="issuedAt")
    valid: bool = True
