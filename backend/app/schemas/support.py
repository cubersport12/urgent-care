"""Support chat DTOs."""
from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.content import CamelModel


class SupportMessageCreate(CamelModel):
    body: str = Field(min_length=1, max_length=4000)


class SupportMessageOut(CamelModel):
    id: UUID
    thread_id: UUID = Field(alias="threadId")
    sender_role: str = Field(alias="senderRole")
    sender_id: UUID | None = Field(None, alias="senderId")
    body: str
    created_at: datetime = Field(alias="createdAt")


class SupportThreadOut(CamelModel):
    id: UUID
    user_id: UUID = Field(alias="userId")
    user_email: str | None = Field(None, alias="userEmail")
    user_full_name: str | None = Field(None, alias="userFullName")
    last_message_at: datetime | None = Field(None, alias="lastMessageAt")
    updated_at: datetime = Field(alias="updatedAt")
    last_body: str | None = Field(None, alias="lastBody")


class SupportThreadDetailOut(CamelModel):
    id: UUID
    user_id: UUID = Field(alias="userId")
    user_email: str | None = Field(None, alias="userEmail")
    user_full_name: str | None = Field(None, alias="userFullName")
    messages: list[SupportMessageOut]
