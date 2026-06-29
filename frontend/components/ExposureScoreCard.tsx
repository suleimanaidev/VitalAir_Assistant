"use client";

import { Activity } from "lucide-react";

export interface PesBreakdown {
  aqi_component: number;
  distance_component: number;
  commute_component: number;
  health_component: number;
}

export interface PersonalExposureScore {
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

const LEVEL_STYLES: Record<string, string> = {
  low: "border-emerald-500/40 bg-emerald-500/5",
  moderate: "border-amber-500/40 bg-amber-500/5",
  high: "border-orange-500/40 bg-orange-500/5",
  critical: "border-red-500/40 bg-red-500/5",
};

const SCORE_RING: Record<string, string> = {
  low: "text-emerald-400",
  moderate: "text-amber-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

export default function ExposureScoreCard({
  pes,
}: {
  pes: PersonalExposureScore;
}) {
  const ring = SCORE_RING[pes.level] ?? "text-vital-primary";
  const border = LEVEL_STYLES[pes.level] ?? "border-vital-border/40";

  return (
    <article className={`vital-card border p-5 ${border}`}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-vital-primary" aria-hidden />
          <div>
            <h2 className="font-semibold">Personal Exposure Score</h2>
            <p className="text-xs text-vital-muted">
              Multi-factor risk beyond raw AQI
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-vital-muted">
            {pes.emoji} Your exposure risk today
          </p>
          <p className={`text-3xl font-bold tabular-nums ${ring}`}>
            {pes.score}
            <span className="text-lg font-medium text-vital-muted"> / 100</span>
          </p>
          <p className="text-xs font-medium text-vital-text">{pes.level_label}</p>
        </div>
      </header>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-vital-bg/50 px-3 py-2">
          <dt className="text-xs text-vital-muted">AQI</dt>
          <dd className="font-medium text-vital-text">
            {pes.aqi} ({pes.aqi_label})
          </dd>
        </div>
        <div className="rounded-lg bg-vital-bg/50 px-3 py-2">
          <dt className="text-xs text-vital-muted">Route distance</dt>
          <dd className="font-medium text-vital-text">{pes.distance_label}</dd>
        </div>
        <div className="rounded-lg bg-vital-bg/50 px-3 py-2">
          <dt className="text-xs text-vital-muted">Commute</dt>
          <dd className="font-medium text-vital-text">{pes.commute_label}</dd>
        </div>
        <div className="rounded-lg bg-vital-bg/50 px-3 py-2">
          <dt className="text-xs text-vital-muted">Health profile</dt>
          <dd className="font-medium text-vital-text">
            {pes.health_flags.join(" · ")}
          </dd>
        </div>
      </dl>

      <p
        className={`mt-4 rounded-lg border px-3 py-2.5 text-sm text-vital-text ${
          pes.level === "high" || pes.level === "critical"
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-vital-border/40 bg-vital-bg/40"
        }`}
      >
        <span
          className={`font-medium ${
            pes.level === "high" || pes.level === "critical"
              ? "text-amber-400"
              : "text-vital-primary"
          }`}
        >
          {pes.level === "low" || pes.level === "moderate" ? "Tip: " : "Note: "}
        </span>
        {pes.recommendation}
      </p>

      <details className="mt-3 text-xs text-vital-muted">
        <summary className="cursor-pointer hover:text-vital-text">
          Formula breakdown (defense demo)
        </summary>
        <ul className="mt-2 space-y-1 pl-2">
          <li>AQI component (40%): +{pes.breakdown.aqi_component} pts</li>
          <li>Distance component (25%): +{pes.breakdown.distance_component} pts</li>
          <li>Commute component (20%): +{pes.breakdown.commute_component} pts</li>
          <li>Health component (15%): +{pes.breakdown.health_component} pts</li>
        </ul>
      </details>
    </article>
  );
}
