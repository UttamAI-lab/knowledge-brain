from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
import json

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from rag.retriever import retrieve
from rag.memory import build_chat_history, format_history_for_prompt
from database.session import get_db
from database.crud import (
    create_conversation,
    save_message,
    get_conversation_messages,
    get_user_conversations,
)
from auth.roles import get_current_user
from database.models import User
from config import settings

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    question: str
    conversation_id: str | None = None


class Source(BaseModel):
    file: str
    page: int | str
    chunk_preview: str
    rerank_score: float | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source]
    conversation_id: str


# ✅ Memory সহ নতুন PROMPT
PROMPT = ChatPromptTemplate.from_template("""
You are a helpful AI assistant. Answer using ONLY the context below.
If the answer is not in the context, say "This information is not available."

Previous Conversation:
{chat_history}

Context from Documents:
{context}

Current Question: {question}

Answer:
""")


def _get_llm(streaming: bool = False) -> ChatGroq:
    return ChatGroq(
        api_key=settings.groq_api_key,
        model=settings.llm_model,
        temperature=0,
        streaming=streaming,
    )


def _build_sources(docs) -> list[Source]:
    return [
        Source(
            file=doc.metadata.get("source", "unknown"),
            page=doc.metadata.get("page", "N/A"),
            chunk_preview=doc.page_content[:120] + "...",
            rerank_score=doc.metadata.get("rerank_score"),
        )
        for doc in docs
    ]


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="প্রশ্ন খালি রাখা যাবে না।")

    # Conversation তৈরি বা খোঁজো
    if request.conversation_id:
        conv_id = request.conversation_id
    else:
        conv = create_conversation(db, current_user.id, request.question[:50])
        conv_id = conv.id

    # ✅ Chat history লোড করো
    history = build_chat_history(db, conv_id)
    chat_history_text = format_history_for_prompt(history)

    # User message save করো
    save_message(db, conv_id, "user", request.question)

    # RAG
    docs = retrieve(request.question)
    if not docs:
        answer = "কোনো document পাওয়া যায়নি। আগে upload করুন।"
        save_message(db, conv_id, "assistant", answer)
        return ChatResponse(answer=answer, sources=[], conversation_id=conv_id)

    context = "\n\n---\n\n".join(doc.page_content for doc in docs)
    chain = PROMPT | _get_llm() | StrOutputParser()

    answer = chain.invoke({
        "chat_history": chat_history_text,
        "context": context,
        "question": request.question,
    })

    sources = _build_sources(docs)
    save_message(db, conv_id, "assistant", answer, [s.model_dump() for s in sources])

    return ChatResponse(answer=answer, sources=sources, conversation_id=conv_id)


@router.get("/history")
async def chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    convs = get_user_conversations(db, current_user.id)
    return {
        "conversations": [
            {"id": c.id, "title": c.title, "created_at": c.created_at}
            for c in convs
        ]
    }


@router.get("/history/{conversation_id}")
async def conversation_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    messages = get_conversation_messages(db, conversation_id)
    return {
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "sources": json.loads(m.sources),
                "created_at": m.created_at,
            }
            for m in messages
        ]
    }


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not request.conversation_id:
        conv = create_conversation(db, current_user.id, request.question[:50])
        conv_id = conv.id
    else:
        conv_id = request.conversation_id

    # ✅ Chat history লোড করো
    history = build_chat_history(db, conv_id)
    chat_history_text = format_history_for_prompt(history)

    save_message(db, conv_id, "user", request.question)

    docs = retrieve(request.question)
    if not docs:
        async def no_docs():
            yield f"data: {json.dumps({'type': 'error', 'text': 'কোনো document নেই।'})}\n\n"
        return StreamingResponse(no_docs(), media_type="text/event-stream")

    context = "\n\n---\n\n".join(doc.page_content for doc in docs)
    sources = _build_sources(docs)
    chain = PROMPT | _get_llm(streaming=True) | StrOutputParser()
    full_answer = []

    async def generate():
        yield f"data: {json.dumps({'type': 'meta', 'conversation_id': conv_id})}\n\n"
        yield f"data: {json.dumps({'type': 'sources', 'sources': [s.model_dump() for s in sources]})}\n\n"

        async for chunk in chain.astream({
            "chat_history": chat_history_text,
            "context": context,
            "question": request.question,
        }):
            full_answer.append(chunk)
            yield f"data: {json.dumps({'type': 'text', 'text': chunk})}\n\n"

        save_message(
            db, conv_id, "assistant",
            "".join(full_answer),
            [s.model_dump() for s in sources],
        )
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ✅ Feedback endpoint
@router.post("/feedback")
async def submit_feedback(
    message_id: str,
    rating: int,  # 1 = 👍, -1 = 👎
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # feedback DB তে save করবো পরে
    return {"message": "Feedback received!", "rating": rating}