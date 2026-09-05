import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth
from app.routes import files
from app.routes import shares
from app.routes import folders
from app.routes import public_links
from app.routes import activity
from app.routes import notifications
from app.routes import tags

app = FastAPI(title="Cloud Media Storage API")

app.include_router(auth.router)
app.include_router(files.router)
app.include_router(shares.router)
app.include_router(folders.router)
app.include_router(public_links.router)
app.include_router(activity.router)
app.include_router(notifications.router)
app.include_router(tags.router)

default_origins = "http://localhost:5173"
cors_origins_env = os.environ.get("CORS_ORIGINS", default_origins)
allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "message": "Cloud Media Storage API running"}

@app.get("/health")
def health():
    return {"status": "healthy"}
