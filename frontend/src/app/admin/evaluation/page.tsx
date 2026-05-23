"use client";
import { useState } from "react";
import axios from "axios";
import { auth } from "@/lib/auth";
import {
  TrendingUp, CheckCircle2, AlertCircle,
  Loader2, PlayCircle, Info,
  Award, Target, BookOpen,
} from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getApi() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return axios.create({
    baseURL: BASE,
    headers: { Authorization: `Bearer ${token}` },
  });
}

interface EvalResult {
  faithfulness: number;
  answer_relevancy: number;
  completeness: number;
}

interface EvalResponse {
  evaluation_results: EvalResult;
  questions_tested: number;
}

// ── Score Gauge ───────────────────────────────────────────
function ScoreGauge({
  label,
  score,
  description,
  icon: Icon,
}: {
  label: string;
  score: number;
  description: string;
  icon: any;
}) {
  const pct = Math.round(score * 100);
  const status =
    pct >= 85 ? "excellent" : pct >= 70 ? "good" : "poor";

  const styles = {
    excellent: {
      bar: "bg-green-500",
      text: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-950",
      border: "border-green-200 dark:border-green-800",
      badge: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      label: "Excellent ✨",
    },
    good: {
      bar: "bg-yellow-500",
      text: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-50 dark:bg-yellow-950",
      border: "border-yellow-200 dark:border-yellow-800",
      badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
      label: "Good 👍",
    },
    poor: {
      bar: "bg-red-500",
      text: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950",
      border: "border-red-200 dark:border-red-800",
      badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
      badge_label: "Needs Improvement ⚠️",
      label: "Needs Improvement ⚠️",
    },
  };

  const s = styles[status];

  return (
    <div className={`rounded-xl border p-6 ${s.bg} ${s.border}`}>
      {/* Top */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.badge}`}>
            <Icon size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {label}
            </h3>
            <p className="text-xs text-gray-400">{description}</p>
          </div>
        </div>
        <span className={`text-3xl font-bold ${s.text}`}>{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-white/60 dark:bg-black/20">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${s.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Status badge */}
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.badge}`}>
          {s.label}
        </span>
        <span className="text-xs text-gray-400">
          Industry standard: ≥80%
        </span>
      </div>
    </div>
  );
}

// ── Overall Score ─────────────────────────────────────────
function OverallScore({ result }: { result: EvalResult }) {
  const avg = Math.round(
    ((result.faithfulness + result.answer_relevancy + result.completeness) / 3) * 100
  );
  const passed = avg >= 80;

  return (
    <div className={`mb-8 flex items-center gap-6 rounded-2xl border p-6 ${
      passed
        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
        : "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950"
    }`}>
      <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-3xl font-black ${
        passed
          ? "bg-green-500 text-white"
          : "bg-yellow-500 text-white"
      }`}>
        {avg}%
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Overall Score
          </h3>
          {passed ? (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
              ✅ Industry Standard Pass
            </span>
          ) : (
            <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
              ⚠️ Needs Improvement
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {passed
            ? "তোমার RAG system industry-grade! তিনটা metric-এই ভালো score পেয়েছে।"
            : "কিছু metric উন্নত করা দরকার। Chunking বা retrieval improve করো।"}
        </p>
        <div className="mt-2 flex gap-4 text-xs text-gray-400">
          <span>Faithfulness: {Math.round(result.faithfulness * 100)}%</span>
          <span>·</span>
          <span>Relevancy: {Math.round(result.answer_relevancy * 100)}%</span>
          <span>·</span>
          <span>Completeness: {Math.round(result.completeness * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function EvaluationPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvalResponse | null>(null);
  const [error, setError] = useState("");

  const runEval = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const { data } = await getApi().post("/admin/evaluate");
      setResult(data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ?? "Evaluation চালাতে সমস্যা হয়েছে।"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            RAG Evaluation
          </h1>
          <p className="mt-1 text-gray-400">
            AI উত্তরের quality automatically মাপো
          </p>
        </div>
        <button
          onClick={runEval}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Evaluating...
            </>
          ) : (
            <>
              <PlayCircle size={16} />
              Run Evaluation
            </>
          )}
        </button>
      </div>

      {/* Info box */}
      <div className="mb-8 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 dark:border-blue-800 dark:bg-blue-950">
        <Info size={18} className="mt-0.5 shrink-0 text-blue-500" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">কীভাবে কাজ করে?</p>
          <p className="text-blue-600 dark:text-blue-400">
            Evaluation চালালে system predefined test questions দিয়ে RAG pipeline test করে।
            Groq LLM judge হিসেবে কাজ করে এবং ৩টা metric-এ score দেয়।
            প্রায় <strong>30-60 সেকেন্ড</strong> লাগতে পারে।
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:border-red-800 dark:text-red-400">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="mb-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-blue-200 bg-blue-50 py-16 dark:border-blue-800 dark:bg-blue-950">
          <Loader2 size={36} className="mb-4 animate-spin text-blue-500" />
          <p className="font-medium text-blue-700 dark:text-blue-300">
            Evaluation চলছে...
          </p>
          <p className="mt-1 text-sm text-blue-500">
            Groq LLM দিয়ে answers judge করা হচ্ছে
          </p>
          <div className="mt-4 flex gap-6 text-xs text-blue-400">
            <span>→ Questions retrieve করা হচ্ছে</span>
            <span>→ Answers generate হচ্ছে</span>
            <span>→ Scoring হচ্ছে</span>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          {/* Overall */}
          <OverallScore result={result.evaluation_results} />

          {/* Individual scores */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ScoreGauge
              label="Faithfulness"
              score={result.evaluation_results.faithfulness}
              description="উত্তর কি document থেকে এসেছে?"
              icon={BookOpen}
            />
            <ScoreGauge
              label="Answer Relevancy"
              score={result.evaluation_results.answer_relevancy}
              description="উত্তর কি প্রশ্নের সাথে relevant?"
              icon={Target}
            />
            <ScoreGauge
              label="Completeness"
              score={result.evaluation_results.completeness}
              description="উত্তর কতটা সম্পূর্ণ?"
              icon={Award}
            />
          </div>

          {/* Test info */}
          <div className="flex items-center gap-3 rounded-xl border bg-white px-5 py-4 dark:bg-gray-900 dark:border-gray-800">
            <CheckCircle2 size={18} className="text-green-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">
                {result.questions_tested} টি প্রশ্ন
              </span>{" "}
              দিয়ে evaluation সম্পন্ন হয়েছে।
            </p>
            <button
              onClick={runEval}
              className="ml-auto text-sm text-blue-500 hover:underline"
            >
              আবার চালাও →
            </button>
          </div>
        </>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-20 dark:bg-gray-900 dark:border-gray-700">
          <TrendingUp
            size={40}
            className="mb-4 text-gray-300 dark:text-gray-600"
          />
          <p className="font-medium text-gray-500 dark:text-gray-400">
            Evaluation এখনো চালানো হয়নি
          </p>
          <p className="mt-1 text-sm text-gray-400">
            "Run Evaluation" button click করো
          </p>
          <button
            onClick={runEval}
            className="mt-6 flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
          >
            <PlayCircle size={16} />
            Run Evaluation
          </button>
        </div>
      )}
    </div>
  );
}