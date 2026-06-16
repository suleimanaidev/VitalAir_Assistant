"use client";

import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import type { AreaAqiPayload } from "@/lib/aqi";
import { aqiColor } from "@/lib/aqiColors";

interface TopWorstAreasProps {
  areas: AreaAqiPayload[];
  loading?: boolean;
  limit?: number;
}

export default function TopWorstAreas({
  areas,
  loading,
  limit = 5,
}: TopWorstAreasProps) {
  const sorted = [...areas].sort((a, b) => b.aqi - a.aqi).slice(0, limit);

  return (
    <section className="vital-card p-5">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-vital-text">Highest AQI areas</h2>
          <p className="mt-0.5 text-xs text-vital-muted">
            Top {limit} worst zones in Lahore right now
          </p>
        </div>
        <Link
          href="/route"
          className="inline-flex items-center gap-1 text-xs font-medium text-vital-primary hover:underline"
        >
          Full map
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {loading ? (
        <div className="mt-6 flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-vital-primary" />
        </div>
      ) : sorted.length === 0 ? (
        <p className="mt-6 text-sm text-vital-muted">Loading area data…</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {sorted.map((area, rank) => (
            <li
              key={area.area_id}
              className="flex items-center gap-3 rounded-lg border border-vital-border/60 bg-vital-bg/50 px-3 py-2.5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-vital-card text-xs font-bold text-vital-muted">
                {rank + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-vital-text">
                  {area.area}
                </p>
                <p className="text-xs text-vital-muted">{area.label}</p>
              </div>
              <span
                className="rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums"
                style={{
                  color: aqiColor(area.aqi),
                  backgroundColor: `${aqiColor(area.aqi)}22`,
                }}
              >
                {area.aqi}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
