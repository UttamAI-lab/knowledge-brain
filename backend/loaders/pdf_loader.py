from pathlib import Path
from langchain_core.documents import Document
import fitz
import re


def _decode_char(code: int, shift: int = 25) -> str:
    if 32 <= code <= 126:
        return chr(((code - 32 + shift) % 95) + 32)
    return chr(code)


def _decode_text(text: str) -> str:
    return "".join(_decode_char(ord(c)) for c in text)


def _is_encoded(text: str) -> bool:
    if not text or len(text) < 20:
        return False
    sample = text[:300]
    common = ["the", "and", "you", "are", "of", "to", "in", "is", "a"]
    found = sum(1 for w in common if w in sample.lower())
    if found >= 2:
        return False
    letters = [c for c in sample if c.isalpha()]
    if not letters:
        return False
    upper_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
    encoded_patterns = ["VTL", "HUKPUN", "VJ\\T", "KLYZ", "OL["]
    has_pattern = any(p in sample for p in encoded_patterns)
    return upper_ratio > 0.4 or has_pattern


def _clean_text(text: str) -> str:
    # ࠮ এবং garbage unicode সরাও
    text = re.sub(r'[\u0800-\u08FF]', '', text)
    text = re.sub(r'[\uFFFD\uFFFE\uFFFF]', '', text)
    # একাধিক blank line → একটা
    text = re.sub(r'\n{3,}', '\n\n', text)
    # লাইন trim করো
    lines = [line.strip() for line in text.split('\n')]
    cleaned = []
    prev_empty = False
    for line in lines:
        if not line:
            if not prev_empty:
                cleaned.append('')
            prev_empty = True
        else:
            cleaned.append(line)
            prev_empty = False
    return '\n'.join(cleaned).strip()


def _extract_text_with_spaces(page: fitz.Page) -> str:
    words = page.get_text("words")
    if not words:
        return ""
    lines = {}
    for w in words:
        key = (w[5], w[6])
        lines.setdefault(key, []).append(w[4])
    return "\n".join(" ".join(lines[k]) for k in sorted(lines))


def load_pdf(file_path: str | Path) -> list[Document]:
    file_path = Path(file_path)
    documents = []
    pdf = fitz.open(str(file_path))
    total_pages = len(pdf)

    for page_num in range(total_pages):
        page = pdf[page_num]
        text = _extract_text_with_spaces(page)

        if not text or not text.strip():
            continue

        if _is_encoded(text):
            decoded_lines = []
            for line in text.split("\n"):
                decoded_words = [_decode_text(w) for w in line.split(" ")]
                decoded_lines.append(" ".join(decoded_words))
            text = "\n".join(decoded_lines)

        text = _clean_text(text)

        if not text.strip():
            continue

        documents.append(Document(
            page_content=text,
            metadata={
                "source": file_path.name,
                "page": page_num + 1,
                "total_pages": total_pages,
                "file_path": str(file_path),
            },
        ))

    pdf.close()
    return documents