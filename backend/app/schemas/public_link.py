from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Literal

class PublicLinkCreate(BaseModel):
    resource_type: Literal["file", "folder"]
    resource_id: UUID
    password: str | None = None
    expires_in_hours: int | None = None

class PublicLinkOut(BaseModel):
    id: UUID
    resource_type: str
    resource_id: UUID
    token: str
    expires_at: datetime | None = None
    created_at: datetime
    has_password: bool = False

class PublicLinkAccess(BaseModel):
    password: str | None = None
    