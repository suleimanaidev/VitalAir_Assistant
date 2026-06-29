"use client";

import { ExternalLink, Map, Navigation } from "lucide-react";
import {
  buildGoogleMapsUrl,
  buildOsmDirectionsUrl,
  NAV_PROVIDER_LABELS,
} from "@/lib/navigationLinks";

export interface NavigateRouteLinksProps {
  from: string;
  to: string;
  waypoints?: string[];
  /** Compact pills for route cards; default bar for map overlay */
  variant?: "compact" | "bar";
  className?: string;
}

const linkBase =
  "inline-flex items-center gap-1.5 rounded-lg border text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-vital-primary/40";

const variants = {
  compact: {
    google: `${linkBase} border-vital-border bg-vital-bg/60 px-2.5 py-1.5 text-vital-text hover:border-vital-primary/50 hover:bg-vital-primary/10`,
    osm: `${linkBase} border-vital-border bg-vital-bg/60 px-2.5 py-1.5 text-vital-muted hover:border-vital-primary/40 hover:text-vital-text`,
  },
  bar: {
    google: `${linkBase} border-vital-primary/40 bg-vital-primary/15 px-3 py-2 text-vital-primary hover:bg-vital-primary/25`,
    osm: `${linkBase} border-vital-border bg-vital-card/90 px-3 py-2 text-vital-text hover:border-vital-primary/40`,
  },
} as const;

/** Free external navigation — Google Maps + OpenStreetMap (no paid API keys). */
export default function NavigateRouteLinks({
  from,
  to,
  waypoints = [],
  variant = "compact",
  className = "",
}: NavigateRouteLinksProps) {
  const trimmedFrom = from.trim();
  const trimmedTo = to.trim();
  if (!trimmedFrom || !trimmedTo) return null;

  const googleUrl = buildGoogleMapsUrl({
    from: trimmedFrom,
    to: trimmedTo,
    waypoints,
  });
  const osmUrl = buildOsmDirectionsUrl({
    from: trimmedFrom,
    to: trimmedTo,
    waypoints,
  });

  const styles = variants[variant];

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      role="group"
      aria-label={`Navigate from ${trimmedFrom} to ${trimmedTo}`}
    >
      {variant === "bar" && (
        <span className="mr-1 flex items-center gap-1 text-xs text-vital-muted">
          <Navigation className="h-3.5 w-3.5" aria-hidden />
          Navigate
        </span>
      )}
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.google}
      >
        <Map className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {NAV_PROVIDER_LABELS.google}
        <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
      </a>
      {osmUrl && (
        <a
          href={osmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.osm}
        >
          {NAV_PROVIDER_LABELS.osm}
          <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
        </a>
      )}
    </div>
  );
}
