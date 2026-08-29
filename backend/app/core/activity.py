from app.core.database import supabase

def log_activity(user_id: str, action: str, resource_type: str, resource_id: str = None,
                  resource_name: str = None, metadata: dict = None):
    try:
        supabase.table("activity_logs").insert({
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "resource_name": resource_name,
            "metadata": metadata
        }).execute()
    except Exception:
        pass
