import { create } from "zustand";
import { APP_CITY } from "@/lib/constants";
import { LAHORE_AREAS } from "@/lib/lahoreAreas";
import { aqiLabel, type AreaAqiPayload } from "@/lib/aqi";
import type { AnalyzeResult } from "@/lib/api";

export type City = typeof APP_CITY;
export type Sensitivity = "low" | "medium" | "high";
export type CommuteMode = "walk" | "bike" | "car" | "public_transport";
export type OutdoorTime = "under_30" | "30_60" | "1_2" | "2_plus";
export type StreamStatus = "idle" | "streaming" | "complete" | "error";
export type AgentLogStatus = "thinking" | "done" | "error";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
  meta?: string;
}

export interface AgentLog {
  agent: string;
  status: AgentLogStatus;
  message: string;
  timestamp: string;
}

export interface RouteGeoJSON {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: number[][];
  };
  properties?: Record<string, unknown>;
}

export interface RouteOptionData {
  rank: number;
  label: string;
  distance: string;
  duration?: string;
  avg_aqi: number;
  exposure: string;
  waypoints: string[];
  via_areas: string[];
  recommendation?: string;
}

export interface RouteData {
  cleanest: RouteGeoJSON | null;
  fastest: RouteGeoJSON | null;
  recommendation: string;
  distance?: string;
  exposure?: string;
  waypoints?: string[];
  aqiCheckpoints?: { lat: number; lng: number; aqi: number }[];
  routeOptions?: RouteOptionData[];
}

export interface PesBreakdown {
  aqi_component: number;
  distance_component: number;
  commute_component: number;
  health_component: number;
}

export interface PersonalExposureScoreData {
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
  breakdown: PesBreakdown;
}

export interface ExplanationSourceData {
  index: number;
  title: string;
  confidence: number;
}

export interface ReasoningStepData {
  step: number;
  description: string;
}

export interface HealthExplainabilityData {
  recommendation: string;
  agent_name: string;
  agent_version: string;
  agent_mode?: string;
  sources: ExplanationSourceData[];
  reasoning_chain: ReasoningStepData[];
  confidence_pct: number;
  reviewed_against: string[];
}

export interface SeasonIntelligenceData {
  id: string;
  name: string;
  months: string;
  label_en: string;
  primary_hazard: string;
  pollutants: string[];
  health_agent_focus: string;
  nutrition_agent_focus: string;
  route_agent_focus: string;
  avoid_areas: string[];
  preferred_travel_window: string;
}

export interface AnalyzeResultsState {
  aqi: number;
  aqiLabel: string;
  healthAdvice: string;
  dietPlan: string[];
  safeRoute: RouteData | null;
  personalExposureScore: PersonalExposureScoreData | null;
  healthExplainability: HealthExplainabilityData | null;
  seasonIntelligence: SeasonIntelligenceData | null;
  season?: string;
  seasonLabel?: string;
  temperatureC?: number;
  humidity?: number;
  heatwave?: boolean;
  contextSummary?: string;
}

/** User health profile collected during onboarding */
export interface HealthProfile {
  name: string;
  age: number;
  city: City;
  conditions: string[];
  sensitivity: Sensitivity;
  commuteMode: CommuteMode;
  outdoorTime: OutdoorTime;
}

interface VitalAirState {
  healthProfile: HealthProfile | null;
  profileComplete: boolean | null;
  userId: string | null;
  query: { source: string; destination: string };
  results: AnalyzeResultsState;
  taskId: string | null;
  agentLogs: AgentLog[];
  streamStatus: StreamStatus;
  lahoreAreas: AreaAqiPayload[];
  lahoreAreasFetchedAt: string | null;
  chatTurns: ChatTurn[];

  setHealthProfile: (profile: HealthProfile) => void;
  setProfileComplete: (complete: boolean | null) => void;
  setUserId: (id: string) => void;
  clearHealthProfile: () => void;
  setQuery: (q: { source: string; destination: string }) => void;
  setTaskId: (id: string | null) => void;
  upsertAgentLog: (log: AgentLog) => void;
  setResults: (r: AnalyzeResultsState) => void;
  setResultsFromAnalyze: (r: AnalyzeResult) => void;
  setStreamStatus: (s: StreamStatus) => void;
  resetStream: () => void;
  reset: () => void;
  setLahoreAreas: (areas: AreaAqiPayload[]) => void;
  setChatTurns: (turns: ChatTurn[]) => void;
}

export const defaultProfile: HealthProfile = {
  name: "",
  age: 22,
  city: APP_CITY,
  conditions: [],
  sensitivity: "medium",
  commuteMode: "car",
  outdoorTime: "30_60",
};

const emptyResults: AnalyzeResultsState = {
  aqi: 0,
  aqiLabel: "",
  healthAdvice: "",
  dietPlan: [],
  safeRoute: null,
  personalExposureScore: null,
  healthExplainability: null,
  seasonIntelligence: null,
};

function contextFromAnalyze(data: AnalyzeResult) {
  return {
    season: data.season,
    seasonLabel: data.season_label,
    temperatureC: data.temperature_c,
    humidity: data.humidity,
    heatwave: data.heatwave,
    contextSummary: data.context_summary,
  };
}

