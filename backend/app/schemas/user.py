import re
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from uuid import UUID


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v):
        if v is None or v.strip() == "":
            return v
        if not re.fullmatch(r"[A-Za-z ]+", v):
            raise ValueError("Name can only contain letters and spaces")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[^A-Za-z0-9]", v):
            raise ValueError("Password must contain at least one symbol")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str | None = None
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
