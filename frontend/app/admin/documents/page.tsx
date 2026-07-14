"use client";

import { useEffect, useState } from "react";
import { fetchAdminDocuments, type AdminDocumentRow } from "@/lib/adminApi";

export default function AdminDocumentsPage() {
  const [items, setItems] = useState<AdminDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminDocuments()
      .then(setItems)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load documents")
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-vital-muted">Loading documents…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-vital-danger" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="vital-card overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-vital-border text-vital-muted">
          <tr>
            <th className="px-4 py-3 font-medium">File</th>
            <th className="px-4 py-3 font-medium">User</th>
            <th className="px-4 py-3 font-medium">Size</th>
            <th className="px-4 py-3 font-medium">Method</th>
            <th className="px-4 py-3 font-medium">Uploaded</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-vital-muted">
                No documents uploaded yet.
              </td>
            </tr>
          ) : (
            items.map((doc) => (
              <tr
                key={doc.id}
                className="border-b border-vital-border/50 hover:bg-vital-bg/40"
              >
                <td className="px-4 py-3 font-medium text-vital-text">{doc.filename}</td>
                <td className="px-4 py-3 text-vital-muted">
                  {doc.user_name}
                  {doc.user_email ? ` · ${doc.user_email}` : ""}
                </td>
                <td className="px-4 py-3">{(doc.size_bytes / 1024).toFixed(1)} KB</td>
                <td className="px-4 py-3">{doc.extraction_method}</td>
                <td className="px-4 py-3 text-vital-muted">{doc.created_at ?? "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
