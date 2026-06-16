"use client";

import { RefreshCw } from "lucide-react";
import { aqiShortLabel, formatAqiUpdated } from "@/lib/aqi";
import type { AreaAqiPayload } from "@/lib/aqi";
import { aqiColor } from "@/lib/aqiColors";
import { LAHORE_AREAS } from "@/lib/lahoreAreas";

export interface LahoreAreasGridProps {
  areas: AreaAqiPayload[];
  highlightId?: string;
  loading?: boolean;
  lastFetched?: string | null;
  refreshing?: boolean;
  onRefresh?: () => void;
}

function relativeFetchLabel(iso: string | null | undefined): string {
  if (!iso) return "Fetching live WAQI…";
  try {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "Live · updated just now";
    if (mins === 1) return "Live · updated 1 min ago";
    return `Live · updated ${mins} min ago`;
  } catch {
    return "Live WAQI";
  }
}

export default function LahoreAreasGrid({
  areas,
  highlightId,
  loading,
  lastFetched,
  refreshing,
  onRefresh,
}: LahoreAreasGridProps) {
  const byId = new Map(areas.map((a) => [a.area_id, a]));

  const sortedZones = [...LAHORE_AREAS].sort((a, b) => {
    const aqiA = byId.get(a.id)?.aqi ?? 0;
    const aqiB = byId.get(b.id)?.aqi ?? 0;
    return aqiB - aqiA;
  });

  const liveGeo = areas.filter((a) => a.fetch_method === "geo").length;
  const liveStation = areas.filter((a) => a.fetch_method === "station").length;

  return (
    <section className="vital-card mt-8 p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400"
              aria-hidden
            />
            <h2 className="font-semibold text-vital-text">
              Lahore — 18 areas live AQI
            </h2>
          </div>
          <p className="mt-1 text-sm text-vital-muted">
            {relativeFetchLabel(lastFetched)} · auto-refresh every 60s
            {liveGeo > 0 ? ` · ${liveGeo} geo` : ""}
            {liveStation > 0 ? ` · ${liveStation} station` : ""}
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
              aria-hidden
            />
            Refresh now
          </button>
        )}
      </header>
      {loading && areas.length === 0 ? (
        <p className="text-sm text-vital-muted">Loading live WAQI for all areas…</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {sortedZones.map((zone) => {
            const reading = byId.get(zone.id);
            const aqi = reading?.aqi;
            const color = aqi != null ? aqiColor(aqi) : undefined;
            const active = highlightId === zone.id;
            const isGeo = reading?.fetch_method === "geo";
            const isStale = reading?.is_stale;

            return (
              <li
                key={zone.id}
                title={
                  reading
                    ? `${reading.label} · ${isGeo ? "WAQI geo feed" : "WAQI nearest station"}${reading.station ? ` · ${reading.station}` : ""}${reading.updated_at ? ` · ${formatAqiUpdated(reading.updated_at, reading.station_reported_at)}` : ""}`
                    : undefined
                }
                className={`rounded-lg border px-2 py-2 text-center transition-colors ${
                  active
                    ? "border-vital-primary bg-vital-primary/10"
                    : "border-vital-border bg-vital-bg/50"
                }`}
                style={
                  color && !active
                    ? { borderColor: `${color}44`, backgroundColor: `${color}0d` }
                    : undefined
                }
              >
                <p className="truncate text-xs font-medium text-vital-text">
                  {zone.name}
                </p>
                <p
                  className="mt-1 text-lg font-bold tabular-nums"
                  style={color ? { color } : undefined}
                >
                  {aqi ?? "—"}
                </p>
                <p className="text-[10px] text-vital-muted">
                  {aqi != null ? aqiShortLabel(aqi) : "—"}
                </p>
                {reading && (
                  <p className="mt-0.5 text-[9px] uppercase tracking-wide text-vital-muted/80">
                    {isGeo ? "geo" : "station"}
                    {isStale ? " · delayed" : ""}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
