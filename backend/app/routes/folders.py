from fastapi import APIRouter, Depends, HTTPException
from app.core.database import supabase
from app.core.deps import get_current_user
from app.schemas.folder import FolderCreate, FolderRename, FolderOut, BreadcrumbItem

router = APIRouter(prefix="/folders", tags=["Folders"])

def _get_owned_folder(folder_id: str, user_id: str) -> dict:
    result = supabase.table("folders").select("*").eq("id", folder_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Folder not found")
    folder = result.data[0]
    if folder["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return folder

@router.post("", response_model=FolderOut)
def create_folder(payload: FolderCreate, current_user: dict = Depends(get_current_user)):
    if payload.parent_id:
        _get_owned_folder(str(payload.parent_id), current_user["id"])

    result = supabase.table("folders").insert({
        "owner_id": current_user["id"],
        "name": payload.name,
        "parent_id": str(payload.parent_id) if payload.parent_id else None
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create folder")

    return result.data[0]

@router.get("", response_model=list[FolderOut])
def list_folders(parent_id: str | None = None, current_user: dict = Depends(get_current_user)):
    query = supabase.table("folders").select("*").eq("owner_id", current_user["id"])
    if parent_id:
        query = query.eq("parent_id", parent_id)
    else:
        query = query.is_("parent_id", "null")
    result = query.execute()
    return result.data

@router.get("/{folder_id}", response_model=FolderOut)
def get_folder(folder_id: str, current_user: dict = Depends(get_current_user)):
    return _get_owned_folder(folder_id, current_user["id"])

@router.patch("/{folder_id}/rename", response_model=FolderOut)
def rename_folder(folder_id: str, payload: FolderRename, current_user: dict = Depends(get_current_user)):
    _get_owned_folder(folder_id, current_user["id"])
    result = supabase.table("folders").update({"name": payload.new_name}).eq("id", folder_id).execute()
    return result.data[0]

@router.delete("/{folder_id}")
def delete_folder(folder_id: str, current_user: dict = Depends(get_current_user)):
    _get_owned_folder(folder_id, current_user["id"])
    supabase.table("folders").delete().eq("id", folder_id).execute()
    return {"message": "Folder deleted successfully"}

@router.get("/{folder_id}/breadcrumbs", response_model=list[BreadcrumbItem])
def get_breadcrumbs(folder_id: str, current_user: dict = Depends(get_current_user)):
    breadcrumbs = []
    current_id = folder_id

    while current_id:
        folder = _get_owned_folder(current_id, current_user["id"])
        breadcrumbs.insert(0, {"id": folder["id"], "name": folder["name"]})
        current_id = folder["parent_id"]

    return breadcrumbs
