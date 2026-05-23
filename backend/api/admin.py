from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.session import get_db
from database.crud import get_all_users, get_all_documents
from auth.roles import require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    users = get_all_users(db)
    return {
        "total": len(users),
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "role": u.role,
                "is_active": u.is_active,
                "created_at": u.created_at,
            }
            for u in users
        ],
    }


@router.get("/documents")
def list_all_documents(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    docs = get_all_documents(db)
    return {
        "total": len(docs),
        "documents": [
            {
                "filename": d.filename,
                "size_kb": d.size_kb,
                "chunks": d.chunks_count,
                "uploaded_at": d.created_at,
            }
            for d in docs
        ],
    }


@router.get("/stats")
def stats(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    users = get_all_users(db)
    docs = get_all_documents(db)
    return {
        "total_users": len(users),
        "total_documents": len(docs),
        "total_chunks": sum(d.chunks_count or 0 for d in docs),
    }

@router.post("/evaluate")
def run_evaluation(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """
    সাম্প্রতিক conversations দিয়ে RAG quality মাপো।
    """
    from evaluation.ragas_eval import evaluate_rag
    from database.crud import get_all_documents
    import json

    # Test questions
    test_cases = [
        {
            "question": "What should be submitted?",
            "ground_truth": "source code, README, architecture overview, assumptions, sample inputs/outputs, evaluation results"
        },
        {
            "question": "What is the deadline?",
            "ground_truth": "Friday May, end of day local time"
        },
    ]

    from rag.retriever import retrieve

    questions, answers, contexts, ground_truths = [], [], [], []

    for tc in test_cases:
        docs = retrieve(tc["question"])
        if not docs:
            continue

        from langchain_groq import ChatGroq
        from langchain_core.prompts import ChatPromptTemplate
        from langchain_core.output_parsers import StrOutputParser
        from config import settings

        context = "\n\n".join(doc.page_content for doc in docs)
        prompt = ChatPromptTemplate.from_template(
            "Answer using ONLY this context:\n{context}\n\nQuestion: {question}\nAnswer:"
        )
        chain = prompt | ChatGroq(
            api_key=settings.groq_api_key,
            model=settings.llm_model,
            temperature=0,
        ) | StrOutputParser()

        answer = chain.invoke({
            "context": context,
            "question": tc["question"],
        })

        questions.append(tc["question"])
        answers.append(answer)
        contexts.append([doc.page_content for doc in docs])
        ground_truths.append(tc["ground_truth"])

    if not questions:
        return {"error": "No documents found. Upload documents first."}

    scores = evaluate_rag(questions, answers, contexts, ground_truths)

    return {
        "evaluation_results": scores,
        "questions_tested": len(questions),
        "interpretation": {
            "faithfulness": "উত্তর কি document থেকে এসেছে (1.0 = perfect)",
            "answer_relevancy": "উত্তর কি প্রশ্নের সাথে relevant (1.0 = perfect)",
            "context_recall": "সঠিক context কি retrieve হয়েছে (1.0 = perfect)",
        }
    }