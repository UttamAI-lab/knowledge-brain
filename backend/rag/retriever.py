from langchain_chroma import Chroma
from langchain_core.documents import Document
from rank_bm25 import BM25Okapi

from embeddings.embedder import get_embedder
from rag.reranker import rerank          # ✅ নতুন import
from config import settings


def _get_all_chunks() -> list[Document]:
    store = Chroma(
        collection_name="knowledge_brain",
        embedding_function=get_embedder(),
        persist_directory=str(settings.chroma_db_dir),
    )
    result = store.get(include=["documents", "metadatas"])
    docs = []
    for text, meta in zip(result["documents"], result["metadatas"]):
        docs.append(Document(page_content=text, metadata=meta or {}))
    return docs


def _bm25_search(
    query: str, docs: list[Document], top_k: int
) -> list[tuple[Document, float]]:
    if not docs:
        return []
    tokenized = [doc.page_content.lower().split() for doc in docs]
    bm25 = BM25Okapi(tokenized)
    scores = bm25.get_scores(query.lower().split())
    ranked = sorted(zip(docs, scores), key=lambda x: x[1], reverse=True)
    return ranked[:top_k]


def _embedding_search(
    query: str, top_k: int
) -> list[tuple[Document, float]]:
    store = Chroma(
        collection_name="knowledge_brain",
        embedding_function=get_embedder(),
        persist_directory=str(settings.chroma_db_dir),
    )
    results = store.similarity_search_with_score(query, k=top_k)
    return [(doc, 1 - score) for doc, score in results]


def _reciprocal_rank_fusion(
    bm25_results: list[tuple[Document, float]],
    embed_results: list[tuple[Document, float]],
    k: int = 60,
) -> list[Document]:
    scores: dict[str, float] = {}
    doc_map: dict[str, Document] = {}

    for rank, (doc, _) in enumerate(bm25_results):
        key = doc.page_content[:100]
        scores[key] = scores.get(key, 0) + 1 / (k + rank + 1)
        doc_map[key] = doc

    for rank, (doc, _) in enumerate(embed_results):
        key = doc.page_content[:100]
        scores[key] = scores.get(key, 0) + 1 / (k + rank + 1)
        doc_map[key] = doc

    sorted_keys = sorted(scores, key=lambda x: scores[x], reverse=True)
    return [doc_map[key] for key in sorted_keys]


def retrieve(query: str) -> list[Document]:
    """
    Full pipeline:
    BM25 + Embedding → RRF Fusion → Re-Ranking
    """
    # বেশি candidates নিয়ে পরে reranker filter করবে
    candidate_k = settings.retrieval_k * 3

    all_docs = _get_all_chunks()
    if not all_docs:
        return []

    # Step 1: Hybrid search
    bm25_results = _bm25_search(query, all_docs, candidate_k)
    embed_results = _embedding_search(query, candidate_k)

    # Step 2: RRF Fusion
    fused = _reciprocal_rank_fusion(bm25_results, embed_results)

    # Step 3: ✅ Re-Ranking — সবচেয়ে relevant বেছে নাও
    reranked = rerank(query, fused, top_k=settings.retrieval_k)

    return reranked