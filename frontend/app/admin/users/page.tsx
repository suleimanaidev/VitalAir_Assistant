"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchAdminUsers, type AdminUserRow } from "@/lib/adminApi";

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchAdminUsers({ page, limit: 20, search: query || undefined })
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load users")
      )
      .finally(() => setLoading(false));
  }, [page, query]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div>
      <form
        className="mb-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className="input-field flex-1"
        />
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>

      {error && (
        <p className="mb-4 text-sm text-vital-danger" role="alert">
          {error}
        </p>
      )}

      <div className="vital-card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-vital-border text-vital-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Docs</th>
              <th className="px-4 py-3 font-medium">Runs</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-vital-muted">
                  Loading users…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-vital-muted">
                  No users found.
                </td>
              </tr>
            ) : (
              items.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-vital-border/50 hover:bg-vital-bg/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="font-medium text-vital-primary hover:underline"
                    >
                      {user.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-vital-muted">{user.email ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">{user.role}</td>
                  <td className="px-4 py-3">{user.documents_count}</td>
                  <td className="px-4 py-3">{user.queries_count}</td>
                  <td className="px-4 py-3">
                    {user.is_active ? (
                      <span className="text-vital-primary">Active</span>
                    ) : (
                      <span className="text-vital-danger">Disabled</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-vital-muted">
        <span>
          {total} user{total === 1 ? "" : "s"}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost text-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="px-2 py-1">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn-ghost text-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
