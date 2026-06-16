"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, ShieldCheck, Trash2, Upload } from "lucide-react";
import {
  deleteHealthDocument,
  fetchMyDocuments,
  uploadHealthDocument,
  type HealthDocument,
} from "@/lib/documentsApi";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function methodLabel(method?: string): string {
  if (!method || method === "text") return "Text";
  if (method === "ocr_image") return "OCR (Tesseract)";
  if (method === "ocr_rapid") return "OCR (AI vision)";
  if (method === "ocr_pdf") return "OCR (scanned PDF)";
  if (method === "docx") return "Word (.docx)";
  if (method === "doc_legacy") return "Word (.doc)";
  if (method === "pypdf" || method === "pdfplumber" || method === "pymupdf") {
    return "PDF text";
  }
  return method;
}

export default function HealthDocumentsPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<HealthDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDocs(await fetchMyDocuments());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onUploadMany = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    setMessage(null);

    const results: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const res = await uploadHealthDocument(file);
        results.push(`${file.name}: ${res.message}`);
      }
      setMessage(
        results.length === 1
          ? results[0]
          : `${results.length} documents uploaded and queued for RAG.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDelete = async (id: string) => {
    setError(null);
    try {
      await deleteHealthDocument(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      setMessage("Document removed from profile and vector index.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <section className="vital-card space-y-5 p-6 sm:p-8">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-vital-text">
            Patient Document RAG
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full border border-vital-primary/30 bg-vital-primary/10 px-2 py-0.5 text-xs font-medium text-vital-primary">
            <ShieldCheck className="h-3 w-3" aria-hidden />
            Doctor-aware AI
          </span>
        </div>
        <p className="mt-2 text-sm text-vital-muted">
          Upload prescriptions, lab reports, or doctor notes —{" "}
          <strong className="font-medium text-vital-text">
            PDF, Word (.doc/.docx), JPG, PNG
          </strong>
          , plus plain text. Photos and scanned PDFs use built-in OCR (
          <code className="text-xs">npm run install:documents</code> for full support).
          Text is embedded in your personal RAG index for doctor-aware health advice.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
          className="sr-only"
          onChange={(e) => void onUploadMany(e.target.files)}
        />
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" aria-hidden />
              Upload documents
            </>
          )}
        </button>
        <span className="text-xs text-vital-muted">
          Multi-file · max 500 KB each · up to 10 total
        </span>
      </div>

      {error && (
        <p className="text-sm text-vital-danger" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-vital-primary" role="status">
          {message}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-vital-muted">Loading documents…</p>
      ) : docs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-vital-border px-4 py-6 text-center text-sm text-vital-muted">
          No documents yet. Example: upload a prescription mentioning Salbutamol —
          the health agent will advise based on your real medication, not guesses.
        </p>
      ) : (
        <ul className="space-y-3">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-vital-border bg-vital-bg/50 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium text-vital-text">
                  <FileText className="h-4 w-4 shrink-0 text-vital-primary" aria-hidden />
                  <span className="truncate">{doc.filename}</span>
                </p>
                <p className="mt-1 text-xs text-vital-muted">
                  {formatSize(doc.size_bytes)}
                  {doc.extraction_method
                    ? ` · Parsed via ${methodLabel(doc.extraction_method)}`
                    : ""}
                  {doc.created_at
                    ? ` · ${new Date(doc.created_at).toLocaleDateString()}`
                    : ""}
                </p>
                {doc.preview && (
                  <p className="mt-2 line-clamp-2 text-xs text-vital-muted">
                    {doc.preview}…
                  </p>
                )}
              </div>
              <button
                type="button"
                className="btn-ghost shrink-0 text-vital-danger"
                aria-label={`Delete ${doc.filename}`}
                onClick={() => void onDelete(doc.id)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

