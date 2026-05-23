from langchain_core.messages import HumanMessage, AIMessage
from database.crud import get_conversation_messages
from sqlalchemy.orm import Session


def build_chat_history(
    db: Session,
    conversation_id: str,
    max_messages: int = 6,  # শেষ ৬টা message নাও
) -> list:
    """
    PostgreSQL থেকে chat history পড়ে
    LangChain format এ convert করো।
    """
    messages = get_conversation_messages(db, conversation_id)

    # শেষ max_messages টা নাও
    recent = messages[-max_messages:] if len(messages) > max_messages else messages

    history = []
    for msg in recent:
        if msg.role == "user":
            history.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            history.append(AIMessage(content=msg.content))

    return history


def format_history_for_prompt(history: list) -> str:
    """
    Chat history কে prompt-friendly string এ convert করো।
    """
    if not history:
        return "No previous conversation."

    formatted = []
    for msg in history:
        if isinstance(msg, HumanMessage):
            formatted.append(f"User: {msg.content}")
        elif isinstance(msg, AIMessage):
            # AI response এর শুধু প্রথম ২০০ char নাও
            content = msg.content[:200] + "..." if len(msg.content) > 200 else msg.content
            formatted.append(f"Assistant: {content}")

    return "\n".join(formatted)