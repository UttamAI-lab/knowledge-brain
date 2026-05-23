from pathlib import Path
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_core.documents import Document

from embeddings.embedder import get_embedder
from loaders.pdf_loader import load_pdf
from loaders.docx_loader import load_docx
from config import settings


def load_documents(file_path: Path) -> list[Document]:
    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        return load_pdf(file_path)
    elif suffix in (".docx", ".doc"):
        return load_docx(file_path)
    else:
        raise ValueError(f"Unsupported file type: {suffix}")


def chunk_documents(documents: list[Document]) -> list[Document]:
    """
    Smart chunking — document structure বুঝে chunk করে।
    heading/paragraph আলাদা রাখে।
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        # এই order-এ split করে — বড় separator আগে
        separators=[
            "\n\n\n",   # বড় section break
            "\n\n",     # paragraph break
            "\n",       # line break
            "। ",       # বাংলা বাক্য
            ". ",       # English বাক্য
            ", ",       # clause
            " ",        # word
            "",         # character
        ],
        # chunk এর length কীভাবে measure করবে
        length_function=len,
        # chunk টা sentence-এর মাঝখানে কাটবে না
        is_separator_regex=False,
    )

    chunks = splitter.split_documents(documents)

    # প্রতিটা chunk-এ extra metadata যোগ করো
    for i, chunk in enumerate(chunks):
        chunk.metadata["chunk_id"] = i
        chunk.metadata["chunk_size"] = len(chunk.page_content)

    return chunks


def get_vector_store() -> Chroma:
    return Chroma(
        collection_name="knowledge_brain",
        embedding_function=get_embedder(),
        persist_directory=str(settings.chroma_db_dir),
    )


def ingest_file(file_path: Path) -> dict:
    """Load → Smart Chunk → Embed → Store"""
    documents = load_documents(file_path)
    chunks = chunk_documents(documents)
    vector_store = get_vector_store()
    vector_store.add_documents(chunks)

    # chunk size statistics
    sizes = [len(c.page_content) for c in chunks]
    avg_size = sum(sizes) // len(sizes) if sizes else 0

    return {
        "file": file_path.name,
        "pages": len(documents),
        "chunks": len(chunks),
        "avg_chunk_size": avg_size,
        "status": "success",
    }