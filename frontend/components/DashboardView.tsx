"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import AQICard from "@/components/AQICard";
import HealthAlertCard from "@/components/HealthAlertCard";
import NutritionCard from "@/components/NutritionCard";
import RouteCard from "@/components/RouteCard";
import ExposureScoreCard from "@/components/ExposureScoreCard";
import HealthExplainabilityPanel from "@/components/HealthExplainabilityPanel";
import SeasonIntelligenceCard from "@/components/SeasonIntelligenceCard";
import AgentStreamPanel from "@/components/dashboard/AgentStreamPanel";
import { formatAqiUpdated, aqiLabel } from "@/lib/aqi";
import { useAreaAqi } from "@/hooks/useAreaAqi";
import { useLahoreWeather } from "@/hooks/useLahoreWeather";
import { analyzeRouteStream } from "@/lib/api";
import { startAnalyzeJob } from "@/lib/sse";
import LocationSearchInput from "@/components/map/LocationSearchInput";
import { APP_CITY } from "@/lib/constants";
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
  if (heatwave || (tempC != null && isHeatwave(tempC))) {
    return aqi >= 100 ? "critical" : "warning";
  }
  if (isSmogSeason(seasonId) && aqi >= 100) return "warning";
  if (seasonId === "summer_heatwave" && tempC != null && tempC >= 38 && aqi >= 100) {
    return "warning";
  }
  if (aqi >= 150) return "warning";
  return "info";
}

function healthTitleFromContext(
  aqi: number,
  profile: HealthProfile,
  pesScore?: number | null
): string {
  const conditions = profile.conditions.map((c) => c.toLowerCase());
  const hasAsthma = conditions.some((c) => c.includes("asthma"));
  const hasHeart = conditions.some((c) => c.includes("heart"));
  const highSensitivity = profile.sensitivity === "high";

  if (aqi >= 200) return "Hazardous air — stay indoors";
  if (pesScore != null && pesScore >= 80) {
    if (hasAsthma) return "Critical exposure — asthma precautions";
    if (hasHeart) return "Critical exposure — heart precautions";
    return "Very high personal exposure";
  }
  if (aqi >= 150) {
    if (hasAsthma) return "Unhealthy air — asthma alert";
    if (hasHeart) return "Unhealthy air — heart alert";
    return "Limit outdoor exertion";
  }
  if (aqi >= 100) {
    if (hasAsthma || hasHeart || highSensitivity) {
      return "Elevated risk for your profile";
    }
    return "Moderate air — take care";
  }
  return "Air quality acceptable";
}

