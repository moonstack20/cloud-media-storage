from fastapi import APIRouter, Depends
from app.core.database import supabase
from app.core.deps import get_current_user
from app.schemas.activity import ActivityLogOut

router = APIRouter(prefix="/activity", tags=["Activity"])

@router.get("", response_model=list[ActivityLogOut])
def get_activity(limit: int = 50, current_user: dict = Depends(get_current_user)):
    result = supabase.table("activity_logs").select("*") \
        .eq("user_id", current_user["id"]) \
        .order("created_at", desc=True) \
        .limit(limit).execute()
    return result.data
