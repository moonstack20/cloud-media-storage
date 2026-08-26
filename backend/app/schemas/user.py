from pydantic import BaseModel, EmailStr
from datetime import datetime
from uuid import UUID

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None

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