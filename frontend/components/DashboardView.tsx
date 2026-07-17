"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, ChevronDown, ChevronUp, MessageCircle, ShieldAlert, X } from "lucide-react";
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
import AgentResultsSection from "@/components/dashboard/AgentResultsSection";
import PatientRagChatPanel from "@/components/dashboard/PatientRagChatPanel";
import SymptomCheckinCard from "@/components/dashboard/SymptomCheckinCard";
import LocationSearchInput from "@/components/map/LocationSearchInput";
import { formatAqiUpdated, aqiLabel } from "@/lib/aqi";
import {
  fetchTodaySymptoms,
  saveTodaySymptoms,
  type SymptomCheckinPayload,
  type SymptomCheckinResult,
} from "@/lib/api";

import { APP_CITY } from "@/lib/constants";
import { cleanAreaName, formatAreaTitle } from "@/lib/formatLocation";
import { useAreaAqi } from "@/hooks/useAreaAqi";
import { useLahoreWeather } from "@/hooks/useLahoreWeather";
import { usePersistedState } from "@/hooks/usePersistedState";
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

  const [inputArea, setInputArea] = useState(readStoredDashboardArea);
  const [area, setAreaInternal] = useState(readStoredDashboardArea);

  const handleSearch = () => {
    setAreaInternal(inputArea);
    try {
      if (inputArea.trim()) {
        sessionStorage.setItem(DASHBOARD_AREA_KEY, inputArea);
      }
    } catch {
      /* ignore storage errors */
    }
  };
  const [todaySymptoms, setTodaySymptoms] = usePersistedState<SymptomCheckinResult | null>("vitalair-dash-today-symptoms", null);
  const [symptomLoading, setSymptomLoading] = useState(false);
  const [symptomSaving, setSymptomSaving] = useState(false);
  const [symptomError, setSymptomError] = useState<string | null>(null);

  const { reading: areaReading, loading: areaAqiLoading } = useAreaAqi(area);

  const heroAqi = areaReading?.aqi ?? null;
  const heroLabel = areaReading?.label ?? (heroAqi != null ? aqiLabel(heroAqi) : "—");
  const aqiReady = heroAqi != null && !areaAqiLoading;

  const activeSeason = liveSeason;

  const activeTempC = weather?.temperature_c;
  const activeHeatwave = activeTempC != null && isHeatwave(activeTempC);

  const healthSeverity = severityFromContext(
    heroAqi ?? 0,
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
  }, [session?.backendToken, setTodaySymptoms]);



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
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <LocationSearchInput
                label="Your area"
                placeholder="Koi bhi Lahore area — e.g. Dubai Town"
                value={inputArea}
                onChange={setInputArea}
              />
            </div>
            <button
              onClick={handleSearch}
              className="flex h-11 items-center justify-center rounded-lg bg-vital-primary px-6 font-semibold text-white shadow-sm hover:bg-vital-primary/90 focus:outline-none focus:ring-2 focus:ring-vital-primary focus:ring-offset-2 focus:ring-offset-vital-bg"
            >
              Search
            </button>
          </div>
          <p className="mt-2 text-xs text-vital-muted">
            Pehle area choose karein aur Search press karein — live AQI fetch hogi.
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
          <AgentResultsSection
            area={area}
            heroAqi={heroAqi}
            heroLabel={heroLabel}
            areaReading={areaReading}
            aqiReady={aqiReady}
            profile={profile}
            userId={userId}
            session={session}
            activeSeason={activeSeason}
            activeHeatwave={activeHeatwave}
            aqiStepStatus={aqiStepStatus}
          />
        </motion.div>

      </div>
    </main>
  );
}
