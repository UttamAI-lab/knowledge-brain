from langfuse import Langfuse
from config import settings
from datetime import datetime

# Langfuse client
_langfuse = None

def get_langfuse() -> Langfuse | None:
    global _langfuse
    if not settings.langfuse_secret_key:
        return None  # key না থাকলে skip করো
    if _langfuse is None:
        _langfuse = Langfuse(
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
            host=settings.langfuse_host,
        )
    return _langfuse


def track_chat(
    user_id: str,
    question: str,
    answer: str,
    sources: list,
    latency_ms: int,
):
    """প্রতিটা chat Langfuse এ track করো।"""
    lf = get_langfuse()
    if not lf:
        return

    trace = lf.trace(
        name="rag-chat",
        user_id=user_id,
        metadata={
            "sources_count": len(sources),
            "latency_ms": latency_ms,
        },
    )

    trace.span(
        name="retrieval",
        metadata={"chunks_retrieved": len(sources)},
    )

    trace.generation(
        name="llm-response",
        input=question,
        output=answer,
        metadata={"model": settings.llm_model},
    )