"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, ChevronDown, ChevronUp, MessageCircle, ShieldAlert } from "lucide-react";
import { useSession } from "next-auth/react";

import AQICard from "@/components/AQICard";
import HealthAlertCard from "@/components/HealthAlertCard";
import NutritionCard from "@/components/NutritionCard";
import RouteCard from "@/components/RouteCard";
import ExposureScoreCard from "@/components/ExposureScoreCard";
import HealthExplainabilityPanel from "@/components/HealthExplainabilityPanel";
import SeasonIntelligenceCard from "@/components/SeasonIntelligenceCard";
import AgentStepCard, {
  type AgentStepStatus,
} from "@/components/dashboard/AgentStepCard";
import PatientRagChatPanel from "@/components/dashboard/PatientRagChatPanel";
import SymptomCheckinCard from "@/components/dashboard/SymptomCheckinCard";
import LocationSearchInput from "@/components/map/LocationSearchInput";
import { formatAqiUpdated, aqiLabel } from "@/lib/aqi";
import {
  fetchTodaySymptoms,
  startHealthAgentJob,
  startNutritionAgentJob,
  startRouteAgentJob,
  saveTodaySymptoms,
  type AgentHealthResult,
  type AgentNutritionResult,
  type AgentRouteResult,
  type SymptomCheckinPayload,
  type SymptomCheckinResult,
  type UserProfilePayload,
} from "@/lib/api";
import { streamAgentJob } from "@/lib/agentStream";
import { APP_CITY } from "@/lib/constants";
import { cleanAreaName, formatAreaTitle } from "@/lib/formatLocation";
import { useAreaAqi } from "@/hooks/useAreaAqi";
import { useLahoreWeather } from "@/hooks/useLahoreWeather";
import {
  getLahoreSeason,
  isHeatwave,
  isSmogSeason,
  type LahoreSeasonId,
} from "@/lib/lahoreSeason";
import {
  defaultProfile,
  useVitalAirStore,
  type HealthProfile,
} from "@/store/useVitalAirStore";

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

function dailyRiskFromContext(
  aqi: number | null,
  profile: HealthProfile,
  symptomScore?: number,
  heatwave?: boolean
): {
  score: number;
  label: string;
  tone: "low" | "moderate" | "high";
  advice: string;
} {
  if (aqi == null) {
    return {
      score: 0,
      label: "Waiting for AQI",
      tone: "low",
      advice: "Area select karein taake daily risk calculate ho.",
    };
  }

  const conditions = profile.conditions.length;
  const sensitivityBoost =
    profile.sensitivity === "high" ? 14 : profile.sensitivity === "medium" ? 7 : 0;
  const commuteBoost =
    profile.commuteMode === "walk" || profile.commuteMode === "bike"
      ? 10
      : profile.commuteMode === "public_transport"
        ? 5
        : 2;
  const outdoorBoost =
    profile.outdoorTime === "2_plus"
      ? 12
      : profile.outdoorTime === "1_2"
        ? 8
        : profile.outdoorTime === "30_60"
          ? 4
          : 0;
  const score = Math.min(
    100,
    Math.round(
      Math.min(aqi, 300) * 0.22 +
        conditions * 8 +
        sensitivityBoost +
        commuteBoost +
        outdoorBoost +
        (symptomScore ?? 0) * 3 +
        (heatwave ? 6 : 0)
    )
  );

  if (score >= 70) {
    return {
      score,
      label: "High risk today",
      tone: "high",
      advice: "Outdoor exertion avoid karein; N95, hydration, aur doctor plan follow karein.",
    };
  }
  if (score >= 40) {
    return {
      score,
      label: "Moderate risk today",
      tone: "moderate",
      advice: "Mask use karein, outdoor time short rakhein, aur symptoms monitor karein.",
    };
  }
  return {
    score,
    label: "Lower risk today",
    tone: "low",
    advice: "Routine safe hai, lekin AQI badhne par mask ready rakhein.",
  };
}

function profilePayload(profile: HealthProfile): UserProfilePayload {
  return {
    name: profile.name || "User",
    age: profile.age,
    conditions: profile.conditions,
    city: APP_CITY,
    sensitivity: profile.sensitivity,
    commuteMode: profile.commuteMode,
    outdoorTime: profile.outdoorTime,
  };
}

const DASHBOARD_AREA_KEY = "vitalair-dashboard-area";

