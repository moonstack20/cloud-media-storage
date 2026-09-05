from fastapi import APIRouter, Depends, HTTPException
from app.core.database import supabase
from app.core.deps import get_current_user
from app.schemas.tag import TagCreate, TagOut, TagAttach

router = APIRouter(prefix="/tags", tags=["Tags"])


@router.post("", response_model=TagOut)
def create_tag(payload: TagCreate, current_user: dict = Depends(get_current_user)):
    existing = supabase.table("tags").select("id") \
        .eq("owner_id", current_user["id"]).eq("name", payload.name).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Tag with this name already exists")

    result = supabase.table("tags").insert({
        "owner_id": current_user["id"],
        "name": payload.name,
        "color": payload.color
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create tag")

    return result.data[0]


@router.get("", response_model=list[TagOut])
def list_tags(current_user: dict = Depends(get_current_user)):
    result = supabase.table("tags").select("*").eq("owner_id", current_user["id"]).execute()
    return result.data


@router.delete("/{tag_id}")
def delete_tag(tag_id: str, current_user: dict = Depends(get_current_user)):
    tag = supabase.table("tags").select("*").eq("id", tag_id).execute()
    if not tag.data:
        raise HTTPException(status_code=404, detail="Tag not found")
    if tag.data[0]["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    supabase.table("tags").delete().eq("id", tag_id).execute()
    return {"message": "Tag deleted"}


def _verify_file_owner(file_id: str, user_id: str):
    file_result = supabase.table("files").select("owner_id").eq("id", file_id).execute()
    if not file_result.data:
        raise HTTPException(status_code=404, detail="File not found")
    if file_result.data[0]["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")


@router.post("/files/{file_id}/attach")
def attach_tag(file_id: str, payload: TagAttach, current_user: dict = Depends(get_current_user)):
    _verify_file_owner(file_id, current_user["id"])

    tag = supabase.table("tags").select("*").eq("id", str(payload.tag_id)).execute()
    if not tag.data or tag.data[0]["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Tag not found")

    existing = supabase.table("file_tags").select("*") \
        .eq("file_id", file_id).eq("tag_id", str(payload.tag_id)).execute()
    if existing.data:
        return {"message": "Tag already attached"}

    supabase.table("file_tags").insert({
        "file_id": file_id,
        "tag_id": str(payload.tag_id)
    }).execute()

    return {"message": "Tag attached"}


@router.delete("/files/{file_id}/detach/{tag_id}")
def detach_tag(file_id: str, tag_id: str, current_user: dict = Depends(get_current_user)):
    _verify_file_owner(file_id, current_user["id"])

    supabase.table("file_tags").delete().eq("file_id", file_id).eq("tag_id", tag_id).execute()
    return {"message": "Tag detached"}


@router.get("/files/{file_id}", response_model=list[TagOut])
def get_file_tags(file_id: str, current_user: dict = Depends(get_current_user)):
    _verify_file_owner(file_id, current_user["id"])

    links = supabase.table("file_tags").select("tag_id").eq("file_id", file_id).execute()
    if not links.data:
        return []

    tag_ids = [l["tag_id"] for l in links.data]
    result = supabase.table("tags").select("*").in_("id", tag_ids).execute()
    return result.data


@router.get("/{tag_id}/files")
def get_files_by_tag(tag_id: str, current_user: dict = Depends(get_current_user)):
    tag = supabase.table("tags").select("*").eq("id", tag_id).execute()
    if not tag.data or tag.data[0]["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Tag not found")

    links = supabase.table("file_tags").select("file_id").eq("tag_id", tag_id).execute()
    if not links.data:
        return []

    file_ids = [l["file_id"] for l in links.data]
    result = supabase.table("files").select("*").in_("id", file_ids).is_("deleted_at", "null").execute()
    return result.data
