"""Auth DTOs."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.city import CityOut


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    full_name: str = Field(default="", max_length=200)
    name: str | None = Field(None, max_length=200)
    city_id: UUID | None = None


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, max_length=200)
    city_id: UUID | None = None


class LoginJson(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=100)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str
    city_id: UUID | None = None
    city: CityOut | None = None
    role: str
    is_active: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class TokenRefresh(BaseModel):
    refresh_token: str


class TokenRefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class ForgotPassword(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    password: str = Field(min_length=6, max_length=100)
