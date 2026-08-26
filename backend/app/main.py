from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth
app = FastAPI(title="Cloud Media Storage API")
app.include_router(auth.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
