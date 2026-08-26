from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class FileOut(BaseModel):
    id: UUID
    owner_id: UUID
    file_name: str
    storage_path: str
    file_size: int | None = None
    mime_type: str | None = None
    folder_id: UUID | None = None
    created_at: datetime
    