"use client";
import { useState, useCallback } from "react";
import { ChatMessage, Source } from "@/types";
import { streamChat } from "@/lib/api";

function makeId() {
    return Math.random().toString(36).slice(2);
}

export function useChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);

    const sendMessage = useCallback(async (question: string) => {
        if (!question.trim() || loading) return;

        // User message যোগ করো
        const userMsg: ChatMessage = {
            id: makeId(),
            role: "user",
            content: question,
        };

        // Assistant placeholder
        const assistantId = makeId();
        const assistantMsg: ChatMessage = {
            id: assistantId,
            role: "assistant",
            content: "",
            sources: [],
            isStreaming: true,
        };

        setMessages((prev) => [...prev, userMsg, assistantMsg]);
        setLoading(true);

        try {
            await streamChat(
                question,
                // onText — token আসলে append করো
                (text) => {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId
                                ? { ...m, content: m.content + text }
                                : m,
                        ),
                    );
                },
                // onSources
                (sources: Source[]) => {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId ? { ...m, sources } : m,
                        ),
                    );
                },
                // onDone
                () => {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId ? { ...m, isStreaming: false } : m,
                        ),
                    );
                    setLoading(false);
                },
            );
        } catch (err) {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantId
                        ? {
                            ...m,
                            content: "❌ Error: Server-এ সংযোগ করা যাচ্ছে না।",
                            isStreaming: false,
                        }
                        : m,
                ),
            );
            setLoading(false);
        }
    }, [loading]);

    const clearMessages = useCallback(() => setMessages([]), []);

    return { messages, loading, sendMessage, clearMessages };
}