export default function DashboardView() {
  const { data: session } = useSession();
  const [, startTransition] = useTransition();

  const healthProfile = useVitalAirStore((s) => s.healthProfile);
  const profileComplete = useVitalAirStore((s) => s.profileComplete);
  const userId = useVitalAirStore((s) => s.userId);
  const results = useVitalAirStore((s) => s.results);
  const query = useVitalAirStore((s) => s.query);
  const streamStatus = useVitalAirStore((s) => s.streamStatus);
  const resetStream = useVitalAirStore((s) => s.resetStream);
  const setQuery = useVitalAirStore((s) => s.setQuery);
  const setTaskId = useVitalAirStore((s) => s.setTaskId);
  const setResultsFromAnalyze = useVitalAirStore((s) => s.setResultsFromAnalyze);
  const setUserId = useVitalAirStore((s) => s.setUserId);

  const profile: HealthProfile = healthProfile ?? defaultProfile;
  const profileLoading = profileComplete === null && !!session?.user;

  const { weather } = useLahoreWeather();
  const liveSeason = useMemo(() => getLahoreSeason(), []);

  const [source, setSource] = useState("Gulberg");
  const [destination, setDestination] = useState("DHA Phase 5");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const { reading: sourceAreaReading, loading: sourceAqiLoading } =
    useAreaAqi(source);

  const isStreaming = streamStatus === "streaming";

  useEffect(() => {
    if (session?.user?.id) setUserId(session.user.id);
  }, [session?.user?.id, setUserId]);

  useEffect(() => {
    if (query.source) setSource(query.source);
    if (query.destination) setDestination(query.destination);
  }, [query.source, query.destination]);

  const hasResults = results.aqi > 0 || results.healthAdvice.length > 0;

  const heroAqi = useMemo(() => {
    if (hasResults) return results.aqi;
    if (sourceAreaReading) return sourceAreaReading.aqi;
    return null;
  }, [hasResults, results.aqi, sourceAreaReading]);

  const heroLabel = useMemo(() => {
    if (hasResults && results.aqiLabel) return results.aqiLabel;
    if (hasResults) return aqiLabel(results.aqi);
    if (sourceAreaReading) return sourceAreaReading.label;
    return "—";
  }, [hasResults, results.aqi, results.aqiLabel, sourceAreaReading]);

  const heroSubtitle = useMemo(() => {
    if (hasResults && source.trim()) {
      return `Route analysis · ${source} → ${destination}`;
    }
    if (sourceAreaReading) {
      return `WAQI · ${sourceAreaReading.station ?? sourceAreaReading.area}`;
    }
    return "Enter a route and tap Analyze";
  }, [hasResults, source, destination, sourceAreaReading]);

  const heroTitle = useMemo(() => {
    if (sourceAreaReading && !hasResults) {
      return `${sourceAreaReading.area}, Lahore`;
    }
    if (hasResults && source.trim()) {
      return `${source} → ${destination}`;
    }
    return APP_CITY;
  }, [sourceAreaReading, hasResults, source, destination]);

  const activeSeason = useMemo(() => {
    if (results.season) {
      const id = results.season as LahoreSeasonId;
      return {
        id,
        labelEn: results.seasonLabel ?? liveSeason.labelEn,
      };
    }
    return liveSeason;
  }, [results.season, results.seasonLabel, liveSeason]);

  const activeTempC = results.temperatureC ?? weather?.temperature_c;
  const activeHeatwave =
    results.heatwave ?? (activeTempC != null && isHeatwave(activeTempC));

  const contextBar = useMemo(() => {
    if (!hasResults || heroAqi == null) return null;
    if (results.contextSummary) return results.contextSummary;

    const parts = [
      `AQI ${heroAqi}`,
      heroLabel,
      activeTempC != null ? `${Math.round(activeTempC)}°C` : null,
      activeSeason.labelEn,
      `${source} → ${destination}`,
    ].filter(Boolean);
    return parts.join(" · ");
  }, [
    hasResults,
    heroAqi,
    results.contextSummary,
    heroLabel,
    activeTempC,
    activeSeason.labelEn,
    source,
    destination,
  ]);

  const healthSeverity = severityFromContext(
    heroAqi ?? 0,
    activeSeason.id,
    activeTempC,
    activeHeatwave
  );

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source.trim() || !destination.trim() || isSubmitting) return;

    setAnalyzeError(null);
    setIsSubmitting(true);
    resetStream();

    const trimmedSource = source.trim();
    const trimmedDest = destination.trim();
    startTransition(() => {
      setQuery({ source: trimmedSource, destination: trimmedDest });
    });

    const payload = {
      profile: {
        name: profile.name || "User",
        age: profile.age,
        conditions: profile.conditions,
        city: APP_CITY,
        sensitivity: profile.sensitivity,
        commuteMode: profile.commuteMode,
        outdoorTime: profile.outdoorTime,
      },
      query: {
        source: trimmedSource,
        destination: trimmedDest,
      },
      user_id: userId ?? undefined,
    };

    const token = session?.backendToken;

    try {
      const { task_id } = await startAnalyzeJob(payload, token);
      setTaskId(task_id);
    } catch {
      try {
        const data = await analyzeRouteStream(payload);
        setResultsFromAnalyze(data);
      } catch (err) {
        setAnalyzeError(
          err instanceof Error ? err.message : "Analysis failed. Try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const showAnalyzeSpinner = isSubmitting || isStreaming;

  return (
    <main className="min-h-screen pb-16">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 pt-24 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="section-title">Dashboard</h1>
          <p className="section-subtitle">
            {healthProfile ? (
              <>
                Welcome,{" "}
                <span className="text-vital-primary">{profile.name}</span> ·{" "}
                {APP_CITY} air intelligence ·{" "}
                <Link
                  href="/profile"
                  className="text-vital-primary underline-offset-2 hover:underline"
                >
                  Optimize health profile
                </Link>
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
                for personalized route advice.
              </>
            )}
          </p>
        </header>

        <form
          onSubmit={handleAnalyze}
          className="vital-card mb-6 grid gap-4 p-5 sm:grid-cols-[1fr_auto_1fr_auto]"
        >
          <LocationSearchInput
            label="From"
            placeholder="Search start area — e.g. Gulberg"
            value={source}
            onChange={setSource}
          />
          <div className="hidden items-end justify-center pb-2 sm:flex">
            <ArrowRight className="h-5 w-5 text-vital-muted" aria-hidden />
          </div>
          <LocationSearchInput
            label="To"
            placeholder="Search destination — e.g. DHA Phase 5"
            value={destination}
            onChange={setDestination}
          />
          <div className="flex items-end">
            <button
              type="submit"
              className="btn-primary w-full whitespace-nowrap sm:w-auto"
              disabled={
                isSubmitting || !source.trim() || !destination.trim()
              }
            >
              {showAnalyzeSpinner ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {isSubmitting ? "Starting…" : "Analyzing…"}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" aria-hidden />
                  Analyze route
                </>
              )}
            </button>
          </div>
        </form>

        {analyzeError && (
          <p className="mb-6 text-sm text-vital-danger" role="alert">
            {analyzeError}
          </p>
        )}

        {contextBar && (
          <p
            className="mb-6 rounded-lg border border-vital-border/60 bg-vital-surface/50 px-4 py-3 text-sm text-vital-text"
            role="status"
          >
            {contextBar}
          </p>
        )}

        {hasResults && results.seasonIntelligence && (
          <div className="mb-6">
            <SeasonIntelligenceCard data={results.seasonIntelligence} />
          </div>
        )}

        {hasResults && results.personalExposureScore && (
          <div className="mb-6">
            <ExposureScoreCard pes={results.personalExposureScore} />
          </div>
        )}

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          {heroAqi != null ? (
            <AQICard
              city={heroTitle}
              aqi={heroAqi}
              label={heroLabel}
              pm25Index={
                sourceAreaReading?.pm25_index ?? sourceAreaReading?.pm25
              }
              station={sourceAreaReading?.station}
              isStale={sourceAreaReading?.is_stale}
              updatedAt={
                sourceAreaReading?.updated_at
                  ? formatAqiUpdated(
                      sourceAreaReading.updated_at,
                      sourceAreaReading.station_reported_at
                    )
                  : "Just now"
              }
              subtitle={heroSubtitle}
            />
          ) : (
            <article className="vital-card flex min-h-[200px] items-center justify-center p-5 text-sm text-vital-muted">
              {sourceAqiLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-vital-primary" />
              ) : (
                "Type a source area to preview local AQI"
              )}
            </article>
          )}

          <HealthAlertCard
            title={
              hasResults
                ? healthTitleFromContext(
                    results.aqi,
                    profile,
                    results.personalExposureScore?.score
                  )
                : heroAqi != null
                  ? healthTitleFromContext(heroAqi, profile)
                  : "Health advisory"
            }
            message={
              results.healthAdvice ||
              (heroAqi != null
                ? `Current AQI is ${heroAqi}. Analyze your route for personalized WHO-based guidance.`
                : "")
            }
            severity={heroAqi != null || hasResults ? healthSeverity : "info"}
            sourceHint={
              hasResults
                ? "Powered by WHO health knowledge base (RAG) + your health profile."
                : undefined
            }
          />

          <NutritionCard items={results.dietPlan} />
        </div>

        {hasResults && results.healthExplainability && (
          <div className="mb-6">
            <HealthExplainabilityPanel data={results.healthExplainability} />
          </div>
        )}

        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <RouteCard
            from={hasResults ? source : undefined}
            to={hasResults ? destination : undefined}
            routeOptions={results.safeRoute?.routeOptions}
          />
          <AgentStreamPanel />
        </div>

      </div>
    </main>
  );
}
