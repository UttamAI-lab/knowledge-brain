from sentence_transformers import CrossEncoder
from langchain_core.documents import Document

# Model একবার load হবে — memory efficient
_reranker = None


def get_reranker() -> CrossEncoder:
    global _reranker
    if _reranker is None:
        # প্রথমবার ~100MB download হবে
        _reranker = CrossEncoder(
            "cross-encoder/ms-marco-MiniLM-L-6-v2",
            max_length=512,
        )
    return _reranker


def rerank(query: str, docs: list[Document], top_k: int = 4) -> list[Document]:
    """
    Hybrid search এর পর আরেকবার rank করো।
    Query + chunk pair কে score করে best ones বেছে নেয়।
    """
    if not docs:
        return []

    reranker = get_reranker()

    # (query, chunk) pairs বানাও
    pairs = [[query, doc.page_content] for doc in docs]

    # Score করো
    scores = reranker.predict(pairs)

    # Score অনুযায়ী sort করো
    ranked = sorted(
        zip(docs, scores),
        key=lambda x: x[1],
        reverse=True,
    )

    # Score metadata-তে রাখো
    result = []
    for doc, score in ranked[:top_k]:
        doc.metadata["rerank_score"] = round(float(score), 4)
        result.append(doc)

    return result