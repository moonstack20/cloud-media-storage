import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from datetime import datetime, timezone
from app.core.database import supabase
from app.core.deps import get_current_user
from app.core.activity import log_activity
from app.schemas.file import FileOut, FileRename, FileMove, FileStarUpdate, FileVersionOut

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

    QUOTA_LIMIT_BYTES = 10 * 1024 * 1024 * 1024
    existing_files = supabase.table("files").select("file_size") \
        .eq("owner_id", current_user["id"]).is_("deleted_at", "null").execute()
    used_bytes = sum(f["file_size"] or 0 for f in existing_files.data)
    if used_bytes + len(file_bytes) > QUOTA_LIMIT_BYTES:
        raise HTTPException(status_code=413, detail="Storage quota exceeded")
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

    file_record = result.data[0]
    log_activity(current_user["id"], "upload", "file", file_record["id"], file_record["file_name"])

    return file_record


@router.get("/download/{file_id}")
def download_file(file_id: str, current_user: dict = Depends(get_current_user)):
    file_record = _get_owned_file(file_id, current_user["id"])

    signed_url = supabase.storage.from_(BUCKET_NAME).create_signed_url(
        file_record["storage_path"], 60
    )

    log_activity(current_user["id"], "download", "file", file_id, file_record["file_name"])

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
    old_file = _get_owned_file(file_id, current_user["id"], require_edit=True)
    result = supabase.table("files").update({"file_name": payload.new_name}).eq("id", file_id).execute()

    log_activity(current_user["id"], "rename", "file", file_id, payload.new_name,
                 metadata={"old_name": old_file["file_name"], "new_name": payload.new_name})

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
    file_record = _get_owned_file(file_id, current_user["id"], require_edit=True)
    now = datetime.now(timezone.utc).isoformat()
    supabase.table("files").update({"deleted_at": now}).eq("id", file_id).execute()

    log_activity(current_user["id"], "delete", "file", file_id, file_record["file_name"])

    return {"message": "File moved to trash"}


@router.patch("/{file_id}/restore", response_model=FileOut)
def restore_file(file_id: str, current_user: dict = Depends(get_current_user)):
    file_record = _get_owned_file(file_id, current_user["id"], require_edit=True)
    result = supabase.table("files").update({"deleted_at": None}).eq("id", file_id).execute()

    log_activity(current_user["id"], "restore", "file", file_id, file_record["file_name"])

    return result.data[0]


@router.delete("/{file_id}/permanent")
def permanent_delete_file(file_id: str, current_user: dict = Depends(get_current_user)):
    file_record = _get_owned_file(file_id, current_user["id"], require_edit=True)

    supabase.storage.from_(BUCKET_NAME).remove([file_record["storage_path"]])
    supabase.table("files").delete().eq("id", file_id).execute()

    return {"message": "File permanently deleted"}


