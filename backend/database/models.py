from sqlalchemy import (
    Column, String, Integer, Text,
    DateTime, ForeignKey, Enum, Boolean
)
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.sql import func
import enum
import uuid


class Base(DeclarativeBase):
    pass


class UserRole(str, enum.Enum):
    admin    = "admin"
    manager  = "manager"
    employee = "employee"


class User(Base):
    __tablename__ = "users"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email      = Column(String, unique=True, nullable=False, index=True)
    name       = Column(String, nullable=False)
    password   = Column(String, nullable=False)  # bcrypt hash
    role       = Column(Enum(UserRole), default=UserRole.employee)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversations = relationship("Conversation", back_populates="user")


class Conversation(Base):
    __tablename__ = "conversations"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id"), nullable=False)
    title      = Column(String, default="New Chat")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user     = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")


class Message(Base):
    __tablename__ = "messages"

    id              = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    role            = Column(String, nullable=False)  # "user" | "assistant"
    content         = Column(Text, nullable=False)
    sources         = Column(Text, default="[]")  # JSON string
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("Conversation", back_populates="messages")


class DocumentMeta(Base):
    __tablename__ = "documents"

    id           = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename     = Column(String, nullable=False)
    uploaded_by  = Column(String, ForeignKey("users.id"))
    size_kb      = Column(Integer)
    chunks_count = Column(Integer)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())