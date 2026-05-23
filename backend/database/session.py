from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,   # connection alive কিনা check করে
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency — request শেষে auto close।"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """সব tables বানাও।"""
    from database.models import Base
    Base.metadata.create_all(bind=engine)