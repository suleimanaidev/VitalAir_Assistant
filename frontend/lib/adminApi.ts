import { parseApiError } from "@/lib/apiError";

export interface AdminStats {
  users_total: number;
  queries_total: number;
  queries_today: number;
  documents_total: number;
  symptom_checkins_today: number;
  admin_users: number;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string | null;
  role: string;
  is_active: boolean;
  age: number | null;
  conditions: string[];
  city: string;
  profile_completed: boolean;
  created_at: string | null;
  documents_count: number;
  queries_count: number;
}

export interface AdminUserDetail extends AdminUserRow {
  documents: Array<{
    id: string;
    filename: string;
    content_type: string;
    size_bytes: number;
    preview: string;
    created_at: string | null;
  }>;
  recent_queries: Array<{
    id: string;
    source?: string;
    destination?: string;
    aqi_at_time?: number;
    timestamp?: string | null;
  }>;
  today_symptoms: unknown;
}

export interface AdminDocumentRow {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  filename: string;
  content_type: string;
  size_bytes: number;
  extraction_method: string;
  created_at: string | null;
}

export interface AdminSystemInfo {
  mongodb: boolean;
  rag_index: boolean;
  crew_mode: string;
  llm_provider: string;
  has_openai: boolean;
  has_waqi: boolean;
  admin_emails_configured: number;
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseApiError(data, `Admin request failed (${res.status})`));
  }
  return data as T;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const data = await adminFetch<AdminStats & { status: string }>("stats");
  return data;
}

export async function fetchAdminUsers(options?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ items: AdminUserRow[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.search?.trim()) params.set("search", options.search.trim());
  const qs = params.toString();
  return adminFetch(`users${qs ? `?${qs}` : ""}`);
}

export async function fetchAdminUser(userId: string): Promise<AdminUserDetail> {
  const data = await adminFetch<{ user: AdminUserDetail }>(`users/${userId}`);
  return data.user;
}

export async function patchAdminUser(
  userId: string,
  body: { role?: "admin" | "user"; is_active?: boolean }
): Promise<AdminUserDetail> {
  const data = await adminFetch<{ user: AdminUserDetail }>(`users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return data.user;
}

export async function fetchAdminDocuments(): Promise<AdminDocumentRow[]> {
  const data = await adminFetch<{ items: AdminDocumentRow[] }>("documents");
  return data.items;
}

export async function fetchAdminSystem(): Promise<AdminSystemInfo> {
  return adminFetch<AdminSystemInfo>("system");
}

export async function reingestAdminRag(): Promise<{ message: string; rag_index: boolean }> {
  return adminFetch("rag/reingest", { method: "POST", body: "{}" });
}
