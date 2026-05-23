import fitz
import sys


def decode_text(text: str, shift: int = 25) -> str:
    result = []
    for char in text:
        code = ord(char)
        if 32 <= code <= 126:
            result.append(chr(((code - 32 + shift) % 95) + 32))
        else:
            result.append(char)
    return "".join(result)


def extract_with_spaces(page: fitz.Page) -> str:
    words = page.get_text("words")
    if not words:
        return ""
    lines = {}
    for w in words:
        key = (w[5], w[6])
        lines.setdefault(key, []).append(w[4])
    return "\n".join(" ".join(lines[k]) for k in sorted(lines))


def inspect_pdf(path: str):
    pdf = fitz.open(path)
    print(f"📄 Total pages: {len(pdf)}\n{'=' * 60}")

    for i in range(len(pdf)):
        page = pdf[i]
        raw = extract_with_spaces(page)

        # word-by-word decode
        decoded_lines = []
        for line in raw.split("\n"):
            decoded_words = [decode_text(w) for w in line.split(" ")]
            decoded_lines.append(" ".join(decoded_words))
        decoded = "\n".join(decoded_lines)

        print(f"\n--- Page {i+1} ---")
        print(f"Decoded:\n{decoded[:500]}")

    pdf.close()


if __name__ == "__main__":
    inspect_pdf(sys.argv[1])