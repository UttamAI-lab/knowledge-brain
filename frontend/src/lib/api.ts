import axios from "axios";
import { Source, UploadedFile } from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL: BASE_URL });

// ── Token interceptor — সব axios request এ token যোগ করো ──
api.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── 401 হলে logout করো ────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

// ── Auth ───────────────────────────────────────────────────
export async function loginUser(email: string, password: string) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  const { data } = await api.post("/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data;
}

export async function registerUser(
  email: string,
  name: string,
  password: string,
  role: string = "employee",
) {
  const { data } = await api.post("/auth/register", {
    email, name, password, role,
  });
  return data;
}

export async function getMe() {
  const { data } = await api.get("/auth/me");
  return data;
}

// ── Documents ──────────────────────────────────────────────
export async function uploadDocument(file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/documents/upload", form);
  return data;
}

export async function listDocuments(): Promise<UploadedFile[]> {
  const { data } = await api.get("/documents/list");
  return data.files;
}

export async function deleteDocument(filename: string) {
  const { data } = await api.delete(`/documents/${filename}`);
  return data;
}

// ── Streaming Chat ─────────────────────────────────────────
export async function streamChat(
  question: string,
  onText: (text: string) => void,
  onSources: (sources: Source[]) => void,
  onDone: () => void,
  conversationId?: string,
) {
  // ✅ fetch এ manually token যোগ করো
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  const response = await fetch(`${BASE_URL}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      question,
      conversation_id: conversationId ?? null,
    }),
  });

  // 401 হলে login page এ পাঠাও
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    return;
  }

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;

      try {
        const data = JSON.parse(raw);
        if (data.type === "text") onText(data.text);
        if (data.type === "sources") onSources(data.sources);
        if (data.type === "done") onDone();
      } catch { }
    }
  }
}

// ── Chat History ───────────────────────────────────────────
export async function getChatHistory() {
  const { data } = await api.get("/chat/history");
  return data.conversations;
}

export async function getConversationMessages(conversationId: string) {
  const { data } = await api.get(`/chat/history/${conversationId}`);
  return data.messages;
}