import { env } from "@/lib/env";

const API_BASE = env.backendUrl.replace(/\/$/, "");

export interface ExposureTrendsSummary {
  average_pes: number;
  hazardous_days: number;
  safe_days: number;
  safest_route_pct: number;
  mask_compliance_days: number;
  mask_recommended_days: number;
  total_analyses: number;
  days_with_data: number;
  tip: string;
}

export interface DailyPesPoint {
  date: string;
  label: string;
  pes: number | null;
  aqi: number | null;
}

export interface ExposureTrendsResponse {
  city: string;
  status: string;
  summary: ExposureTrendsSummary;
  daily_pes: DailyPesPoint[];
  aqi_categories: { category: string; days: number }[];
  route_choices: { name: string; value: number }[];
}

export async function fetchExposureTrends(
  userId?: string,
  token?: string,
  days = 30
): Promise<ExposureTrendsResponse> {
  const q = new URLSearchParams({ days: String(days) });
  if (userId) q.set("user_id", userId);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/history/trends?${q}`, {
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { detail?: string }).detail || `Trends failed (${res.status})`
    );
  }

  return res.json() as Promise<ExposureTrendsResponse>;
}
