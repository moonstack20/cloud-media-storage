import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.core.database import supabase
from app.core.deps import get_current_user
from app.schemas.file import FileOut

router = APIRouter(prefix="/files", tags=["Files"])

BUCKET_NAME = "media-files"

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
    result = supabase.table("files").select("*").eq("id", file_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="File not found")

    file_record = result.data[0]

    if file_record["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    signed_url = supabase.storage.from_(BUCKET_NAME).create_signed_url(
        file_record["storage_path"], 60
    )

    return {"download_url": signed_url.get("signedURL") or signed_url.get("signedUrl")}

@router.get("", response_model=list[FileOut])
def list_files(current_user: dict = Depends(get_current_user)):
    result = supabase.table("files").select("*").eq("owner_id", current_user["id"]).execute()
    return result.data
