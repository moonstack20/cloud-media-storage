from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.user import UserRegister, UserLogin, UserOut, Token
from app.core.security import hash_password, verify_password, create_access_token
from app.core.database import supabase
from app.core.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user: UserRegister):
    existing = supabase.table("users").select("id").eq("email", user.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(user.password)
    result = supabase.table("users").insert({
        "email": user.email,
        "password_hash": hashed,
        "full_name": user.full_name
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create user")

    return result.data[0]

@router.post("/login", response_model=Token)
def login(credentials: UserLogin):
    result = supabase.table("users").select("*").eq("email", credentials.email).execute()

    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = result.data[0]

    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"sub": user["id"]})
    return Token(access_token=token)

@router.get("/me", response_model=UserOut)
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
