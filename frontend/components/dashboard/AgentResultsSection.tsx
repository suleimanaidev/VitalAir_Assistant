"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import { type Session } from "next-auth";

import HealthAlertCard from "@/components/HealthAlertCard";
import NutritionCard from "@/components/NutritionCard";
import RouteCard from "@/components/RouteCard";
import ExposureScoreCard from "@/components/ExposureScoreCard";
import HealthExplainabilityPanel from "@/components/HealthExplainabilityPanel";
import SeasonIntelligenceCard from "@/components/SeasonIntelligenceCard";
import AQICard from "@/components/AQICard";
import AgentStepCard, {
  type AgentStepStatus,
} from "@/components/dashboard/AgentStepCard";
import LocationSearchInput from "@/components/map/LocationSearchInput";

import { usePersistedState } from "@/hooks/usePersistedState";
import { cleanAreaName, formatAreaTitle } from "@/lib/formatLocation";
import { formatAqiUpdated } from "@/lib/aqi";
import { LahoreSeason } from "@/lib/lahoreSeason";
import {
  startHealthAgentJob,
  startNutritionAgentJob,
  startRouteAgentJob,
  type AgentHealthResult,
  type AgentNutritionResult,
  type AgentRouteResult,
  type UserProfilePayload,
} from "@/lib/api";
import { streamAgentJob } from "@/lib/agentStream";
import { useVitalAirStore, type HealthProfile } from "@/store/useVitalAirStore";
import { type LahoreSeasonId, isHeatwave, isSmogSeason } from "@/lib/lahoreSeason";

function severityFromContext(
  aqi: number,
  seasonId: LahoreSeasonId,
  tempC?: number,
  heatwave?: boolean
): "info" | "warning" | "critical" {
  if (aqi >= 200) return "critical";
  if (aqi >= 150) return "warning";
  if (isSmogSeason(seasonId) && aqi >= 120) return "warning";
  if ((heatwave || (tempC != null && isHeatwave(tempC))) && aqi >= 100) {
    return "warning";
  }
  if (aqi >= 100) return "warning";
  return "info";
}

function healthTitleFromContext(aqi: number, profile: HealthProfile): string {
  const conditions = profile.conditions.map((c) => c.toLowerCase());
  const hasAsthma = conditions.some((c) => c.includes("asthma"));
  const hasHeart = conditions.some((c) => c.includes("heart"));

  if (aqi >= 200) return "Hazardous air — stay indoors";
  if (aqi >= 150) {
    if (hasAsthma) return "Unhealthy air — asthma alert";
    if (hasHeart) return "Unhealthy air — heart alert";
    return "Limit outdoor exertion";
  }
  if (aqi >= 100) {
    if (hasAsthma || hasHeart || profile.sensitivity === "high") {
      return "Moderate air — extra care for your profile";
    }
    return "Moderate air — take care";
  }
  if (hasAsthma || hasHeart) {
    return "Air quality acceptable — stay prepared";
  }
  return "Air quality acceptable";
}

export interface AgentResultsSectionProps {
  area: string;
  heroAqi: number | null;
  heroLabel: string;
  areaReading: any; // Using any for brevity since type might not be exported
  aqiReady: boolean;
  profile: HealthProfile;
  userId: string | null;
  session: Session | null;
  activeSeason: LahoreSeason;
  activeHeatwave: boolean;
  aqiStepStatus: AgentStepStatus;
}

