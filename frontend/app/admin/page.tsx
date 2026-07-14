"use client";

import { useEffect, useState } from "react";
import { Activity, FileText, Users, Wind } from "lucide-react";
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
    <div className="vital-card flex items-start gap-4 p-5">
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

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load stats")
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-vital-muted">Loading admin stats…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-vital-danger" role="alert">
        {error}
      </p>
    );
  }

  if (!stats) return null;

  return (
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
  );
}
