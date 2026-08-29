from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class ActivityLogOut(BaseModel):
    id: UUID
    user_id: UUID
    action: str
    resource_type: str
    resource_id: UUID | None = None
    resource_name: str | None = None
    metadata: dict | None = None
    created_at: datetime