export default function AgentResultsSection({
  area,
  heroAqi,
  heroLabel,
  areaReading,
  aqiReady,
  profile,
  userId,
  session,
  activeSeason,
  activeHeatwave,
  aqiStepStatus,
}: AgentResultsSectionProps) {
  const setQuery = useVitalAirStore((s) => s.setQuery);
  const setResults = useVitalAirStore((s) => s.setResults);

  const [destination, setDestination] = usePersistedState("vitalair-dashboard-destination", "");
  const [routeOpen, setRouteOpen] = usePersistedState("vitalair-dashboard-routeopen", false);

  const [healthResult, setHealthResult] = usePersistedState<AgentHealthResult | null>("vitalair-dash-health-result", null);
  const [nutritionResult, setNutritionResult] = usePersistedState<AgentNutritionResult | null>("vitalair-dash-nutrition-result", null);
  const [routeResult, setRouteResult] = usePersistedState<AgentRouteResult | null>("vitalair-dash-route-result", null);

  const [healthStatus, setHealthStatus] = usePersistedState<AgentStepStatus>("vitalair-dash-health-status", "idle");
  const [nutritionStatus, setNutritionStatus] = usePersistedState<AgentStepStatus>("vitalair-dash-nutrition-status", "idle");
  const [routeStatus, setRouteStatus] = usePersistedState<AgentStepStatus>("vitalair-dash-route-status", "idle");

  const [healthError, setHealthError] = usePersistedState<string | null>("vitalair-dash-health-error", null);
  const [nutritionError, setNutritionError] = usePersistedState<string | null>("vitalair-dash-nutrition-error", null);
  const [routeError, setRouteError] = usePersistedState<string | null>("vitalair-dash-route-error", null);
  
  const [healthLive, setHealthLive] = useState<string | null>(null);
  const [nutritionLive, setNutritionLive] = useState<string | null>(null);
  const [routeLive, setRouteLive] = useState<string | null>(null);

  const profilePayload = (p: HealthProfile): UserProfilePayload => ({
    name: p.name || "User",
    age: p.age,
    conditions: p.conditions,
    city: "Lahore",
    sensitivity: p.sensitivity,
    commuteMode: p.commuteMode,
    outdoorTime: p.outdoorTime,
  });

  const runHealth = async () => {
    if (!area.trim() || !aqiReady) return;
    setHealthError(null);
    setHealthStatus("loading");
    setHealthLive("Starting Digital Pulmonologist…");
    try {
      const { task_id } = await startHealthAgentJob(
        {
          area: cleanAreaName(area),
          profile: profilePayload(profile),
          user_id: userId ?? undefined,
          aqi: heroAqi ?? undefined,
        },
        session?.backendToken
      );
      const data = await streamAgentJob(task_id, "health", session?.backendToken, {
        onProgress: (message) => setHealthLive(message),
      });
      setHealthResult(data);
      setHealthStatus("done");
    } catch (err) {
      // Local fallback logic
      setHealthResult({
          health_advice: "Based on WHO guidelines, limit outdoor exertion when air quality drops. Consider wearing an N95 mask.",
          temperature_c: 25,
          season: activeSeason.id,
          has_patient_docs: false,
          rag_sources_used: 1,
          aqi: heroAqi ?? 100,
          status: "done",
          agent: "digital_pulmonologist",
          area: area,
          aqi_label: heroLabel
      } as any);
      setHealthError("Agent failed. Showing local fallback advice.");
      setHealthStatus("done");
    } finally {
      setHealthLive(null);
    }
  };

  const runNutrition = async () => {
    if (!area.trim() || !aqiReady) return;
    setNutritionError(null);
    setNutritionStatus("loading");
    setNutritionLive("Starting Environmental Nutritionist…");
    try {
      const { task_id } = await startNutritionAgentJob(
        {
          area: cleanAreaName(area),
          profile: profilePayload(profile),
          user_id: userId ?? undefined,
          aqi: heroAqi ?? undefined,
        },
        session?.backendToken
      );
      const data = await streamAgentJob(
        task_id,
        "nutrition",
        session?.backendToken,
        { onProgress: (message) => setNutritionLive(message) }
      );
      setNutritionResult(data);
      setNutritionStatus("done");
    } catch (err) {
      // Local fallback logic
      setNutritionResult({
          diet_plan: [
            "Use citrus fruits like lemon and oranges to boost immunity.",
            "Stay hydrated with plenty of water.",
            "Avoid heavy fried foods during poor air quality."
          ],
          has_patient_docs: false,
          status: "done",
          agent: "environmental_nutritionist",
          area: area,
          aqi: heroAqi ?? 100,
          rag_sources_used: 1,
          season: activeSeason.id
      } as any);
      setNutritionError("Agent failed. Showing local fallback advice.");
      setNutritionStatus("done");
    } finally {
      setNutritionLive(null);
    }
  };

  const runRoute = async () => {
    const from = cleanAreaName(area);
    const to = cleanAreaName(destination);
    if (!from || !to || !aqiReady) return;

    setRouteError(null);
    setRouteStatus("loading");
    setRouteLive("Starting Smart Route Navigator…");
    setQuery({ source: from, destination: to });

    try {
      const { task_id } = await startRouteAgentJob(
        {
          profile: profilePayload(profile),
          query: { source: from, destination: to },
          user_id: userId ?? undefined,
          aqi: heroAqi ?? undefined,
        },
        session?.backendToken
      );
      const data = await streamAgentJob(task_id, "route", session?.backendToken, {
        onProgress: (message) => setRouteLive(message),
      });
      setRouteResult(data);
      setRouteStatus("done");

      const safe = data.safe_route;
      setResults({
        aqi: data.aqi,
        aqiLabel: data.aqi_label,
        healthAdvice: healthResult?.health_advice ?? "",
        dietPlan: nutritionResult?.diet_plan ?? [],
        personalExposureScore: data.personal_exposure_score ?? null,
        healthExplainability: healthResult?.health_explainability ?? null,
        seasonIntelligence: data.season_intelligence ?? null,
        safeRoute: safe?.cleanest && safe?.fastest
          ? {
              cleanest: safe.cleanest as never,
              fastest: safe.fastest as never,
              recommendation: safe.recommendation ?? safe.reasoning ?? safe.summary,
              distance: safe.distance,
              exposure: safe.exposure,
              waypoints: safe.waypoints ?? [],
              aqiCheckpoints: safe.aqi_checkpoints,
              routeOptions: safe.route_options,
            }
          : safe?.route_options?.length
            ? {
                cleanest: null,
                fastest: null,
                recommendation: safe.reasoning ?? safe.summary,
                distance: safe.distance,
                exposure: safe.exposure,
                waypoints: safe.waypoints ?? [],
                routeOptions: safe.route_options,
              }
            : null,
        season: data.season_intelligence?.id,
        seasonLabel: data.season_intelligence?.label_en,
        temperatureC: healthResult?.temperature_c,
        contextSummary: data.context_summary,
      });
    } catch (err) {
      setRouteError(err instanceof Error ? err.message : "Route agent failed");
      setRouteStatus("error");
    } finally {
      setRouteLive(null);
    }
  };

  const healthSeverity = healthResult
    ? severityFromContext(
        healthResult.aqi,
        activeSeason.id,
        healthResult.temperature_c,
        activeHeatwave
      )
    : "info";

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {(healthLive || nutritionLive || routeLive) && (
        <div
          className="vital-card flex items-start gap-3 border-vital-primary/30 bg-vital-primary/5 p-4"
          role="status"
          aria-live="polite"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vital-primary/15 text-sm">
            🤖
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-vital-text">Agent working…</p>
            <p className="mt-1 text-sm text-vital-muted">
              {healthLive || nutritionLive || routeLive}
            </p>
          </div>
        </div>
      )}

      <AgentStepCard
        step={1}
        icon="🌫️"
        title="Air Quality Monitor"
        status={aqiStepStatus}
      >
        {heroAqi != null ? (
          <AQICard
            city={formatAreaTitle(areaReading?.area ?? area)}
            aqi={heroAqi}
            label={heroLabel}
            pm25Index={areaReading?.pm25_index ?? areaReading?.pm25}
            station={areaReading?.station}
            fetchMethod={areaReading?.fetch_method}
            isStale={areaReading?.is_stale}
            updatedAt={
              areaReading?.updated_at
                ? formatAqiUpdated(
                    areaReading.updated_at,
                    areaReading.station_reported_at
                  )
                : "Just now"
            }
          />
        ) : (
          <p className="text-sm text-vital-muted">
            Area select karein ya type karein list se.
          </p>
        )}
      </AgentStepCard>

      <AgentStepCard
        step={2}
        icon="🫁"
        title="Digital Pulmonologist"
        subtitle="WHO knowledge + aap ki health profile + uploaded documents (RAG)"
        status={!aqiReady ? "locked" : healthStatus}
        onRun={runHealth}
        onReset={() => {
            setHealthResult(null);
            setHealthStatus("idle");
        }}
        runLabel="Get personal health advice"
        disabled={!aqiReady}
        error={healthError}
        liveMessage={healthLive}
      >
        {healthResult ? (
          <>
            <HealthAlertCard
              title={healthTitleFromContext(healthResult.aqi, profile)}
              message={healthResult.health_advice}
              severity={healthSeverity}
              sourceHint={
                healthResult.has_patient_docs
                  ? `WHO RAG + ${healthResult.rag_sources_used} sources + your uploaded health files.`
                  : `WHO RAG · ${healthResult.rag_sources_used} knowledge sources · ${healthResult.agent_mode}.`
              }
            />
            {healthResult.health_explainability && (
              <div className="mt-4">
                <HealthExplainabilityPanel
                  data={healthResult.health_explainability}
                />
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-vital-muted">
            AQI {heroAqi ?? "—"} ke mutabiq personalized health tips — asthma,
            age, commute profile use hoti hai.
          </p>
        )}
      </AgentStepCard>

      <AgentStepCard
        step={3}
        icon="🥦"
        title="Environmental Nutritionist"
        subtitle="Anti-pollution food guide — season & AQI aware"
        status={!aqiReady ? "locked" : nutritionStatus}
        onRun={runNutrition}
        onReset={() => {
            setNutritionResult(null);
            setNutritionStatus("idle");
        }}
        runLabel="Get food guide"
        disabled={!aqiReady}
        error={nutritionError}
        liveMessage={nutritionLive}
      >
        {nutritionResult ? (
          <NutritionCard
            embedded
            items={nutritionResult.diet_plan}
            hasPatientDocs={nutritionResult.has_patient_docs}
          />
        ) : (
          <p className="text-sm text-vital-muted">
            Vitamin C, ginger, omega-3 — RAG diet knowledge se tips.
          </p>
        )}
      </AgentStepCard>

      <AgentStepCard
        step={4}
        icon="🗺️"
        title="Smart Route Navigator"
        subtitle="Sirf jab travel karna ho — 3 low-AQI routes (free OSRM)"
        status={!aqiReady ? "locked" : routeStatus}
        error={routeError}
        liveMessage={routeLive}
      >
        <button
          type="button"
          className="mb-4 flex w-full items-center justify-between rounded-lg border border-vital-border bg-vital-bg/50 px-3 py-2 text-sm text-vital-text"
          onClick={() => setRouteOpen((o) => !o)}
        >
          <span>Planning to travel?</span>
          {routeOpen ? (
            <ChevronUp className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden />
          )}
        </button>

        {routeOpen && (
          <div className="space-y-4">
            <LocationSearchInput
              label="From"
              value={area}
              onChange={() => {}}
              disabled={true}
            />
            <LocationSearchInput
              label="To"
              placeholder="e.g. DHA Phase 5"
              value={destination}
              onChange={setDestination}
              disabled={routeStatus === "loading"}
            />
            <button
              type="button"
              className="btn-primary w-full"
              onClick={runRoute}
              disabled={
                !aqiReady ||
                routeStatus === "loading" ||
                !destination.trim()
              }
            >
              {routeStatus === "loading"
                ? "Finding safer routes…"
                : "Analyze route"}
            </button>
            {routeResult && (
              <button
                type="button"
                className="btn-ghost w-full mt-2 text-sm text-vital-muted hover:text-vital-danger hover:border-vital-danger/40"
                onClick={() => {
                  setRouteResult(null);
                  setRouteOpen(false);
                  setRouteStatus("idle");
                }}
              >
                Close / Reset Route
              </button>
            )}
          </div>
        )}

        {routeResult && (
          <div className="mt-4 space-y-4">
            {routeResult.season_intelligence && (
              <SeasonIntelligenceCard data={routeResult.season_intelligence} />
            )}
            {routeResult.personal_exposure_score && (
              <ExposureScoreCard pes={routeResult.personal_exposure_score} />
            )}
            <RouteCard
              from={cleanAreaName(area)}
              to={cleanAreaName(destination)}
              routeOptions={routeResult.safe_route?.route_options}
            />
            <p className="text-center text-sm text-vital-muted">
              <Link
                href="/route"
                className="text-vital-primary underline-offset-2 hover:underline"
              >
                View route lines on Lahore map →
              </Link>
            </p>
          </div>
        )}

        {!routeOpen && !routeResult && (
          <p className="text-sm text-vital-muted">
            Ghar baithe rehna ho to is step ko skip kar sakte hain.
          </p>
        )}
      </AgentStepCard>
    </motion.div>
  );
}
