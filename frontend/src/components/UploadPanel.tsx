"use client";
import { useState, useRef } from "react";
import { uploadDocument, listDocuments, deleteDocument } from "@/lib/api";
import { UploadedFile } from "@/types";
import { Upload, Trash2, FileText, Loader2 } from "lucide-react";

export function UploadPanel() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    try {
      const data = await listDocuments();
      setFiles(data);
    } catch {}
  };

  const handleOpen = () => {
    setOpen(true);
    loadFiles();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadDocument(file);
      await loadFiles();
    } catch (err) {
      alert("Upload failed!");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (name: string) => {
    await deleteDocument(name);
    await loadFiles();
  };

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 dark:border-gray-600 dark:text-gray-400 transition-colors"
      >
        <Upload size={16} />
        Documents
      </button>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-lg dark:bg-gray-800 dark:border-gray-700 w-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
          📂 Documents
        </h3>
        <button
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Upload button */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
      >
        {uploading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Upload size={16} />
        )}
        {uploading ? "Uploading..." : "Upload PDF / DOCX"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        className="hidden"
        onChange={handleUpload}
      />

      {/* File list */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {files.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-4">
            No documents uploaded
          </p>
        ) : (
          files.map((f) => (
            <div
              key={f.name}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText size={14} className="shrink-0 text-blue-500" />
                <span className="truncate text-sm text-gray-700 dark:text-gray-300">
                  {f.name}
                </span>
                <span className="shrink-0 text-xs text-gray-400">
                  {f.size_kb}kb
                </span>
              </div>
              <button
                onClick={() => handleDelete(f.name)}
                className="ml-2 shrink-0 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}