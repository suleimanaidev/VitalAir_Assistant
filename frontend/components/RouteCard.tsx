"use client";

import { MapPin, Route } from "lucide-react";
import NavigateRouteLinks from "@/components/map/NavigateRouteLinks";
import { aqiLabel } from "@/lib/aqi";

export interface RouteOption {
  rank: number;
  label: string;
  distance: string;
  duration?: string;
  avg_aqi: number;
  exposure: string;
  waypoints: string[];
  via_areas: string[];
  recommendation?: string;
}

export interface RouteCardProps {
  from?: string;
  to?: string;
  routeOptions?: RouteOption[];
  emptyMessage?: string;
}

function aqiBadgeClass(aqi: number): string {
  if (aqi >= 200) return "bg-red-500/20 text-red-300 border-red-500/40";
  if (aqi >= 150) return "bg-orange-500/20 text-orange-300 border-orange-500/40";
  if (aqi >= 100) return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
}

/** Three low-AQI route options from analyze API */
export default function RouteCard({
  from,
  to,
  routeOptions = [],
  emptyMessage = "Enter source and destination, then tap Analyze.",
}: RouteCardProps) {
  const hasRoute = Boolean(from && to && routeOptions.length > 0);

  return (
    <article className="vital-card p-5">
      <header className="flex items-center gap-2">
        <Route className="h-5 w-5 text-vital-primary" aria-hidden />
        <div>
          <h2 className="font-semibold">Route suggestions</h2>
          {hasRoute && (
            <p className="text-xs text-vital-muted">
              {from} → {to} · 3 paths ranked by lowest AQI
            </p>
          )}
        </div>
      </header>

      {hasRoute && from && to && (
        <div className="mt-4 rounded-lg border border-vital-border/50 bg-vital-bg/30 p-3">
          <p className="mb-2 text-xs font-medium text-vital-text">
            Navigate (free — no API key)
          </p>
          <NavigateRouteLinks
            from={from}
            to={to}
            waypoints={routeOptions[0]?.via_areas}
            variant="compact"
          />
        </div>
      )}

      {hasRoute ? (
        <ol className="mt-4 space-y-3">
          {routeOptions.map((opt) => (
            <li
              key={opt.rank}
              className="group relative overflow-hidden rounded-xl border border-white/5 bg-vital-card/40 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-vital-primary/40 hover:bg-vital-card hover:shadow-glow-primary"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-vital-text group-hover:text-vital-primary transition-colors">
                    <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-vital-primary/20 text-xs font-extrabold text-vital-primary shadow-sm">
                      {opt.rank}
                    </span>
                    {opt.label}
                  </p>
                  <p className="mt-1 text-xs text-vital-muted">
                    {opt.distance}
                    {opt.duration ? ` · ${opt.duration}` : ""}
                    {opt.exposure ? ` · ${opt.exposure} exposure` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold ${aqiBadgeClass(opt.avg_aqi)}`}
                  title={aqiLabel(opt.avg_aqi)}
                >
                  AQI {opt.avg_aqi}
                </span>
              </div>

              {opt.via_areas.length > 0 && (
                <p className="mt-3 flex items-start gap-2 text-sm text-vital-primary">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    Low-AQI corridor via{" "}
                    <strong>{opt.via_areas.join(", ")}</strong>
                  </span>
                </p>
              )}

              {opt.waypoints.length > 0 && (
                <p className="mt-2 text-xs text-vital-muted">
                  {opt.waypoints.join(" → ")}
                </p>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-vital-muted">{emptyMessage}</p>
      )}
    </article>
  );
}
