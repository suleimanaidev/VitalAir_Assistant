import { APP_CITY } from "@/lib/constants";
import { env } from "@/lib/env";

/**
 * API layer — talks to FastAPI backend with mock fallback.
 */

const API_BASE = env.backendUrl.replace(/\/$/, "");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = 120_000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        signal: init?.signal ?? controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { detail?: string }).detail || `API error ${res.status}`
        );
      }
      return res.json() as Promise<T>;
    } catch (err) {
      lastError = err;
      if (attempt === 2 || init?.signal) break;
      await sleep(300 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }

  if (lastError instanceof Error && lastError.name === "AbortError") {
    throw new Error("Request timed out. Please try again.");
  }
  if (lastError instanceof Error && lastError.message === "Failed to fetch") {
    throw new Error("Backend connection interrupted. Please try again.");
  }
  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

export interface AQIReading {
  city: string;
  aqi: number;
  label: string;
  pm25: number;
  updatedAt: string;
}

export interface UserProfilePayload {
  name: string;
  age: number;
  conditions: string[];
  city?: string;
  sensitivity?: string;
  commuteMode?: string;
  outdoorTime?: string;
}

export interface AnalyzePayload {
  profile: UserProfilePayload;
  query: { source: string; destination: string };
  user_id?: string;
}

export interface AnalyzeResult {
  status: string;
  aqi_at_time: number;
  health_advice: string;
  diet_plan: string[];
  safe_route: {
    summary: string;
    distance?: string;
    duration?: string;
    exposure?: string;
    waypoints: string[];
    reasoning?: string;
    cleanest?: { type: string; geometry: { type: string; coordinates: number[][] } };
    fastest?: { type: string; geometry: { type: string; coordinates: number[][] } };
    recommendation?: string;
    aqi_checkpoints?: { lat: number; lng: number; aqi: number }[];
    route_options?: {
      rank: number;
      label: string;
      distance: string;
      duration?: string;
      avg_aqi: number;
      exposure: string;
      waypoints: string[];
      via_areas: string[];
      recommendation?: string;
    }[];
  };
  query_id?: string;
  season?: string;
  season_label?: string;
  temperature_c?: number;
  humidity?: number;
  heatwave?: boolean;
  context_summary?: string;
  season_intelligence?: {
    id: string;
    name: string;
    months: string;
    label_en: string;
    label_ur?: string;
    primary_hazard: string;
    pollutants: string[];
    health_agent_focus: string;
    nutrition_agent_focus: string;
    route_agent_focus: string;
    avoid_areas: string[];
    preferred_travel_window: string;
  };
  health_explainability?: {
    recommendation: string;
    agent_name: string;
    agent_version: string;
    agent_mode?: string;
    sources: { index: number; title: string; confidence: number }[];
    reasoning_chain: { step: number; description: string }[];
    confidence_pct: number;
    reviewed_against: string[];
  };
  personal_exposure_score?: {
    score: number;
    level: string;
    level_label: string;
    emoji: string;
    aqi: number;
    aqi_label: string;
    commute_mode: string;
    commute_label: string;
    commute_factor: number;
    health_flags: string[];
    health_factor: number;
    distance_km: number;
    distance_label: string;
    recommendation: string;
    breakdown: {
      aqi_component: number;
      distance_component: number;
      commute_component: number;
      health_component: number;
    };
  };
}

/** GET live AQI — Next.js route (WAQI) with optional FastAPI fallback */
export async function fetchAQI(_city = APP_CITY): Promise<AQIReading> {
  const res = await fetch("/api/aqi", { cache: "no-store" });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail || `AQI unavailable (${res.status})`);
  }
  const data = (await res.json()) as {
    city: string;
    aqi: number;
    label: string;
    pm25?: number;
    updated_at?: string;
  };
  return {
    city: data.city,
    aqi: data.aqi,
    label: data.label,
    pm25: data.pm25 ?? 0,
    updatedAt: data.updated_at ?? new Date().toISOString(),
  };
}

/** POST /api/profile */
export async function saveProfile(
  profile: UserProfilePayload
): Promise<{ user_id: string }> {
  const data = await request<{ user_id: string }>("/api/profile", {
    method: "POST",
    body: JSON.stringify({ ...profile, city: APP_CITY }),
  });
  return data;
}

const MOCK_ANALYZE: AnalyzeResult = {
  status: "success",
  aqi_at_time: 187,
  health_advice:
    "AQI is unhealthy. Limit outdoor exertion, wear an N95 mask, and keep rescue medication nearby if asthmatic.",
  diet_plan: [
    "Ginger tea with honey",
    "Citrus fruits (vitamin C)",
    "Leafy greens and turmeric soups",
    "Green tea",
  ],
  safe_route: {
    summary: "Gulberg → DHA",
    distance: "8.4 km",
    exposure: "Low–moderate",
    waypoints: ["Gulberg", "Liberty Market", "MM Alam Road"],
    reasoning: "Mock route — backend unavailable.",
  },
};