export function mapAnalyzeToResults(data: AnalyzeResult): AnalyzeResultsState {
  const ctx = contextFromAnalyze(data);
  const label = aqiLabel(data.aqi_at_time);
  const safe = data.safe_route as AnalyzeResult["safe_route"] & {
    cleanest?: RouteGeoJSON;
    fastest?: RouteGeoJSON;
    recommendation?: string;
    aqi_checkpoints?: { lat: number; lng: number; aqi: number }[];
    route_options?: RouteOptionData[];
  };

  const routeOptions = safe?.route_options ?? [];

  const pes = data.personal_exposure_score ?? null;
  const explainability = data.health_explainability ?? null;
  const seasonIntel = data.season_intelligence ?? null;

  if (safe?.cleanest && safe?.fastest) {
    return {
      aqi: data.aqi_at_time,
      aqiLabel: label,
      healthAdvice: data.health_advice,
      dietPlan: data.diet_plan ?? [],
      personalExposureScore: pes,
      healthExplainability: explainability,
      seasonIntelligence: seasonIntel,
      safeRoute: {
        cleanest: safe.cleanest as RouteGeoJSON,
        fastest: safe.fastest as RouteGeoJSON,
        recommendation: safe.recommendation ?? safe.reasoning ?? safe.summary,
        distance: safe.distance,
        exposure: safe.exposure,
        waypoints: safe.waypoints,
        aqiCheckpoints: safe.aqi_checkpoints,
        routeOptions,
      },
      ...ctx,
    };
  }

  const waypoints = data.safe_route?.waypoints ?? [];
  const coords: number[][] = [];

  for (const wp of waypoints) {
    const area = LAHORE_AREAS.find(
      (a) =>
        a.name.toLowerCase() === wp.toLowerCase() ||
        wp.toLowerCase().includes(a.name.toLowerCase())
    );
    if (area) coords.push([area.lon, area.lat]);
  }

  const line: RouteGeoJSON | null =
    coords.length >= 2
      ? {
          type: "Feature",
          geometry: { type: "LineString", coordinates: coords },
          properties: { label: data.safe_route.summary },
        }
      : null;

  return {
    aqi: data.aqi_at_time,
    aqiLabel: label,
    healthAdvice: data.health_advice,
    dietPlan: data.diet_plan ?? [],
    personalExposureScore: pes,
    healthExplainability: explainability,
    seasonIntelligence: seasonIntel,
    safeRoute: line
      ? {
          cleanest: line,
          fastest: line,
          recommendation: data.safe_route.reasoning ?? data.safe_route.summary,
          distance: data.safe_route.distance,
          exposure: data.safe_route.exposure,
          waypoints: data.safe_route.waypoints,
          routeOptions,
        }
      : routeOptions.length > 0
        ? {
            cleanest: null,
            fastest: null,
            recommendation: data.safe_route.reasoning ?? data.safe_route.summary,
            distance: data.safe_route.distance,
            exposure: data.safe_route.exposure,
            waypoints: data.safe_route.waypoints,
            routeOptions,
          }
        : null,
    ...ctx,
  };
}

export const useVitalAirStore = create<VitalAirState>((set) => ({
  healthProfile: null,
  profileComplete: null,
  userId: null,
  query: { source: "", destination: "" },
  results: emptyResults,
  taskId: null,
  agentLogs: [],
  streamStatus: "idle",
  lahoreAreas: [],
  lahoreAreasFetchedAt: null,
  chatTurns: [],

  setHealthProfile: (profile) =>
    set({ healthProfile: { ...profile, city: APP_CITY } }),
  setProfileComplete: (complete) => set({ profileComplete: complete }),
  setUserId: (id) => set({ userId: id }),
  clearHealthProfile: () =>
    set({
      healthProfile: null,
      profileComplete: null,
      userId: null,
      query: { source: "", destination: "" },
      results: emptyResults,
      taskId: null,
      agentLogs: [],
      streamStatus: "idle",
      chatTurns: [],
    }),
  setQuery: (q) => set({ query: q }),
  setTaskId: (id) => set({ taskId: id }),
  upsertAgentLog: (log) =>
    set((s) => {
      const idx = s.agentLogs.findIndex((l) => l.agent === log.agent);
      if (idx >= 0) {
        const agentLogs = [...s.agentLogs];
        agentLogs[idx] = log;
        return { agentLogs };
      }
      return { agentLogs: [...s.agentLogs, log] };
    }),
  setResults: (r) => set({ results: r }),
  setResultsFromAnalyze: (r) => set({ results: mapAnalyzeToResults(r) }),
  setStreamStatus: (s) => set({ streamStatus: s }),
  resetStream: () => set({ agentLogs: [], taskId: null, streamStatus: "idle" }),
  reset: () =>
    set({
      agentLogs: [],
      taskId: null,
      streamStatus: "idle",
      results: emptyResults,
      chatTurns: [],
    }),
  setLahoreAreas: (areas) =>
    set({
      lahoreAreas: areas,
      lahoreAreasFetchedAt: new Date().toISOString(),
    }),
  setChatTurns: (turns) => set({ chatTurns: turns }),
}));
