"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { auth } from "@/lib/auth";
import {
  Users, FileText, Database,
  CheckSquare, ArrowRight, Loader2,
  TrendingUp, AlertCircle,
} from "lucide-react";

interface Stats {
  total_users: number;
  total_documents: number;
  total_chunks: number;
}

interface EvalScores {
  faithfulness: number;
  answer_relevancy: number;
  completeness: number;
}

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getApi() {
  return axios.create({
    baseURL: BASE,
    headers: { Authorization: `Bearer ${auth.getToken()}` },
  });
}

// ── Stat Card ────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  href,
}: {
  icon: any;
  label: string;
  value: number | string;
  color: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="group flex items-center gap-4 rounded-xl border bg-white p-5 shadow-sm hover:shadow-md dark:bg-gray-900 dark:border-gray-800 transition-all cursor-pointer">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
          <Icon size={22} />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
        <ArrowRight
          size={18}
          className="text-gray-300 group-hover:text-blue-500 transition-colors"
        />
      </div>
    </Link>
  );
}

// ── Score Card ───────────────────────────────────────────
function ScoreCard({
  label,
  score,
  description,
}: {
  label: string;
  score: number;
  description: string;
}) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 85 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-red-500";
  const textColor =
    pct >= 85
      ? "text-green-600 dark:text-green-400"
      : pct >= 70
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-red-600 dark:text-red-400";

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm dark:bg-gray-900 dark:border-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </p>
        <span className={`text-lg font-bold ${textColor}`}>{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-400">{description}</p>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────
export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [scores, setScores] = useState<EvalScores | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingEval, setLoadingEval] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const api = getApi();
      const { data } = await api.get("/admin/stats");
      setStats(data);
    } catch {
      setError("Stats load করতে সমস্যা হয়েছে।");
    } finally {
      setLoadingStats(false);
    }
  };

  const runEvaluation = async () => {
    setLoadingEval(true);
    setScores(null);
    try {
      const api = getApi();
      const { data } = await api.post("/admin/evaluate");
      setScores(data.evaluation_results);
    } catch {
      setError("Evaluation চালাতে সমস্যা হয়েছে।");
    } finally {
      setLoadingEval(false);
    }
  };

  return (
    <div className="p-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Overview
        </h1>
        <p className="mt-1 text-gray-400">
          Knowledge Brain এর সার্বিক অবস্থা
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:border-red-800 dark:text-red-400">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
          System Stats
        </h2>

        {loadingStats ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 size={18} className="animate-spin" />
            Loading...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={Users}
              label="Total Users"
              value={stats?.total_users ?? 0}
              color="bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400"
              href="/admin/users"
            />
            <StatCard
              icon={FileText}
              label="Documents"
              value={stats?.total_documents ?? 0}
              color="bg-green-50 text-green-500 dark:bg-green-950 dark:text-green-400"
              href="/admin/documents"
            />
            <StatCard
              icon={Database}
              label="Total Chunks"
              value={stats?.total_chunks ?? 0}
              color="bg-purple-50 text-purple-500 dark:bg-purple-950 dark:text-purple-400"
              href="/admin/documents"
            />
          </div>
        )}
      </div>

      {/* Evaluation Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            RAG Evaluation Scores
          </h2>
          <button
            onClick={runEvaluation}
            disabled={loadingEval}
            className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loadingEval ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Evaluating... (~30s)
              </>
            ) : (
              <>
                <TrendingUp size={14} />
                Run Evaluation
              </>
            )}
          </button>
        </div>

        {scores ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ScoreCard
              label="Faithfulness"
              score={scores.faithfulness}
              description="উত্তর কি document থেকে এসেছে?"
            />
            <ScoreCard
              label="Answer Relevancy"
              score={scores.answer_relevancy}
              description="উত্তর কি প্রশ্নের সাথে relevant?"
            />
            <ScoreCard
              label="Completeness"
              score={scores.completeness}
              description="উত্তর কতটা সম্পূর্ণ?"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-12 dark:bg-gray-900 dark:border-gray-700">
            <div className="text-center">
              <CheckSquare
                size={32}
                className="mx-auto mb-3 text-gray-300 dark:text-gray-600"
              />
              <p className="text-sm text-gray-400">
                "Run Evaluation" button click করো
              </p>
              <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">
                ~30 সেকেন্ড লাগবে
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}