/** POST /api/analyze/sync — synchronous fallback (no SSE) */
export async function analyzeRouteStream(
  payload: AnalyzePayload
): Promise<AnalyzeResult> {
  return request<AnalyzeResult>("/api/analyze/sync", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface AgentAreaPayload {
  area: string;
  profile: UserProfilePayload;
  user_id?: string;
  aqi?: number;
  destination?: string;
}

export interface SymptomCheckinSymptoms {
  cough: number;
  breathlessness: number;
  chest_tightness: number;
  headache: number;
  sleep_quality: number;
  took_medication: boolean;
  skipped: boolean;
}

export interface SymptomCheckinPayload {
  cough?: number;
  breathlessness?: number;
  chest_tightness?: number;
  headache?: number;
  sleep_quality?: number;
  took_medication?: boolean;
  skipped?: boolean;
}

export interface SymptomCheckinResult {
  status: string;
  user_id: string;
  date: string;
  symptoms: SymptomCheckinSymptoms;
  score: number;
  risk_level: "none" | "mild" | "high";
  summary: string;
  created_at?: string;
  updated_at?: string;
}

export interface AgentHealthResult {
  status: string;
  agent: string;
  area: string;
  aqi: number;
  aqi_label: string;
  health_advice: string;
  health_explainability?: AnalyzeResult["health_explainability"];
  rag_sources_used: number;
  has_patient_docs: boolean;
  agent_mode: string;
  season?: string;
  season_label?: string;
  temperature_c?: number;
}

export interface AgentNutritionResult {
  status: string;
  agent: string;
  area: string;
  aqi: number;
  diet_plan: string[];
  rag_sources_used: number;
  has_patient_docs?: boolean;
  agent_mode: string;
  season?: string;
  season_label?: string;
}

export interface AgentRouteResult {
  status: string;
  agent: string;
  aqi: number;
  aqi_label: string;
  safe_route: AnalyzeResult["safe_route"];
  personal_exposure_score?: AnalyzeResult["personal_exposure_score"];
  season_intelligence?: AnalyzeResult["season_intelligence"];
  context_summary?: string;
  route_source: string;
}

async function agentRequest<T>(
  path: string,
  body: unknown,
  token?: string
): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

/** Digital Pulmonologist — WHO RAG + patient documents + profile */
export async function runHealthAgent(
  payload: AgentAreaPayload,
  token?: string
): Promise<AgentHealthResult> {
  return agentRequest<AgentHealthResult>("/api/agents/health", payload, token);
}

export async function startHealthAgentJob(
  payload: AgentAreaPayload,
  token?: string
): Promise<{ task_id: string }> {
  return agentRequest<{ task_id: string }>(
    "/api/agents/health/async",
    payload,
    token
  );
}

/** Environmental Nutritionist — diet RAG */
export async function runNutritionAgent(
  payload: AgentAreaPayload,
  token?: string
): Promise<AgentNutritionResult> {
  return agentRequest<AgentNutritionResult>(
    "/api/agents/nutrition",
    payload,
    token
  );
}

export async function startNutritionAgentJob(
  payload: AgentAreaPayload,
  token?: string
): Promise<{ task_id: string }> {
  return agentRequest<{ task_id: string }>(
    "/api/agents/nutrition/async",
    payload,
    token
  );
}

/** Smart Route Navigator — OSRM/Google routes */
export async function runRouteAgent(
  payload: AnalyzePayload & { aqi?: number },
  token?: string
): Promise<AgentRouteResult> {
  return agentRequest<AgentRouteResult>(
    "/api/agents/route",
    {
      profile: payload.profile,
      query: payload.query,
      user_id: payload.user_id,
      aqi: payload.aqi,
    },
    token
  );
}

export async function startRouteAgentJob(
  payload: AnalyzePayload & { aqi?: number },
  token?: string
): Promise<{ task_id: string }> {
  return agentRequest<{ task_id: string }>(
    "/api/agents/route/async",
    {
      profile: payload.profile,
      query: payload.query,
      user_id: payload.user_id,
      aqi: payload.aqi,
    },
    token
  );
}

export async function fetchTodaySymptoms(
  token?: string
): Promise<SymptomCheckinResult | null> {
  if (!token) return null;
  return request<SymptomCheckinResult | null>("/api/symptoms/today", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function saveTodaySymptoms(
  payload: SymptomCheckinPayload,
  token?: string
): Promise<SymptomCheckinResult> {
  if (!token) {
    throw new Error("Please sign in to save today's health check-in.");
  }
  return request<SymptomCheckinResult>("/api/symptoms/checkin", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** @deprecated use analyzeRouteStream + SSE */
export async function analyzeRoute(
  payload: AnalyzePayload
): Promise<AnalyzeResult> {
  try {
    return await analyzeRouteStream(payload);
  } catch {
    return {
      ...MOCK_ANALYZE,
      safe_route: {
        ...MOCK_ANALYZE.safe_route,
        summary: `${payload.query.source} → ${payload.query.destination}`,
      },
    };
  }
}

/** Mock safer route (legacy helper) */
export async function fetchRoute(
  _from: string,
  _to: string
): Promise<{ distance: string; exposure: string; path: string[] }> {
  return {
    distance: "8.4 km",
    exposure: "Low–moderate",
    path: ["Gulberg", "Liberty Market", "MM Alam Road"],
  };
}
