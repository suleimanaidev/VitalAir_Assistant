"use client";

import { CloudSun } from "lucide-react";
import {
  getSeasonProfile,
  normalizeSeasonId,
} from "@/lib/lahoreSeasonalIntelligence";
import type { LahoreSeasonId } from "@/lib/lahoreSeason";

const SEASON_COLORS: Record<LahoreSeasonId, string> = {
  winter_smog: "border-slate-400/40 bg-slate-500/5",
  spring_dust: "border-amber-500/40 bg-amber-500/5",
  summer_heatwave: "border-orange-500/40 bg-orange-500/5",
  monsoon: "border-sky-500/40 bg-sky-500/5",
};

export interface SeasonIntelligenceData {
  id: LahoreSeasonId | string;
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

export default function SeasonIntelligenceCard({
  data,
}: {
  data: SeasonIntelligenceData;
}) {
  const seasonId = normalizeSeasonId(data.id);
  const profile = getSeasonProfile(seasonId);
  const border = SEASON_COLORS[seasonId] ?? "border-vital-border/40";

  return (
    <article className={`vital-card border p-5 ${border}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CloudSun className="h-5 w-5 text-vital-primary" aria-hidden />
          <div>
            <h2 className="font-semibold">Lahore Seasonal Intelligence</h2>
            <p className="text-xs text-vital-muted">
              Pakistan-specific — built for Lahore, not a global model
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-vital-text">{data.name}</p>
          <p className="text-xs text-vital-muted">{data.months}</p>
        </div>
      </header>

      <p className="mt-3 rounded-lg bg-vital-bg/50 px-3 py-2 text-sm text-vital-text">
        <span className="font-medium text-vital-primary">Primary hazard: </span>
        {data.primary_hazard}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {data.pollutants.map((p) => (
          <span
            key={p}
            className="rounded-md border border-vital-border/50 bg-vital-bg/40 px-2 py-0.5 text-xs text-vital-muted"
          >
            {p}
          </span>
        ))}
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-1">
        <div className="rounded-lg border border-vital-border/30 px-3 py-2">
          <dt className="text-xs font-medium text-vital-primary">Health agent</dt>
          <dd className="mt-0.5 text-vital-text">{data.health_agent_focus}</dd>
        </div>
        <div className="rounded-lg border border-vital-border/30 px-3 py-2">
          <dt className="text-xs font-medium text-vital-primary">Nutrition agent</dt>
          <dd className="mt-0.5 text-vital-text">{data.nutrition_agent_focus}</dd>
        </div>
        <div className="rounded-lg border border-vital-border/30 px-3 py-2">
          <dt className="text-xs font-medium text-vital-primary">Route agent</dt>
          <dd className="mt-0.5 text-vital-text">{data.route_agent_focus}</dd>
        </div>
      </dl>

      <p className="mt-3 rounded-lg border border-vital-primary/20 bg-vital-primary/5 px-3 py-2 text-xs text-vital-text">
        <span className="font-medium text-vital-primary">Right now: </span>
        {data.preferred_travel_window}
      </p>

      <p className="mt-2 text-xs text-vital-muted">
        {profile.avoidAreas.length > 0 && (
          <>Avoid: {data.avoid_areas.join(", ")}</>
        )}
      </p>
    </article>
  );
}