@router.post("/{file_id}/versions", response_model=FileOut)
async def upload_new_version(
    file_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    current = _get_owned_file(file_id, current_user["id"], require_edit=True)

    existing_versions = supabase.table("file_versions").select("version_number") \
        .eq("file_id", file_id).order("version_number", desc=True).limit(1).execute()

    next_version_number = (existing_versions.data[0]["version_number"] + 1) if existing_versions.data else 1

    supabase.table("file_versions").insert({
        "file_id": file_id,
        "storage_path": current["storage_path"],
        "file_size": current["file_size"],
        "version_number": next_version_number
    }).execute()

    file_bytes = await file.read()
    file_ext = file.filename.split(".")[-1] if "." in file.filename else ""
    new_storage_path = f"{current_user['id']}/{uuid.uuid4()}.{file_ext}"

    supabase.storage.from_(BUCKET_NAME).upload(
        new_storage_path,
        file_bytes,
        {"content-type": file.content_type or "application/octet-stream"}
    )

    result = supabase.table("files").update({
        "storage_path": new_storage_path,
        "file_size": len(file_bytes),
        "mime_type": file.content_type
    }).eq("id", file_id).execute()

    log_activity(current_user["id"], "upload_version", "file", file_id, current["file_name"])

    return result.data[0]


@router.get("/{file_id}/versions", response_model=list[FileVersionOut])
def list_versions(file_id: str, current_user: dict = Depends(get_current_user)):
    _get_owned_file(file_id, current_user["id"])
    result = supabase.table("file_versions").select("*") \
        .eq("file_id", file_id).order("version_number", desc=True).execute()
    return result.data


@router.post("/{file_id}/versions/{version_id}/restore", response_model=FileOut)
def restore_version(file_id: str, version_id: str, current_user: dict = Depends(get_current_user)):
    current = _get_owned_file(file_id, current_user["id"], require_edit=True)

    version_result = supabase.table("file_versions").select("*").eq("id", version_id).execute()
    if not version_result.data:
        raise HTTPException(status_code=404, detail="Version not found")
    version = version_result.data[0]

    if version["file_id"] != file_id:
        raise HTTPException(status_code=400, detail="Version does not belong to this file")

    existing_versions = supabase.table("file_versions").select("version_number") \
        .eq("file_id", file_id).order("version_number", desc=True).limit(1).execute()
    next_version_number = (existing_versions.data[0]["version_number"] + 1) if existing_versions.data else 1

    supabase.table("file_versions").insert({
        "file_id": file_id,
        "storage_path": current["storage_path"],
        "file_size": current["file_size"],
        "version_number": next_version_number
    }).execute()

    result = supabase.table("files").update({
        "storage_path": version["storage_path"],
        "file_size": version["file_size"]
    }).eq("id", file_id).execute()

    log_activity(current_user["id"], "restore_version", "file", file_id, current["file_name"],
                 metadata={"restored_version": version["version_number"]})

    return result.data[0]


@router.get("/{file_id}/versions/{version_id}/download")
def download_version(file_id: str, version_id: str, current_user: dict = Depends(get_current_user)):
    _get_owned_file(file_id, current_user["id"])

    version_result = supabase.table("file_versions").select("*").eq("id", version_id).execute()
    if not version_result.data:
        raise HTTPException(status_code=404, detail="Version not found")
    version = version_result.data[0]

    signed_url = supabase.storage.from_(BUCKET_NAME).create_signed_url(version["storage_path"], 60)
    return {"download_url": signed_url.get("signedURL") or signed_url.get("signedUrl")}


PREVIEWABLE_TYPES = ("image/", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")


@router.get("/{file_id}/preview")
def preview_file(file_id: str, current_user: dict = Depends(get_current_user)):
    file_record = _get_owned_file(file_id, current_user["id"])

    mime_type = file_record.get("mime_type") or ""
    is_previewable = mime_type.startswith(PREVIEWABLE_TYPES)

    if not is_previewable:
        return {"previewable": False, "preview_url": None, "mime_type": mime_type}

    signed_url = supabase.storage.from_(BUCKET_NAME).create_signed_url(
        file_record["storage_path"], 300
    )

    return {
        "previewable": True,
        "preview_url": signed_url.get("signedURL") or signed_url.get("signedUrl"),
        "mime_type": mime_type
    }


@router.get("/quota/usage")
def get_storage_quota(current_user: dict = Depends(get_current_user)):
    QUOTA_LIMIT_BYTES = 10 * 1024 * 1024 * 1024

    result = supabase.table("files").select("file_size") \
        .eq("owner_id", current_user["id"]) \
        .is_("deleted_at", "null").execute()

    used_bytes = sum(f["file_size"] or 0 for f in result.data)

    return {
        "used_bytes": used_bytes,
        "limit_bytes": QUOTA_LIMIT_BYTES,
        "used_percent": round((used_bytes / QUOTA_LIMIT_BYTES) * 100, 2),
        "remaining_bytes": max(0, QUOTA_LIMIT_BYTES - used_bytes)
    }
