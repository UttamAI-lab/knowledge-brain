"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@/hooks/useChat";
import { ChatBubble } from "@/components/ChatBubble";
import { UploadPanel } from "@/components/UploadPanel";
import { auth } from "@/lib/auth";
import { Brain, Send, Trash2, Loader2, LogOut } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const { messages, loading, sendMessage, clearMessages } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // ✅ Auth check
  useEffect(() => {
    setMounted(true);
    if (!auth.isLoggedIn()) {
      router.push("/login");
      return;
    }
    setUser(auth.getUser());
  }, [router]);

  // নতুন message আসলে scroll করো
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Loading state
  if (!mounted || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-950">

      {/* ── Header ── */}
      <header className="flex items-center justify-between border-b bg-white px-6 py-3 shadow-sm dark:bg-gray-900 dark:border-gray-800">

        {/* Left — Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-white">
            <Brain size={20} />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900 dark:text-white">
              Knowledge Brain
            </h1>
            <p className="text-xs text-gray-400">
              RAG-powered document assistant
            </p>
          </div>
        </div>

        {/* Right — User info + controls */}
        <div className="flex items-center gap-3">

          {/* Document upload */}
          <UploadPanel />

          {/* Clear chat */}
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 transition-colors"
            >
              <Trash2 size={15} />
              Clear
            </button>
          )}

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

          {/* User name */}
          <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            {user?.name}
          </span>

          {/* Role badge */}
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
            user?.role === "admin"
              ? "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300"
              : user?.role === "manager"
              ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          }`}>
            {user?.role}
          </span>

          {/* Logout */}
          <button
            onClick={auth.logout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950 transition-colors"
            title="Logout"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </header>

      {/* ── Messages ── */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">

          {messages.length === 0 ? (
            /* Welcome screen */
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-lg">
                <Brain size={32} />
              </div>
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
                Welcome, {user?.name}! 👋
              </h2>
              <p className="mt-2 text-gray-400 max-w-md">
                Upload your documents and ask anything. The AI will answer
                with citations from your documents.
              </p>

              {/* Suggested questions */}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {[
                  "What should be submitted?",
                  "What are the evaluation rubric points?",
                  "What is the deadline?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:border-blue-300 hover:text-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* ── Input ── */}
      <footer className="border-t bg-white px-4 py-4 dark:bg-gray-900 dark:border-gray-800">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:bg-gray-800 dark:border-gray-700 transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything about your documents..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none dark:text-gray-100"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-gray-400">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </footer>
    </div>
  );
}