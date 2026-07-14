"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  fetchAdminSystem,
  reingestAdminRag,
  type AdminSystemInfo,
} from "@/lib/adminApi";

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        ok
          ? "bg-vital-primary/15 text-vital-primary"
          : "bg-vital-danger/15 text-vital-danger"
      }`}
    >
      {label}
    </span>
  );
}

export default function AdminSystemPage() {
  const [info, setInfo] = useState<AdminSystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [reingesting, setReingesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchAdminSystem()
      .then(setInfo)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load system info")
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const onReingest = async () => {
    setReingesting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await reingestAdminRag();
      setMessage(res.message);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-ingest failed");
    } finally {
      setReingesting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-vital-muted">Loading system status…</p>;
  }

  if (error && !info) {
    return (
      <p className="text-sm text-vital-danger" role="alert">
        {error}
      </p>
    );
  }

  if (!info) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="vital-card p-5">
          <h3 className="text-base font-semibold text-vital-text">Database</h3>
          <div className="mt-3">
            <StatusPill ok={info.mongodb} label={info.mongodb ? "MongoDB connected" : "MongoDB offline"} />
          </div>
        </div>
        <div className="vital-card p-5">
          <h3 className="text-base font-semibold text-vital-text">RAG index</h3>
          <div className="mt-3">
            <StatusPill
              ok={info.rag_index}
              label={info.rag_index ? "FAISS index ready" : "RAG index missing"}
            />
          </div>
        </div>
        <div className="vital-card p-5">
          <h3 className="text-base font-semibold text-vital-text">Agents</h3>
          <p className="mt-3 text-sm text-vital-muted">
            Mode: <span className="text-vital-text">{info.crew_mode}</span>
          </p>
          <p className="mt-1 text-sm text-vital-muted">
            LLM: <span className="text-vital-text">{info.llm_provider}</span>
          </p>
        </div>
        <div className="vital-card p-5">
          <h3 className="text-base font-semibold text-vital-text">API keys</h3>
          <p className="mt-3 text-sm text-vital-muted">
            OpenAI: {info.has_openai ? "configured" : "missing"}
          </p>
          <p className="mt-1 text-sm text-vital-muted">
            WAQI: {info.has_waqi ? "configured" : "missing"}
          </p>
          <p className="mt-1 text-sm text-vital-muted">
            Admin emails in env: {info.admin_emails_configured}
          </p>
        </div>
      </div>

      <div className="vital-card p-5">
        <h3 className="text-base font-semibold text-vital-text">RAG maintenance</h3>
        <p className="mt-2 text-sm text-vital-muted">
          Rebuild WHO health + diet knowledge index from bundled text files.
        </p>
        <button
          type="button"
          className="btn-primary mt-4 inline-flex items-center gap-2"
          onClick={() => void onReingest()}
          disabled={reingesting}
        >
          {reingesting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden />
          )}
          Re-ingest RAG knowledge
        </button>
        {message && (
          <p className="mt-3 text-sm text-vital-primary" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-3 text-sm text-vital-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
