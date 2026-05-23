import httpx
import json

def test_stream(question: str):
    print(f"Question: {question}\n")
    print("Answer: ", end="", flush=True)

    with httpx.stream(
        "POST",
        "http://localhost:8000/chat/stream",
        json={"question": question},
        timeout=60,
    ) as response:
        for line in response.iter_lines():
            if line.startswith("data: "):
                data = line[6:]
                if data == "[DONE]":
                    print("\n\n✅ Done!")
                    break
                try:
                    chunk = json.loads(data)
                    print(chunk["text"], end="", flush=True)
                except Exception:
                    pass

if __name__ == "__main__":
    test_stream("What are the evaluation rubric points?")