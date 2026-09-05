from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class TagCreate(BaseModel):
    name: str
    color: str = "#B08D57"

class TagOut(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    color: str
    created_at: datetime

class TagAttach(BaseModel):
    tag_id: UUID
