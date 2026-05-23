from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from config import settings
import re


def get_llm():
    return ChatGroq(
        api_key=settings.groq_api_key,
        model="llama-3.1-8b-instant",
        temperature=0,
        max_tokens=512,
    )


def _score_faithfulness(question: str, answer: str, context: str) -> float:
    """
    উত্তর কি context থেকে এসেছে?
    LLM কে judge করতে বলো।
    """
    prompt = ChatPromptTemplate.from_template("""
You are an evaluator. Judge if the answer is faithful to the context.

Context: {context}
Question: {question}
Answer: {answer}

Is the answer supported by the context?
Reply with ONLY a number between 0.0 and 1.0.
1.0 = completely faithful, 0.0 = not faithful at all.
Reply format: just the number, nothing else.
""")
    chain = prompt | get_llm() | StrOutputParser()
    try:
        result = chain.invoke({
            "context": context[:2000],
            "question": question,
            "answer": answer[:500],
        })
        # number extract করো
        match = re.search(r"0?\.\d+|1\.0|0|1", result.strip())
        return float(match.group()) if match else 0.0
    except Exception as e:
        print(f"Faithfulness error: {e}")
        return 0.0


def _score_relevancy(question: str, answer: str) -> float:
    """
    উত্তর কি প্রশ্নের সাথে relevant?
    """
    prompt = ChatPromptTemplate.from_template("""
You are an evaluator. Judge if the answer is relevant to the question.

Question: {question}
Answer: {answer}

How relevant is the answer to the question?
Reply with ONLY a number between 0.0 and 1.0.
1.0 = perfectly relevant, 0.0 = completely irrelevant.
Reply format: just the number, nothing else.
""")
    chain = prompt | get_llm() | StrOutputParser()
    try:
        result = chain.invoke({
            "question": question,
            "answer": answer[:500],
        })
        match = re.search(r"0?\.\d+|1\.0|0|1", result.strip())
        return float(match.group()) if match else 0.0
    except Exception as e:
        print(f"Relevancy error: {e}")
        return 0.0


def _score_completeness(answer: str, ground_truth: str) -> float:
    """
    উত্তর কি ground truth এর সাথে মিলছে?
    """
    prompt = ChatPromptTemplate.from_template("""
You are an evaluator. Compare the answer with the expected answer.

Expected Answer: {ground_truth}
Actual Answer: {answer}

How complete is the actual answer compared to the expected answer?
Reply with ONLY a number between 0.0 and 1.0.
1.0 = complete match, 0.0 = completely wrong.
Reply format: just the number, nothing else.
""")
    chain = prompt | get_llm() | StrOutputParser()
    try:
        result = chain.invoke({
            "ground_truth": ground_truth,
            "answer": answer[:500],
        })
        match = re.search(r"0?\.\d+|1\.0|0|1", result.strip())
        return float(match.group()) if match else 0.0
    except Exception as e:
        print(f"Completeness error: {e}")
        return 0.0


def evaluate_rag(
    questions: list[str],
    answers: list[str],
    contexts: list[list[str]],
    ground_truths: list[str] | None = None,
) -> dict:
    """
    Custom RAG evaluator — RAGAS ছাড়া, Groq দিয়ে।
    """
    faithfulness_scores = []
    relevancy_scores = []
    completeness_scores = []

    for i, (q, a, ctx) in enumerate(zip(questions, answers, contexts)):
        context_text = "\n\n".join(ctx)

        # Faithfulness
        f = _score_faithfulness(q, a, context_text)
        faithfulness_scores.append(f)
        print(f"Q{i+1} faithfulness: {f}")

        # Relevancy
        r = _score_relevancy(q, a)
        relevancy_scores.append(r)
        print(f"Q{i+1} relevancy: {r}")

        # Completeness (ground truth থাকলে)
        if ground_truths and i < len(ground_truths):
            c = _score_completeness(a, ground_truths[i])
            completeness_scores.append(c)
            print(f"Q{i+1} completeness: {c}")

    def avg(lst):
        return round(sum(lst) / len(lst), 3) if lst else 0.0

    scores = {
        "faithfulness": avg(faithfulness_scores),
        "answer_relevancy": avg(relevancy_scores),
    }

    if completeness_scores:
        scores["completeness"] = avg(completeness_scores)

    return scores