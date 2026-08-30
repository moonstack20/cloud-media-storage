from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class NotificationOut(BaseModel):
    id: UUID
    user_id: UUID
    message: str
    resource_type: str | None = None
    resource_id: UUID | None = None
    read: bool = False
    created_at: datetime
