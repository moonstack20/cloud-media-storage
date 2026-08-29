import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from datetime import datetime, timezone
from app.core.database import supabase
from app.core.deps import get_current_user
from app.schemas.file import FileOut, FileRename, FileMove, FileStarUpdate

router = APIRouter(prefix="/files", tags=["Files"])

BUCKET_NAME = "media-files"


def _get_owned_file(file_id: str, user_id: str, require_edit: bool = False) -> dict:
    result = supabase.table("files").select("*").eq("id", file_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="File not found")
    file_record = result.data[0]

    if file_record["owner_id"] == user_id:
        return file_record

    share = supabase.table("shares").select("*") \
        .eq("resource_type", "file").eq("resource_id", file_id) \
        .eq("shared_with_id", user_id).execute()

    if not share.data:
        raise HTTPException(status_code=403, detail="Access denied")

    if require_edit and share.data[0]["permission"] != "editor":
        raise HTTPException(status_code=403, detail="Viewer permission does not allow this action")

    return file_record


@router.post("/upload", response_model=FileOut)
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    file_bytes = await file.read()
    file_ext = file.filename.split(".")[-1] if "." in file.filename else ""
    storage_path = f"{current_user['id']}/{uuid.uuid4()}.{file_ext}"

    upload_result = supabase.storage.from_(BUCKET_NAME).upload(
        storage_path,
        file_bytes,
        {"content-type": file.content_type or "application/octet-stream"}
    )

    if hasattr(upload_result, "error") and upload_result.error:
        raise HTTPException(status_code=500, detail="Upload to storage failed")

    result = supabase.table("files").insert({
        "owner_id": current_user["id"],
        "file_name": file.filename,
        "storage_path": storage_path,
        "file_size": len(file_bytes),
        "mime_type": file.content_type
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save file metadata")

    return result.data[0]


@router.get("/download/{file_id}")
def download_file(file_id: str, current_user: dict = Depends(get_current_user)):
    file_record = _get_owned_file(file_id, current_user["id"])

    signed_url = supabase.storage.from_(BUCKET_NAME).create_signed_url(
        file_record["storage_path"], 60
    )

    return {"download_url": signed_url.get("signedURL") or signed_url.get("signedUrl")}


@router.get("", response_model=list[FileOut])
def list_files(current_user: dict = Depends(get_current_user)):
    result = supabase.table("files").select("*") \
        .eq("owner_id", current_user["id"]) \
        .is_("deleted_at", "null").execute()
    return result.data


@router.get("/trash", response_model=list[FileOut])
def list_trash(current_user: dict = Depends(get_current_user)):
    result = supabase.table("files").select("*") \
        .eq("owner_id", current_user["id"]) \
        .not_.is_("deleted_at", "null").execute()
    return result.data


@router.get("/search/query", response_model=list[FileOut])
def search_files(
    q: str | None = None,
    mime_type: str | None = None,
    starred: bool | None = None,
    sort_by: str = "created_at",
    order: str = "desc",
    current_user: dict = Depends(get_current_user)
):
    query = supabase.table("files").select("*") \
        .eq("owner_id", current_user["id"]) \
        .is_("deleted_at", "null")

    if q:
        query = query.ilike("file_name", f"%{q}%")
    if mime_type:
        query = query.ilike("mime_type", f"{mime_type}%")
    if starred is not None:
        query = query.eq("starred", starred)

    valid_sort_fields = {"created_at", "file_name", "file_size"}
    sort_field = sort_by if sort_by in valid_sort_fields else "created_at"
    ascending = order == "asc"

    query = query.order(sort_field, desc=not ascending)

    result = query.execute()
    return result.data


@router.get("/{file_id}", response_model=FileOut)
def get_file_metadata(file_id: str, current_user: dict = Depends(get_current_user)):
    return _get_owned_file(file_id, current_user["id"])


@router.patch("/{file_id}/rename", response_model=FileOut)
def rename_file(file_id: str, payload: FileRename, current_user: dict = Depends(get_current_user)):
    _get_owned_file(file_id, current_user["id"], require_edit=True)
    result = supabase.table("files").update({"file_name": payload.new_name}).eq("id", file_id).execute()
    return result.data[0]


@router.patch("/{file_id}/move", response_model=FileOut)
def move_file(file_id: str, payload: FileMove, current_user: dict = Depends(get_current_user)):
    _get_owned_file(file_id, current_user["id"], require_edit=True)
    folder_id_str = str(payload.folder_id) if payload.folder_id else None
    result = supabase.table("files").update({"folder_id": folder_id_str}).eq("id", file_id).execute()
    return result.data[0]


@router.patch("/{file_id}/star", response_model=FileOut)
def toggle_star(file_id: str, payload: FileStarUpdate, current_user: dict = Depends(get_current_user)):
    _get_owned_file(file_id, current_user["id"])
    result = supabase.table("files").update({"starred": payload.starred}).eq("id", file_id).execute()
    return result.data[0]


@router.delete("/{file_id}")
def delete_file(file_id: str, current_user: dict = Depends(get_current_user)):
    _get_owned_file(file_id, current_user["id"], require_edit=True)
    now = datetime.now(timezone.utc).isoformat()
    supabase.table("files").update({"deleted_at": now}).eq("id", file_id).execute()
    return {"message": "File moved to trash"}


@router.patch("/{file_id}/restore", response_model=FileOut)
def restore_file(file_id: str, current_user: dict = Depends(get_current_user)):
    _get_owned_file(file_id, current_user["id"], require_edit=True)
    result = supabase.table("files").update({"deleted_at": None}).eq("id", file_id).execute()
    return result.data[0]


@router.delete("/{file_id}/permanent")
def permanent_delete_file(file_id: str, current_user: dict = Depends(get_current_user)):
    file_record = _get_owned_file(file_id, current_user["id"], require_edit=True)

    supabase.storage.from_(BUCKET_NAME).remove([file_record["storage_path"]])
    supabase.table("files").delete().eq("id", file_id).execute()

    return {"message": "File permanently deleted"}
