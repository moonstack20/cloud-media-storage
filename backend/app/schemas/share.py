from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Literal

class ShareCreate(BaseModel):
    resource_type: Literal["file", "folder"]
    resource_id: UUID
    shared_with_email: str
    permission: Literal["viewer", "editor"] = "viewer"

class SharePermissionUpdate(BaseModel):
    permission: Literal["viewer", "editor"]

class ShareOut(BaseModel):
    id: UUID
    resource_type: str
    resource_id: UUID
    owner_id: UUID
    shared_with_id: UUID
    permission: str
    created_at: datetime

