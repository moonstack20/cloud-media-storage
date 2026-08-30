from fastapi import APIRouter, Depends, HTTPException
from app.core.database import supabase
from app.core.deps import get_current_user
from app.schemas.notification import NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(current_user: dict = Depends(get_current_user)):
    result = supabase.table("notifications").select("*") \
        .eq("user_id", current_user["id"]) \
        .order("created_at", desc=True).execute()
    return result.data


@router.get("/unread-count")
def unread_count(current_user: dict = Depends(get_current_user)):
    result = supabase.table("notifications").select("id") \
        .eq("user_id", current_user["id"]).eq("read", False).execute()
    return {"count": len(result.data)}


@router.patch("/{notification_id}/read")
def mark_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    notif = supabase.table("notifications").select("*").eq("id", notification_id).execute()
    if not notif.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notif.data[0]["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    supabase.table("notifications").update({"read": True}).eq("id", notification_id).execute()
    return {"message": "Marked as read"}


@router.patch("/read-all")
def mark_all_read(current_user: dict = Depends(get_current_user)):
    supabase.table("notifications").update({"read": True}) \
        .eq("user_id", current_user["id"]).eq("read", False).execute()
    return {"message": "All marked as read"}
