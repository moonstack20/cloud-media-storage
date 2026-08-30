from fastapi import APIRouter, Depends, HTTPException
from app.core.database import supabase
from app.core.deps import get_current_user
from app.core.activity import log_activity
from app.schemas.share import ShareCreate, SharePermissionUpdate, ShareOut

router = APIRouter(prefix="/shares", tags=["Sharing"])


def _verify_ownership(resource_type: str, resource_id: str, user_id: str) -> dict:
    table = "files" if resource_type == "file" else "folders"
    result = supabase.table(table).select("*").eq("id", resource_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail=f"{resource_type.capitalize()} not found")
    if result.data[0]["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the owner can manage sharing")
    return result.data[0]


def _get_resource_name(resource_type: str, resource_id: str) -> str | None:
    table = "files" if resource_type == "file" else "folders"
    name_field = "file_name" if resource_type == "file" else "name"
    result = supabase.table(table).select(name_field).eq("id", resource_id).execute()
    if result.data:
        return result.data[0].get(name_field)
    return None


def _to_share_out(record: dict) -> dict:
    record["resource_name"] = _get_resource_name(record["resource_type"], record["resource_id"])
    return record


@router.post("", response_model=ShareOut)
def share_resource(payload: ShareCreate, current_user: dict = Depends(get_current_user)):
    resource = _verify_ownership(payload.resource_type, str(payload.resource_id), current_user["id"])

    target_user = supabase.table("users").select("id").eq("email", payload.shared_with_email).execute()
    if not target_user.data:
        raise HTTPException(status_code=404, detail="User with that email not found")

    shared_with_id = target_user.data[0]["id"]

    if shared_with_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot share a resource with yourself")

    existing = supabase.table("shares").select("id") \
        .eq("resource_type", payload.resource_type) \
        .eq("resource_id", str(payload.resource_id)) \
        .eq("shared_with_id", shared_with_id).execute()

    if existing.data:
        raise HTTPException(status_code=400, detail="Already shared with this user")

    result = supabase.table("shares").insert({
        "resource_type": payload.resource_type,
        "resource_id": str(payload.resource_id),
        "owner_id": current_user["id"],
        "shared_with_id": shared_with_id,
        "permission": payload.permission
    }).execute()

    resource_name = resource.get("file_name") or resource.get("name")
    sharer_name = current_user.get("full_name") or current_user.get("email")

    supabase.table("notifications").insert({
        "user_id": shared_with_id,
        "message": f'{sharer_name} shared "{resource_name}" with you',
        "resource_type": payload.resource_type,
        "resource_id": str(payload.resource_id)
    }).execute()

    log_activity(current_user["id"], "share", payload.resource_type, str(payload.resource_id), payload.shared_with_email)

    return _to_share_out(result.data[0])


@router.get("/resource/{resource_type}/{resource_id}", response_model=list[ShareOut])
def list_shares_for_resource(resource_type: str, resource_id: str, current_user: dict = Depends(get_current_user)):
    _verify_ownership(resource_type, resource_id, current_user["id"])
    result = supabase.table("shares").select("*") \
        .eq("resource_type", resource_type).eq("resource_id", resource_id).execute()
    return [_to_share_out(r) for r in result.data]


@router.get("/shared-with-me", response_model=list[ShareOut])
def list_shared_with_me(current_user: dict = Depends(get_current_user)):
    result = supabase.table("shares").select("*").eq("shared_with_id", current_user["id"]).execute()
    return [_to_share_out(r) for r in result.data]


@router.patch("/{share_id}", response_model=ShareOut)
def update_permission(share_id: str, payload: SharePermissionUpdate, current_user: dict = Depends(get_current_user)):
    share = supabase.table("shares").select("*").eq("id", share_id).execute()
    if not share.data:
        raise HTTPException(status_code=404, detail="Share not found")
    if share.data[0]["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the owner can update permissions")

    result = supabase.table("shares").update({"permission": payload.permission}).eq("id", share_id).execute()
    return _to_share_out(result.data[0])


@router.delete("/{share_id}")
def revoke_share(share_id: str, current_user: dict = Depends(get_current_user)):
    share = supabase.table("shares").select("*").eq("id", share_id).execute()
    if not share.data:
        raise HTTPException(status_code=404, detail="Share not found")
    if share.data[0]["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the owner can revoke sharing")

    supabase.table("shares").delete().eq("id", share_id).execute()
    return {"message": "Share revoked successfully"}
