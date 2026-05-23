"use client";
import { Source } from "@/types";
import { FileText, Star } from "lucide-react";

export function SourceCard({ source }: { source: Source }) {
    const score = source.rerank_score;
    const isTopSource = score !== null && score > 0;

    return (
        <div
            className={`rounded-lg border p-3 text-sm ${isTopSource
                    ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                    : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                }`}
        >
            <div className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                <FileText size={14} />
                <span>{source.file}</span>
                <span className="text-gray-400">· Page {source.page}</span>
                {isTopSource && (
                    <span className="ml-auto flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Star size={12} fill="currentColor" />
                        Best match
                    </span>
                )}
            </div>
            <p className="mt-1 line-clamp-2 text-gray-500 dark:text-gray-400">
                {source.chunk_preview}
            </p>
            {score !== null && (
                <p className="mt-1 text-xs text-gray-400">
                    Score: {score.toFixed(4)}
                </p>
            )}
        </div>
    );
}