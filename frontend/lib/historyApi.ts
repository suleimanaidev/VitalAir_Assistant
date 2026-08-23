import { env } from "@/lib/env";

const API_BASE = env.backendUrl.replace(/\/$/, "");

export interface HistoryItem {
  id: string;
  source?: string;
  destination?: string;
  aqi_at_time?: number;
  pes_score?: number;
  pes_level?: string;
  health_advice?: string;
  diet_plan?: string[];
  status?: string;
  timestamp?: string;
}

export interface SaveHistoryPayload {
  source: string;
  destination?: string;
  aqi_at_time?: number;
  pes_score?: number;
  pes_level?: string;
  health_advice?: string;
  diet_plan?: string[];
  safe_route?: Record<string, unknown>;
  status?: string;
  user_id?: string;
}

export async function fetchHistory(
  userId?: string,
  token?: string,
  limit = 50
): Promise<HistoryItem[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  if (userId) q.set("user_id", userId);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/history?${q}`, {
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail || `Failed to load history (${res.status})`
    );
  }

  const data = (await res.json()) as { items?: HistoryItem[] };
  return data.items ?? [];
}

export async function saveHistoryRecord(
  payload: SaveHistoryPayload,
  token?: string
): Promise<{ id: string; message: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/history`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail || `Failed to save history (${res.status})`
    );
  }

  return (await res.json()) as { id: string; message: string };
}

export async function deleteHistoryRecord(
  recordId: string,
  token?: string
): Promise<{ message: string }> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/history/${encodeURIComponent(recordId)}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail || `Failed to delete record (${res.status})`
    );
  }

  return (await res.json()) as { message: string };
}

export async function clearAllHistory(
  userId?: string,
  token?: string
): Promise<{ deleted_count: number; message: string }> {
  const q = new URLSearchParams();
  if (userId) q.set("user_id", userId);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/history?${q}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail || `Failed to clear history (${res.status})`
    );
  }

  return (await res.json()) as { deleted_count: number; message: string };
}
