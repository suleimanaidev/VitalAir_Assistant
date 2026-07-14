"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  fetchAdminUser,
  patchAdminUser,
  type AdminUserDetail,
} from "@/lib/adminApi";

export default function AdminUserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchAdminUser(params.id)
      .then(setUser)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load user")
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const update = async (body: { role?: "admin" | "user"; is_active?: boolean }) => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await patchAdminUser(params.id, body);
      setUser(updated);
      setMessage("User updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-vital-muted">Loading user…</p>;
  }

  if (error && !user) {
    return (
      <p className="text-sm text-vital-danger" role="alert">
        {error}
      </p>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-vital-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to users
      </Link>

      <div className="vital-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-vital-text">{user.name}</h2>
            <p className="mt-1 text-sm text-vital-muted">{user.email ?? "No email"}</p>
            <p className="mt-2 text-sm text-vital-muted">
              Age {user.age ?? "—"} · {user.city} ·{" "}
              {user.conditions.length ? user.conditions.join(", ") : "No conditions"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={saving || user.role === "admin"}
              onClick={() => void update({ role: "admin" })}
            >
              Make admin
            </button>
            <button
              type="button"
              className="btn-ghost text-sm"
              disabled={saving || user.role === "user"}
              onClick={() => void update({ role: "user" })}
            >
              Remove admin
            </button>
            <button
              type="button"
              className="btn-ghost text-sm"
              disabled={saving}
              onClick={() => void update({ is_active: !user.is_active })}
            >
              {user.is_active ? "Disable account" : "Enable account"}
            </button>
          </div>
        </div>

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

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="vital-card p-5">
          <h3 className="text-base font-semibold text-vital-text">Documents</h3>
          {user.documents.length === 0 ? (
            <p className="mt-3 text-sm text-vital-muted">No documents uploaded.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {user.documents.map((doc) => (
                <li
                  key={doc.id}
                  className="rounded-lg border border-vital-border/60 bg-vital-bg/50 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-vital-text">{doc.filename}</p>
                  <p className="text-xs text-vital-muted">
                    {(doc.size_bytes / 1024).toFixed(1)} KB · {doc.created_at ?? "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="vital-card p-5">
          <h3 className="text-base font-semibold text-vital-text">Recent analyses</h3>
          {user.recent_queries.length === 0 ? (
            <p className="mt-3 text-sm text-vital-muted">No analysis history.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {user.recent_queries.map((q) => (
                <li
                  key={q.id}
                  className="rounded-lg border border-vital-border/60 bg-vital-bg/50 px-3 py-2 text-sm"
                >
                  <p className="text-vital-text">
                    {q.source ?? "—"} → {q.destination ?? "—"}
                  </p>
                  <p className="text-xs text-vital-muted">
                    AQI {q.aqi_at_time ?? "—"} · {q.timestamp ?? "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
