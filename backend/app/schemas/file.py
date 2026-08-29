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
    starred: bool = False
    deleted_at: datetime | None = None
    created_at: datetime
class FileRename(BaseModel):
    new_name: str

class FileMove(BaseModel):
    folder_id: UUID | None = None    

class FileStarUpdate(BaseModel):
    starred: bool

class FileVersionOut(BaseModel):
    id: UUID
    file_id: UUID
    storage_path: str
    file_size: int | None = None
    version_number: int
    created_at: datetime
