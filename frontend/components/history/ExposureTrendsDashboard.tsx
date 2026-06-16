"use client";

import { useEffect, useState } from "react";
import { BarChart3, Loader2, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchExposureTrends,
  type ExposureTrendsResponse,
} from "@/lib/exposureTrendsApi";

const PRIMARY = "#00C896";
const MUTED = "#8b9cb3";
const CHART_COLORS = ["#00C896", "#f0c040", "#ff8c42", "#ff4545", "#a855f7", "#64748b"];

interface Props {
  userId?: string;
  token?: string;
}

export default function ExposureTrendsDashboard({ userId, token }: Props) {
  const [data, setData] = useState<ExposureTrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId && !token) {
      setLoading(false);
      return;
    }
    void fetchExposureTrends(userId, token, 30)
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load trends")
      )
      .finally(() => setLoading(false));
  }, [userId, token]);

  if (loading) {
    return (
      <div className="vital-card flex items-center justify-center gap-2 p-10 text-vital-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading 30-day exposure trends…
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-vital-danger" role="alert">
        {error}
      </p>
    );
  }

  if (!data) return null;

  const { summary, daily_pes, aqi_categories, route_choices } = data;
  const pesLineData = daily_pes.filter((d) => d.pes != null);
  const compliancePct =
    summary.mask_recommended_days > 0
      ? Math.round(
          (100 * summary.mask_compliance_days) / summary.mask_recommended_days
        )
      : 0;

  return (
    <div className="space-y-6">
      <article className="vital-card border border-vital-primary/30 bg-vital-primary/5 p-5">
        <header className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-vital-primary" aria-hidden />
          <h2 className="font-semibold">Your 30-day exposure summary</h2>
        </header>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-vital-muted">Average daily PES</dt>
            <dd className="text-2xl font-bold text-vital-primary">
              {summary.average_pes}
              <span className="text-base font-normal text-vital-muted"> /100</span>
            </dd>
          </div>
          <div>
            <dt className="text-vital-muted">Hazardous days</dt>
            <dd className="text-xl font-semibold text-vital-danger">
              {summary.hazardous_days}
            </dd>
          </div>
          <div>
            <dt className="text-vital-muted">Safe days</dt>
            <dd className="text-xl font-semibold text-emerald-400">
              {summary.safe_days}
            </dd>
          </div>
          <div>
            <dt className="text-vital-muted">Safest route chosen</dt>
            <dd className="text-xl font-semibold text-vital-text">
              {summary.safest_route_pct}%
            </dd>
          </div>
        </dl>
        <p className="mt-4 rounded-lg bg-vital-bg/60 px-3 py-2 text-sm text-vital-text">
          <span className="font-medium text-vital-primary">Tip: </span>
          {summary.tip}
        </p>
        {summary.total_analyses === 0 && (
          <p className="mt-2 text-xs text-vital-muted">
            Run analyses on the dashboard to populate your exposure history.
          </p>
        )}
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Daily PES score" subtitle="30-day line graph">
          {pesLineData.length === 0 ? (
            <EmptyChart message="No PES data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={daily_pes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2a38" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: MUTED, fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis domain={[0, 100]} tick={{ fill: MUTED, fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#121820",
                    border: "1px solid #1e2a38",
                    borderRadius: 8,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="pes"
                  stroke={PRIMARY}
                  strokeWidth={2}
                  dot={{ fill: PRIMARY, r: 3 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Days in each AQI category" subtitle="Stacked bar">
          {aqi_categories.length === 0 ? (
            <EmptyChart message="No AQI category data" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={aqi_categories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2a38" />
                <XAxis type="number" tick={{ fill: MUTED, fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={120}
                  tick={{ fill: MUTED, fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#121820",
                    border: "1px solid #1e2a38",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="days" fill={PRIMARY} radius={[0, 4, 4, 0]}>
                  {aqi_categories.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Route choice history" subtitle="Safest vs other paths">
          {summary.total_analyses === 0 ? (
            <EmptyChart message="No route decisions logged" />
          ) : (
            <div className="flex flex-col items-center sm:flex-row">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={route_choices}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {route_choices.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? PRIMARY : "#334155"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <ul className="space-y-1 text-sm text-vital-muted">
                {route_choices.map((r) => (
                  <li key={r.name}>
                    <span className="font-medium text-vital-text">{r.value}%</span>{" "}
                    {r.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Health advisory compliance"
          subtitle="Mask worn vs recommended (proxy via route adherence)"
        >
          <div className="flex flex-col justify-center gap-4 py-4">
            <div className="flex items-end justify-between text-sm">
              <span className="text-vital-muted">Days followed guidance</span>
              <span className="font-semibold text-vital-text">
                {summary.mask_compliance_days}/{summary.mask_recommended_days} days
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-vital-bg">
              <div
                className="h-full rounded-full bg-vital-primary transition-all"
                style={{ width: `${compliancePct}%` }}
              />
            </div>
            <p className="text-xs text-vital-muted">
              {compliancePct}% compliance on high-exposure days (PES ≥ 60 or AQI ≥ 150).
              Based on choosing lowest-AQI route suggestions.
            </p>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <article className="vital-card p-4">
      <header className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-vital-primary" aria-hidden />
        <div>
          <h3 className="text-sm font-semibold text-vital-text">{title}</h3>
          <p className="text-xs text-vital-muted">{subtitle}</p>
        </div>
      </header>
      {children}
    </article>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-vital-muted">
      {message}
    </div>
  );
}
