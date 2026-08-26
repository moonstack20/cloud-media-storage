from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class FolderCreate(BaseModel):
    name: str
    parent_id: UUID | None = None

class FolderRename(BaseModel):
    new_name: str

class FolderOut(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    parent_id: UUID | None = None
    created_at: datetime

class BreadcrumbItem(BaseModel):
    id: UUID
    name: str