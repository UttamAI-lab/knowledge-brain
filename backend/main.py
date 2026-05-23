from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import settings

from api.documents import router as documents_router
from api.chat import router as chat_router
from api.auth import router as auth_router          # ✅ নতুন
from database.session import create_tables          # ✅ নতুন
from api.admin import router as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.upload_dir.mkdir(exist_ok=True)
    settings.chroma_db_dir.mkdir(exist_ok=True)
    create_tables()                                 # ✅ tables বানাও
    print(f"✅ {settings.app_name} started!")
    yield
    print("👋 Server stopped.")


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)                     # ✅ নতুন
app.include_router(documents_router)
app.include_router(chat_router)
app.include_router(admin_router) 

@app.get("/")
async def root():
    return {"message": f"{settings.app_name} is running! 🚀"}

@app.get("/health")
async def health():
    return {"status": "ok"}