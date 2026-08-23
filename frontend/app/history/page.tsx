"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  MapPin,
  Settings,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import ProfileSetupGuard from "@/components/auth/ProfileSetupGuard";
import AppSidebarLayout from "@/components/AppSidebarLayout";
import ExposureTrendsDashboard from "@/components/history/ExposureTrendsDashboard";
import { APP_CITY } from "@/lib/constants";
import { useVitalAirStore } from "@/store/useVitalAirStore";
import {
  fetchHistory,
  deleteHistoryRecord,
  clearAllHistory,
  type HistoryItem,
} from "@/lib/historyApi";

function formatHistoryDate(value?: string): string {
  if (!value) return "Date not available";
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "Date not available";
  }
}

function pesLabel(score?: number): string {
  if (score == null) return "Not calculated";
  if (score >= 75) return "High exposure";
  if (score >= 45) return "Moderate exposure";
  return "Lower exposure";
}

function aqiLabel(aqi?: number): string {
  if (aqi == null) return "AQI not available";
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Sensitive";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very unhealthy";
  return "Hazardous";
}

function buildWeeklySummary(items: HistoryItem[]) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = items.filter((item) => {
    if (!item.timestamp) return false;
    const t = new Date(item.timestamp).getTime();
    return Number.isFinite(t) && t >= weekAgo;
  });
  const aqiValues = recent
    .map((item) => item.aqi_at_time)
    .filter((v): v is number => typeof v === "number");
  const pesValues = recent
    .map((item) => item.pes_score)
    .filter((v): v is number => typeof v === "number");
  const avg = (values: number[]) =>
    values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : 0;
  const worst = aqiValues.length ? Math.max(...aqiValues) : 0;
  const highRisk = recent.filter(
    (item) => (item.aqi_at_time ?? 0) >= 150 || (item.pes_score ?? 0) >= 70
  ).length;

  return {
    checks: recent.length,
    avgAqi: avg(aqiValues),
    avgPes: avg(pesValues),
    worstAqi: worst,
    highRisk,
    recommendation:
      highRisk > 0
        ? "Is week high-risk checks aaye. Mask aur cleaner route ko priority dein."
        : recent.length > 0
          ? "Is week exposure manageable tha. Regular checks continue rakhein."
          : "Dashboard par checks run karein taake weekly summary ban sake.",
  };
}

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const userId = useVitalAirStore((s) => s.userId);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const effectiveUserId = userId || session?.user?.id;
  const weeklySummary = buildWeeklySummary(items);

  const loadData = () => {
    if (status === "unauthenticated") {
      setLoading(false);
      return;
    }
    if (status === "loading") return;

    setLoading(true);
    fetchHistory(effectiveUserId || undefined, session?.backendToken)
      .then((data) => setItems(data))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load history")
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [effectiveUserId, session?.backendToken, status]);

  const handleDeleteItem = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteHistoryRecord(id, session?.backendToken);
      setItems((prev) => prev.filter((it) => it.id !== id));
      setActionMsg("Record deleted.");
      setTimeout(() => setActionMsg(null), 3000);
    } catch (err) {
      setActionMsg(
        err instanceof Error ? err.message : "Could not delete record."
      );
      setTimeout(() => setActionMsg(null), 3000);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all your health history records?")) {
      return;
    }
    setClearing(true);
    try {
      await clearAllHistory(effectiveUserId || undefined, session?.backendToken);
      setItems([]);
      setActionMsg("All health history cleared.");
      setTimeout(() => setActionMsg(null), 3000);
    } catch (err) {
      setActionMsg(
        err instanceof Error ? err.message : "Could not clear history."
      );
      setTimeout(() => setActionMsg(null), 3000);
    } finally {
      setClearing(false);
    }
  };

  return (
    <ProfileSetupGuard>
      <AppSidebarLayout>
        <main className="pb-12">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="section-title">My health history</h1>
                <p className="section-subtitle">
                  {APP_CITY}, Pakistan — your saved AQI checks, route exposure, and health guidance
                </p>
              </div>
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 rounded-xl border border-vital-border bg-vital-bg/60 px-3.5 py-2 text-xs font-medium text-vital-muted hover:border-vital-primary/40 hover:text-vital-primary transition"
              >
                <Settings className="h-4 w-4" />
                History Settings
              </Link>
            </div>

            {actionMsg && (
              <div className="mt-4 rounded-xl border border-vital-primary/40 bg-vital-primary/10 px-4 py-2.5 text-sm text-vital-primary animate-fade-in">
                {actionMsg}
              </div>
            )}

            {status === "unauthenticated" ? (
              <p className="mt-8 text-vital-muted">
                Please{" "}
                <Link
                  href="/login?callbackUrl=/history"
                  className="text-vital-primary underline"
                >
                  sign in
                </Link>{" "}
                to view your exposure trends.
              </p>
            ) : (
              <div className="mt-8 space-y-10">
                <section className="grid gap-3 md:grid-cols-3">
                  <InfoCard
                    icon={<MapPin className="h-4 w-4" />}
                    title="1. Run analysis"
                    text="Check any Lahore area or commute route on your dashboard."
                  />
                  <InfoCard
                    icon={<Activity className="h-4 w-4" />}
                    title="2. Track exposure"
                    text="Monitor your Personal Exposure Score (PES) and live AQI trends."
                  />
                  <InfoCard
                    icon={<ShieldCheck className="h-4 w-4" />}
                    title="3. Improve habits"
                    text="Review past exposure to plan safer travel and reduce health risks."
                  />
                </section>

                <section className="vital-card border border-vital-primary/25 bg-vital-primary/5 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-vital-muted">
                        Last 7 days
                      </p>
                      <h2 className="text-lg font-semibold text-vital-text">
                        Weekly health summary
                      </h2>
                      <p className="mt-1 text-sm text-vital-muted">
                        {weeklySummary.recommendation}
                      </p>
                    </div>
                    <Link
                      href="/dashboard"
                      className="rounded-xl border border-vital-primary/40 px-3 py-2 text-sm font-medium text-vital-primary hover:bg-vital-primary/10"
                    >
                      Add today&apos;s check
                    </Link>
                  </div>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Metric
                      label="Checks"
                      value={weeklySummary.checks}
                      hint="This week"
                    />
                    <Metric
                      label="Avg AQI"
                      value={weeklySummary.avgAqi || "—"}
                      hint={weeklySummary.avgAqi ? aqiLabel(weeklySummary.avgAqi) : "No data"}
                    />
                    <Metric
                      label="Avg PES"
                      value={weeklySummary.avgPes ? `${weeklySummary.avgPes}/100` : "—"}
                      hint={weeklySummary.avgPes ? pesLabel(weeklySummary.avgPes) : "No data"}
                    />
                    <Metric
                      label="High risk"
                      value={weeklySummary.highRisk}
                      hint="AQI 150+ or PES 70+"
                    />
                  </div>
                </section>

                <ExposureTrendsDashboard
                  userId={effectiveUserId}
                  token={session?.backendToken}
                />

                <section>
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-vital-text">
                        Recent checks
                      </h2>
                      <p className="mt-1 text-sm text-vital-muted">
                        Your saved dashboard and route analysis records.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {items.length > 0 && (
                        <button
                          onClick={handleClearAll}
                          disabled={clearing}
                          className="rounded-xl border border-vital-danger/30 bg-vital-danger/5 px-3 py-2 text-xs font-semibold text-vital-danger hover:bg-vital-danger/15 transition disabled:opacity-50"
                        >
                          {clearing ? "Clearing…" : "Clear all"}
                        </button>
                      )}
                      <Link
                        href="/dashboard"
                        className="rounded-xl bg-vital-primary px-4 py-2 text-sm font-semibold text-[#04130f] transition hover:brightness-110"
                      >
                        Run new check
                      </Link>
                    </div>
                  </div>
                  {loading || status === "loading" ? (
                    <div className="vital-card p-5 text-sm text-vital-muted">
                      Loading your saved checks…
                    </div>
                  ) : error ? (
                    <p className="vital-card p-5 text-sm text-vital-danger" role="alert">
                      {error}
                    </p>
                  ) : items.length === 0 ? (
                    <div className="vital-card border border-vital-primary/30 bg-vital-primary/5 p-6">
                      <h3 className="text-lg font-semibold text-vital-text">
                        No history yet
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm text-vital-muted">
                        Pehle dashboard par health/route analysis run karein ya area search karein. Us ke baad
                        yahan AQI, PES score, route, aur date automatically record honge.
                      </p>
                      <Link
                        href="/dashboard"
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-vital-primary px-4 py-2 text-sm font-semibold text-[#04130f] transition hover:brightness-110"
                      >
                        Go to dashboard
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </div>
                  ) : (
                    <ul className="grid gap-3 md:grid-cols-2">
                      {items.map((item) => (
                        <li key={item.id} className="vital-card p-4 relative group">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-vital-text">
                                {item.source || "Selected area"}
                                {item.destination ? ` → ${item.destination}` : ""}
                              </p>
                              <p className="mt-1 flex items-center gap-1.5 text-xs text-vital-muted">
                                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                                {formatHistoryDate(item.timestamp)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-full border border-vital-border px-2 py-1 text-[10px] uppercase tracking-wide text-vital-muted">
                                {item.status || "complete"}
                              </span>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                disabled={deletingId === item.id}
                                title="Delete record"
                                className="rounded-lg p-1 text-vital-muted hover:bg-vital-danger/15 hover:text-vital-danger transition"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-vital-border bg-vital-bg/50 p-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-vital-muted">AQI</p>
                                <span className="text-[10px] font-semibold text-vital-muted uppercase">
                                  {aqiLabel(item.aqi_at_time)}
                                </span>
                              </div>
                              <p className="mt-1 text-xl font-bold text-vital-primary">
                                {item.aqi_at_time ?? "—"}
                              </p>
                              <p className="text-xs text-vital-muted">Air quality</p>
                            </div>

                            <div
                              className={`rounded-xl border p-3 ${
                                item.pes_score == null
                                  ? "border-vital-border bg-vital-bg/50"
                                  : item.pes_score >= 75
                                    ? "border-vital-danger/40 bg-vital-danger/10"
                                    : item.pes_score >= 45
                                      ? "border-amber-400/40 bg-amber-400/10"
                                      : "border-vital-primary/30 bg-vital-primary/10"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-vital-muted">PES Score</p>
                                <span
                                  className={`text-[10px] font-bold uppercase tracking-wider ${
                                    item.pes_score == null
                                      ? "text-vital-muted"
                                      : item.pes_score >= 75
                                        ? "text-vital-danger"
                                        : item.pes_score >= 45
                                          ? "text-amber-400"
                                          : "text-vital-primary"
                                  }`}
                                >
                                  {item.pes_level || pesLabel(item.pes_score)}
                                </span>
                              </div>
                              <p
                                className={`mt-1 text-xl font-bold ${
                                  item.pes_score == null
                                    ? "text-vital-muted"
                                    : item.pes_score >= 75
                                      ? "text-vital-danger"
                                      : item.pes_score >= 45
                                        ? "text-amber-400"
                                        : "text-vital-primary"
                                }`}
                              >
                                {item.pes_score != null ? `${item.pes_score}/100` : "—"}
                              </p>
                              <p className="text-xs text-vital-muted">
                                {pesLabel(item.pes_score)}
                              </p>
                            </div>
                          </div>

                          {item.health_advice && (
                            <p className="mt-3 line-clamp-2 rounded-lg bg-vital-bg/60 px-3 py-2 text-xs text-vital-muted">
                              {item.health_advice}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </div>
        </main>
      </AppSidebarLayout>
    </ProfileSetupGuard>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="vital-card p-4">
      <div className="flex items-center gap-2 text-vital-primary">
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <p className="mt-2 text-sm text-vital-muted">{text}</p>
    </article>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-vital-border bg-vital-bg/50 p-3">
      <p className="text-xs text-vital-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-vital-primary">{value}</p>
      <p className="text-xs text-vital-muted">{hint}</p>
    </div>
  );
}
