import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.core.database import supabase
from app.core.deps import get_current_user
from app.core.security import hash_password, verify_password
from app.schemas.public_link import PublicLinkCreate, PublicLinkOut, PublicLinkAccess

router = APIRouter(prefix="/public-links", tags=["Public Sharing"])


def _verify_ownership(resource_type: str, resource_id: str, user_id: str):
    table = "files" if resource_type == "file" else "folders"
    result = supabase.table(table).select("owner_id").eq("id", resource_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail=f"{resource_type.capitalize()} not found")
    if result.data[0]["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the owner can create public links")


def _to_public_link_out(record: dict) -> dict:
    record["has_password"] = record.get("password_hash") is not None
    return record


@router.post("", response_model=PublicLinkOut)
def create_public_link(payload: PublicLinkCreate, current_user: dict = Depends(get_current_user)):
    _verify_ownership(payload.resource_type, str(payload.resource_id), current_user["id"])

    token = secrets.token_urlsafe(16)
    expires_at = None
    if payload.expires_in_hours:
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=payload.expires_in_hours)).isoformat()

    password_hash = hash_password(payload.password) if payload.password else None

    result = supabase.table("public_links").insert({
        "resource_type": payload.resource_type,
        "resource_id": str(payload.resource_id),
        "owner_id": current_user["id"],
        "token": token,
        "password_hash": password_hash,
        "expires_at": expires_at
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create public link")

    return _to_public_link_out(result.data[0])


@router.get("/resource/{resource_type}/{resource_id}", response_model=list[PublicLinkOut])
def list_public_links(resource_type: str, resource_id: str, current_user: dict = Depends(get_current_user)):
    _verify_ownership(resource_type, resource_id, current_user["id"])
    result = supabase.table("public_links").select("*") \
        .eq("resource_type", resource_type).eq("resource_id", resource_id).execute()
    return [_to_public_link_out(r) for r in result.data]


@router.delete("/{link_id}")
def revoke_public_link(link_id: str, current_user: dict = Depends(get_current_user)):
    link = supabase.table("public_links").select("*").eq("id", link_id).execute()
    if not link.data:
        raise HTTPException(status_code=404, detail="Public link not found")
    if link.data[0]["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the owner can revoke this link")

    supabase.table("public_links").delete().eq("id", link_id).execute()
    return {"message": "Public link revoked successfully"}


@router.post("/access/{token}")
def access_public_link(token: str, payload: PublicLinkAccess):
    link_result = supabase.table("public_links").select("*").eq("token", token).execute()
    if not link_result.data:
        raise HTTPException(status_code=404, detail="Link not found or has been revoked")

    link = link_result.data[0]

    if link["expires_at"]:
        expires_at = datetime.fromisoformat(link["expires_at"])
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=410, detail="This link has expired")

    if link["password_hash"]:
        if not payload.password or not verify_password(payload.password, link["password_hash"]):
            raise HTTPException(status_code=401, detail="Incorrect password")

    if link["resource_type"] == "file":
        resource = supabase.table("files").select("*").eq("id", link["resource_id"]).execute()
        if not resource.data:
            raise HTTPException(status_code=404, detail="File no longer exists")
        file_record = resource.data[0]
        signed_url = supabase.storage.from_("media-files").create_signed_url(
            file_record["storage_path"], 60
        )
        return {
            "resource_type": "file",
            "file_name": file_record["file_name"],
            "download_url": signed_url.get("signedURL") or signed_url.get("signedUrl")
        }
    else:
        resource = supabase.table("folders").select("*").eq("id", link["resource_id"]).execute()
        if not resource.data:
            raise HTTPException(status_code=404, detail="Folder no longer exists")
        folder_record = resource.data[0]
        contents = supabase.table("files").select("*").eq("folder_id", link["resource_id"]).execute()
        return {
            "resource_type": "folder",
            "folder_name": folder_record["name"],
            "files": contents.data
        }
    