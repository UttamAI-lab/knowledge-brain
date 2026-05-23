"use client";
import ReactMarkdown from "react-markdown";
import { ChatMessage } from "@/types";
import { SourceCard } from "./SourceCard";
import { Bot, User } from "lucide-react";

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>

      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* Bubble + Sources */}
      <div
        className={`max-w-[75%] flex flex-col gap-2 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {/* Message bubble */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-blue-500 text-white"
              : "bg-white text-gray-800 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700"
          }`}
        >
          {/* Typing indicator */}
          {message.isStreaming && !message.content ? (
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Sources */}
        {message.sources &&
          message.sources.length > 0 &&
          !message.isStreaming && (
            <div className="w-full space-y-2">
              <p className="text-xs text-gray-400 font-medium px-1">
                📄 Sources ({message.sources.length})
              </p>
              {message.sources.map((source, i) => (
                <SourceCard key={i} source={source} />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}