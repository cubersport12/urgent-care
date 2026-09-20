"""Auth DTOs."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.city import CityOut


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    city_id: UUID | None = None


class DeviceInfo(BaseModel):
    device_name: str | None = Field(None, max_length=200)


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, max_length=200)
    city_id: UUID | None = None
    birth_year: int | None = Field(None, ge=1900, le=datetime.now().year)
    occupation: str | None = Field(None, max_length=100)


class LoginJson(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=100)
    device_name: str | None = Field(None, max_length=200)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str
    city_id: UUID | None = None
    city: CityOut | None = None
    avatar_key: str | None = None
    birth_year: int | None = None
    occupation: str | None = None
    role: str
    is_active: bool
    email_verified: bool = False
    created_at: datetime


class SessionCreated(BaseModel):
    session_id: UUID
    user: UserOut


class SessionLogout(BaseModel):
    session_id: UUID


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    device_name: str | None = None
    created_at: datetime
    last_active_at: datetime
    expires_at: datetime
    ended_at: datetime | None = None


class DeleteAccount(BaseModel):
    password: str = Field(min_length=1, max_length=100)


class ForgotPassword(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    password: str = Field(min_length=6, max_length=100)


class RegisterOut(BaseModel):
    status: str = "verification_email_sent"


class VerifyEmail(BaseModel):
    token: str = Field(min_length=10, max_length=500)


class ResendVerification(BaseModel):
    email: EmailStr


class LoginCodeRequest(BaseModel):
    email: EmailStr


class LoginCodeVerify(BaseModel):
    email: EmailStr
    code: str = Field(pattern=r"^\d{6}$")
    device_name: str | None = Field(None, max_length=200)
