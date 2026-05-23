export interface Source {
    file: string;
    page: number | string;
    chunk_preview: string;
    rerank_score: number | null;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: Source[];
    isStreaming?: boolean;
}

export interface UploadedFile {
    name: string;
    size_kb: number;
}