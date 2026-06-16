"use client";

import { RefreshCw } from "lucide-react";
import { aqiShortLabel, formatAqiUpdated } from "@/lib/aqi";
import type { AreaAqiPayload } from "@/lib/aqi";
import { aqiColor } from "@/lib/aqiColors";
import { LAHORE_AREAS, type LahoreArea } from "@/lib/lahoreAreas";

interface Props {
  areas: AreaAqiPayload[];
  activeId?: string | null;
  loading?: boolean;
  refreshing?: boolean;
  lastFetched?: string | null;
  onSelect?: (area: LahoreArea) => void;
  onRefresh?: () => void;
}

export default function LahoreAreasStrip({
  areas,
  activeId,
  loading,
  refreshing,
  lastFetched,
  onSelect,
  onRefresh,
}: Props) {
  const byId = new Map(areas.map((a) => [a.area_id, a]));

  const rows = [...LAHORE_AREAS]
    .map((zone) => ({
      zone,
      reading: byId.get(zone.id),
      aqi: byId.get(zone.id)?.aqi ?? 0,
    }))
    .sort((a, b) => b.aqi - a.aqi);

  return (
    <section className="vital-card mt-4 p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-vital-text">
            Lahore — {LAHORE_AREAS.length} areas live AQI
          </h2>
          <p className="text-xs text-vital-muted">
            {lastFetched
              ? `${formatAqiUpdated(lastFetched)} · auto-refresh 60s`
              : "Loading WAQI…"}
            {" · "}nearest live WAQI station per area
          </p>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-vital-border px-3 py-1.5 text-xs font-medium text-vital-primary hover:bg-vital-primary/10 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        )}
      </header>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-9">
        {rows.map(({ zone, reading, aqi }) => {
          const color = aqi > 0 ? aqiColor(aqi) : "#64748b";
          const isActive = activeId === zone.id;
          const Tag = onSelect ? "button" : "div";

          return (
            <li key={zone.id}>
              <Tag
                type={onSelect ? "button" : undefined}
                onClick={onSelect ? () => onSelect(zone) : undefined}
                className={`flex w-full flex-col items-center rounded-lg border px-1.5 py-2 text-center transition-colors ${
                  isActive
                    ? "border-vital-primary bg-vital-primary/10"
                    : "border-vital-border bg-vital-bg/50 hover:border-vital-primary/40"
                }`}
                style={
                  !isActive && aqi > 0
                    ? { borderColor: `${color}55`, backgroundColor: `${color}0c` }
                    : undefined
                }
              >
                <span
                  className="text-lg font-bold tabular-nums"
                  style={{ color: aqi > 0 ? color : undefined }}
                >
                  {loading && !reading ? "…" : aqi > 0 ? aqi : "—"}
                </span>
                <span className="mt-0.5 line-clamp-2 text-[10px] font-medium leading-tight text-vital-text">
                  {zone.name}
                </span>
                <span className="mt-0.5 text-[9px] text-vital-muted">
                  {reading
                    ? aqi > 0
                      ? aqiShortLabel(aqi)
                      : "—"
                    : loading
                      ? "…"
                      : "—"}
                </span>
              </Tag>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
