from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",          # ✅ অজানা fields ignore করবে
    )

    app_name: str = "Knowledge Brain"
    debug: bool = True
    groq_api_key: str
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    llm_model: str = "llama-3.3-70b-versatile"
    upload_dir: Path = ROOT_DIR / "uploads"
    chroma_db_dir: Path = ROOT_DIR / "chroma_db"
    chunk_size: int = 800
    chunk_overlap: int = 100
    retrieval_k: int = 5
    database_url: str = "postgresql://postgres:password@localhost:5432/knowledge_brain"
    secret_key: str = "your-secret-key-change-in-production"

    # Langfuse — optional
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = "https://cloud.langfuse.com"

settings = Settings()