function readStoredDashboardArea(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(DASHBOARD_AREA_KEY) ?? "";
  } catch {
    return "";
  }
}

export default function DashboardView() {
  const { data: session } = useSession();

  const healthProfile = useVitalAirStore((s) => s.healthProfile);
  const profileComplete = useVitalAirStore((s) => s.profileComplete);
  const userId = useVitalAirStore((s) => s.userId);
  const setQuery = useVitalAirStore((s) => s.setQuery);
  const setResults = useVitalAirStore((s) => s.setResults);
  const setUserId = useVitalAirStore((s) => s.setUserId);

  const profile: HealthProfile = healthProfile ?? defaultProfile;
  const profileLoading = profileComplete === null && !!session?.user;

  const { weather } = useLahoreWeather();
  const liveSeason = useMemo(() => getLahoreSeason(), []);

  const [area, setAreaInternal] = useState(readStoredDashboardArea);
  const setArea = (value: string) => {
    setAreaInternal(value);
    try {
      if (value.trim()) {
        sessionStorage.setItem(DASHBOARD_AREA_KEY, value);
      }
    } catch {
      /* ignore storage errors */
    }
  };
  const [destination, setDestination] = useState("");
  const [routeOpen, setRouteOpen] = useState(false);

  const [healthResult, setHealthResult] = useState<AgentHealthResult | null>(null);
  const [nutritionResult, setNutritionResult] = useState<AgentNutritionResult | null>(null);
  const [routeResult, setRouteResult] = useState<AgentRouteResult | null>(null);
  const [todaySymptoms, setTodaySymptoms] = useState<SymptomCheckinResult | null>(null);

  const [healthStatus, setHealthStatus] = useState<AgentStepStatus>("idle");
  const [nutritionStatus, setNutritionStatus] = useState<AgentStepStatus>("idle");
  const [routeStatus, setRouteStatus] = useState<AgentStepStatus>("idle");

  const [healthError, setHealthError] = useState<string | null>(null);
  const [nutritionError, setNutritionError] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [healthLive, setHealthLive] = useState<string | null>(null);
  const [nutritionLive, setNutritionLive] = useState<string | null>(null);
  const [routeLive, setRouteLive] = useState<string | null>(null);
  const [symptomLoading, setSymptomLoading] = useState(false);
  const [symptomSaving, setSymptomSaving] = useState(false);
  const [symptomError, setSymptomError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const { reading: areaReading, loading: areaAqiLoading } = useAreaAqi(area);

  const heroAqi = areaReading?.aqi ?? null;
  const heroLabel = areaReading?.label ?? (heroAqi != null ? aqiLabel(heroAqi) : "—");
  const aqiReady = heroAqi != null && !areaAqiLoading;

  const activeSeason = useMemo(() => {
    if (healthResult?.season) {
      return {
        id: healthResult.season as LahoreSeasonId,
        labelEn: healthResult.season_label ?? liveSeason.labelEn,
      };
    }
    return liveSeason;
  }, [healthResult, liveSeason]);

  const activeTempC = healthResult?.temperature_c ?? weather?.temperature_c;
  const activeHeatwave = activeTempC != null && isHeatwave(activeTempC);

  const healthSeverity = severityFromContext(
    healthResult?.aqi ?? heroAqi ?? 0,
    activeSeason.id,
    activeTempC,
    activeHeatwave
  );

  const dailyRisk = useMemo(
    () =>
      dailyRiskFromContext(
        heroAqi,
        profile,
        todaySymptoms?.score,
        activeHeatwave
      ),
    [heroAqi, profile, todaySymptoms?.score, activeHeatwave]
  );

  const aqiStepStatus: AgentStepStatus = areaAqiLoading
    ? "loading"
    : aqiReady
      ? "done"
      : "idle";

  useEffect(() => {
    if (session?.user?.id) setUserId(session.user.id);
  }, [session?.user?.id, setUserId]);

  useEffect(() => {
    if (!session?.backendToken) {
      setTodaySymptoms(null);
      return;
    }

    let alive = true;
    setSymptomLoading(true);
    setSymptomError(null);
    fetchTodaySymptoms(session.backendToken)
      .then((data) => {
        if (alive) setTodaySymptoms(data);
      })
      .catch((err) => {
        if (alive) {
          setSymptomError(
            err instanceof Error ? err.message : "Could not load check-in"
          );
        }
      })
      .finally(() => {
        if (alive) setSymptomLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [session?.backendToken]);

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
      setHealthError(err instanceof Error ? err.message : "Health agent failed");
      setHealthStatus("error");
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
      setNutritionError(
        err instanceof Error ? err.message : "Nutrition agent failed"
      );
      setNutritionStatus("error");
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

  const saveSymptomCheckin = async (payload: SymptomCheckinPayload) => {
    if (!session?.backendToken) return;
    setSymptomSaving(true);
    setSymptomError(null);
    try {
      const data = await saveTodaySymptoms(payload, session.backendToken);
      setTodaySymptoms(data);
    } catch (err) {
      setSymptomError(
        err instanceof Error ? err.message : "Could not save check-in"
      );
    } finally {
      setSymptomSaving(false);
    }
  };

  return (
    <main className="pb-16">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="section-title">AI Agent Dashboard</h1>
          <p className="section-subtitle">
            {healthProfile ? (
              <>
                Welcome,{" "}
                <span className="text-vital-primary">{profile.name}</span> — run
                each agent step by step for {APP_CITY}.
              </>
            ) : profileLoading ? (
              "Loading your health profile…"
            ) : (
              <>
                <Link
                  href="/profile"
                  className="text-vital-primary underline-offset-2 hover:underline"
                >
                  Set up your health profile
                </Link>{" "}
                for personalized health &amp; nutrition advice.
              </>
            )}
          </p>
        </header>

        <div className="vital-card mb-6 p-5">
          <LocationSearchInput
            label="Your area"
            placeholder="Koi bhi Lahore area — e.g. Dubai Town"
            value={area}
            onChange={setArea}
          />
          <p className="mt-2 text-xs text-vital-muted">
            Pehle area choose karein — live AQI turant dikhegi.
          </p>
        </div>

        {session?.backendToken && (
          <SymptomCheckinCard
            today={todaySymptoms}
            loading={symptomLoading}
            saving={symptomSaving}
            error={symptomError}
            shouldPrompt={
              aqiReady &&
              !todaySymptoms &&
              ((heroAqi ?? 0) >= 120 ||
                isSmogSeason(activeSeason.id) ||
                activeHeatwave ||
                profile.conditions.length > 0)
            }
            onSave={saveSymptomCheckin}
          />
        )}

        <div
          className={`vital-card mb-6 border p-5 ${
            dailyRisk.tone === "high"
              ? "border-vital-danger/40 bg-vital-danger/10"
              : dailyRisk.tone === "moderate"
                ? "border-amber-400/40 bg-amber-400/10"
                : "border-vital-primary/30 bg-vital-primary/5"
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vital-bg/70 text-vital-primary">
              {dailyRisk.tone === "high" ? (
                <ShieldAlert className="h-5 w-5" aria-hidden />
              ) : (
                <Activity className="h-5 w-5" aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-vital-muted">
                    Daily Health Risk
                  </p>
                  <h2 className="text-lg font-semibold text-vital-text">
                    {dailyRisk.label}
                  </h2>
                </div>
                <p className="text-2xl font-bold text-vital-primary">
                  {dailyRisk.score}
                  <span className="text-sm font-normal text-vital-muted">/100</span>
                </p>
              </div>
              <p className="mt-2 text-sm text-vital-muted">{dailyRisk.advice}</p>
              <p className="mt-2 text-xs text-vital-muted">
                Based on AQI, age/profile, conditions, commute, outdoor time, and today&apos;s symptoms.
              </p>
            </div>
          </div>
        </div>

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
                  onChange={setArea}
                  disabled={routeStatus === "loading"}
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

        {session?.backendToken && (
          <div className="mt-8 vital-card flex flex-col items-center gap-3 border-vital-primary/30 bg-vital-primary/5 p-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-vital-primary/15 text-vital-primary">
              <MessageCircle className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-base font-semibold text-vital-text">
                Health AI Chat
              </p>
              <p className="mt-1 text-sm text-vital-muted">
                Apni health profile aur uploaded documents ke mutabiq koi bhi
                sawal poochein.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary inline-flex items-center gap-2"
              onClick={() => setChatOpen(true)}
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              Open Health AI Chat
            </button>
          </div>
        )}
      </div>

      <PatientRagChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        area={area}
        aqi={heroAqi}
      />
    </main>
  );
}
