"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, FileText, RefreshCw, Users, Wind } from "lucide-react";
import { fetchAdminStats, type AdminStats } from "@/lib/adminApi";

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="vital-card flex items-start gap-4 p-5 transition-all hover:border-vital-primary/40">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-vital-primary/15 text-vital-primary">
        {icon}
      </span>
      <div>
        <p className="text-2xl font-semibold text-vital-text">{value}</p>
        <p className="mt-1 text-sm text-vital-muted">{label}</p>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadStats = useCallback((silent = false) => {
    if (!silent) setRefreshing(true);
    setError(null);
    fetchAdminStats()
      .then((data) => {
        setStats(data);
        setLastUpdated(new Date());
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load stats")
      )
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    loadStats();
    // Auto-poll stats every 4 seconds for 100% real-time data
    const timer = setInterval(() => loadStats(true), 4000);
    return () => clearInterval(timer);
  }, [loadStats]);

  if (loading) {
    return <p className="text-sm text-vital-muted">Loading live stats…</p>;
  }

  if (error && !stats) {
    return (
      <p className="text-sm text-vital-danger" role="alert">
        {error}
      </p>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-vital-muted">
          Last live sync: {lastUpdated ? lastUpdated.toLocaleTimeString() : "Just now"}
        </p>
        <button
          onClick={() => loadStats()}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-lg border border-vital-border bg-vital-card px-3 py-1.5 text-xs font-semibold text-vital-text transition-colors hover:border-vital-primary/40 hover:text-vital-primary disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-vital-primary" : ""}`} />
          <span>Refresh Live</span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total users" value={stats.users_total} icon={<Users className="h-5 w-5" />} />
        <StatCard
          label="Analyses (all time)"
          value={stats.queries_total}
          icon={<Wind className="h-5 w-5" />}
        />
        <StatCard
          label="Analyses today"
          value={stats.queries_today}
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="Uploaded documents"
          value={stats.documents_total}
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          label="Symptom check-ins today"
          value={stats.symptom_checkins_today}
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="Admin accounts"
          value={stats.admin_users}
          icon={<Users className="h-5 w-5" />}
        />
      </div>
    </div>
  );
}
