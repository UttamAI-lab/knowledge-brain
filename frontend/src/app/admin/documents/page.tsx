"use client";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { auth } from "@/lib/auth";
import {
  FileText, Trash2, Upload, Loader2,
  AlertCircle, RefreshCw, Database,
  FileSearch, CheckCircle2,
} from "lucide-react";

interface DocData {
  filename: string;
  size_kb: number;
  chunks: number;
  uploaded_at: string;
}

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getApi() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return axios.create({
    baseURL: BASE,
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── File Icon ─────────────────────────────────────────────
function FileIcon({ filename }: { filename: string }) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const colors: Record<string, string> = {
    pdf: "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300",
    docx: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
    doc: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
    txt: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold uppercase ${
        colors[ext ?? ""] ?? colors.txt
      }`}
    >
      {ext}
    </div>
  );
}

// ── Stat Mini Card ────────────────────────────────────────
function MiniStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900 dark:border-gray-800">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getApi().get("/admin/documents");
      setDocs(data.documents);
    } catch (err: any) {
      setError(
        `Error: ${err.response?.status} — ${err.response?.data?.detail ?? "Unknown"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    setSuccess("");

    const form = new FormData();
    form.append("file", file);

    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const { data } = await axios.post(`${BASE}/documents/upload`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess(
        `✅ "${data.file}" uploaded! ${data.chunks} chunks তৈরি হয়েছে।`
      );
      await fetchDocs();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`"${filename}" delete করবে?`)) return;
    setDeletingFile(filename);
    setError("");
    setSuccess("");
    try {
      await getApi().delete(`/documents/${encodeURIComponent(filename)}`);
      setSuccess(`🗑️ "${filename}" deleted.`);
      await fetchDocs();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Delete failed.");
    } finally {
      setDeletingFile(null);
    }
  };

  // Filter
  const filtered = docs.filter((d) =>
    d.filename.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalChunks = docs.reduce((sum, d) => sum + (d.chunks ?? 0), 0);
  const totalSize = docs.reduce((sum, d) => sum + (d.size_kb ?? 0), 0);

  return (
    <div className="p-8">

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Documents
          </h1>
          <p className="mt-1 text-gray-400">
            সব uploaded documents দেখো ও manage করো
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchDocs}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {uploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            {uploading ? "Uploading..." : "Upload Document"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.doc"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      {/* Mini Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniStat
          icon={FileText}
          label="Total Documents"
          value={docs.length}
          color="bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400"
        />
        <MiniStat
          icon={Database}
          label="Total Chunks"
          value={totalChunks}
          color="bg-purple-50 text-purple-500 dark:bg-purple-950 dark:text-purple-400"
        />
        <MiniStat
          icon={FileSearch}
          label="Total Size"
          value={`${totalSize.toFixed(1)} KB`}
          color="bg-green-50 text-green-500 dark:bg-green-950 dark:text-green-400"
        />
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:border-red-800 dark:text-red-400">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600 dark:bg-green-950 dark:border-green-800 dark:text-green-400">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ফাইলের নাম দিয়ে খোঁজো..."
          className="w-full max-w-sm rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 size={18} className="animate-spin" />
          Loading documents...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-16 dark:bg-gray-900 dark:border-gray-700">
          <FileText
            size={32}
            className="mb-3 text-gray-300 dark:text-gray-600"
          />
          <p className="text-sm text-gray-400">
            {search ? "কোনো ফাইল পাওয়া যায়নি" : "কোনো document upload হয়নি"}
          </p>
          {!search && (
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-3 text-sm text-blue-500 hover:underline"
            >
              প্রথম document upload করো
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-gray-900 dark:border-gray-800">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  File
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Size
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Chunks
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Uploaded
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((doc) => (
                <tr
                  key={doc.filename}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {/* File */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <FileIcon filename={doc.filename} />
                      <span className="max-w-[250px] truncate text-sm font-medium text-gray-900 dark:text-white">
                        {doc.filename}
                      </span>
                    </div>
                  </td>

                  {/* Size */}
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {doc.size_kb} KB
                  </td>

                  {/* Chunks */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-600 dark:bg-purple-900 dark:text-purple-300">
                      <Database size={10} />
                      {doc.chunks} chunks
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(doc.uploaded_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>

                  {/* Delete */}
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(doc.filename)}
                      disabled={deletingFile === doc.filename}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50 transition-colors"
                    >
                      {deletingFile === doc.filename ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="border-t bg-gray-50 px-6 py-3 dark:bg-gray-800 dark:border-gray-700">
            <p className="text-xs text-gray-400">
              মোট {filtered.length}টি document
              {search && ` (filtered from ${docs.length})`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}