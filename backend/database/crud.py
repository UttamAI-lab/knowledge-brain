from sqlalchemy.orm import Session
import bcrypt
import json

from database.models import User, Conversation, Message, DocumentMeta, UserRole


# ── Password helpers ──────────────────────────────────────
def hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(
        plain.encode("utf-8"),
        hashed.encode("utf-8"),
    )


# ── User ──────────────────────────────────────────────────
def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def create_user(
    db: Session,
    email: str,
    name: str,
    password: str,
    role: UserRole = UserRole.employee,
) -> User:
    user = User(
        email=email,
        name=name,
        password=hash_password(password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_all_users(db: Session) -> list[User]:
    return db.query(User).all()


# ── Conversation ──────────────────────────────────────────
def create_conversation(
    db: Session, user_id: str, title: str = "New Chat"
) -> Conversation:
    conv = Conversation(user_id=user_id, title=title)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def get_user_conversations(db: Session, user_id: str) -> list[Conversation]:
    return (
        db.query(Conversation)
        .filter(Conversation.user_id == user_id)
        .order_by(Conversation.created_at.desc())
        .all()
    )


# ── Message ───────────────────────────────────────────────
def save_message(
    db: Session,
    conversation_id: str,
    role: str,
    content: str,
    sources: list = [],
) -> Message:
    msg = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        sources=json.dumps(sources),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def get_conversation_messages(
    db: Session, conversation_id: str
) -> list[Message]:
    return (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )


# ── Document ──────────────────────────────────────────────
def save_document_meta(
    db: Session,
    filename: str,
    uploaded_by: str,
    size_kb: int,
    chunks_count: int,
) -> DocumentMeta:
    doc = DocumentMeta(
        filename=filename,
        uploaded_by=uploaded_by,
        size_kb=size_kb,
        chunks_count=chunks_count,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def get_all_documents(db: Session) -> list[DocumentMeta]:
    return (
        db.query(DocumentMeta)
        .order_by(DocumentMeta.created_at.desc())
        .all()
    )