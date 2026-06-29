import { APP_CITY } from "@/lib/constants";
import { cleanAreaName, formatAreaTitle } from "@/lib/formatLocation";
import { findAreaByName } from "@/lib/lahoreAreas";

export interface RoutePoint {
  name: string;
  lat: number;
  lon: number;
}

/** Map a Lahore area name to coordinates (mapped areas only). */
export function resolveRoutePoint(areaName: string): RoutePoint | null {
  const cleaned = cleanAreaName(areaName);
  if (!cleaned) return null;

  const mapped = findAreaByName(cleaned);
  if (!mapped) return null;

  return { name: mapped.name, lat: mapped.lat, lon: mapped.lon };
}

function lahoreLabel(areaName: string): string {
  return formatAreaTitle(cleanAreaName(areaName));
}

function orderedRoutePoints(
  from: string,
  to: string,
  waypoints: string[] = []
): RoutePoint[] {
  const fromPt = resolveRoutePoint(from);
  const toPt = resolveRoutePoint(to);
  if (!fromPt || !toPt) return [];

  const points: RoutePoint[] = [fromPt];
  const seen = new Set([fromPt.name.toLowerCase()]);

  for (const wp of waypoints) {
    const pt = resolveRoutePoint(wp);
    if (!pt) continue;
    const key = pt.name.toLowerCase();
    if (seen.has(key)) continue;
    points.push(pt);
    seen.add(key);
  }

  if (!seen.has(toPt.name.toLowerCase())) {
    points.push(toPt);
  }

  return points.length >= 2 ? points : [];
}

/** Google Maps deep link — free to open; no API key required. */
export function buildGoogleMapsUrl(input: {
  from: string;
  to: string;
  waypoints?: string[];
}): string {
  const params = new URLSearchParams({
    api: "1",
    origin: lahoreLabel(input.from),
    destination: lahoreLabel(input.to),
    travelmode: "driving",
  });

  const via = (input.waypoints ?? [])
    .map(cleanAreaName)
    .filter(Boolean)
    .map(lahoreLabel);

  if (via.length > 0) {
    params.set("waypoints", via.join("|"));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * OpenStreetMap directions (OSRM engine) — 100% free, no API key.
 * Requires mapped Lahore coordinates for each point.
 */
export function buildOsmDirectionsUrl(input: {
  from: string;
  to: string;
  waypoints?: string[];
}): string | null {
  const points = orderedRoutePoints(
    input.from,
    input.to,
    input.waypoints ?? []
  );
  if (points.length < 2) return null;

  const route = points.map((p) => `${p.lon},${p.lat}`).join(";");
  const params = new URLSearchParams({
    engine: "fossgis_osrm_car",
    route,
  });

  return `https://www.openstreetmap.org/directions?${params.toString()}`;
}

export function canBuildOsmRoute(from: string, to: string): boolean {
  return (
    resolveRoutePoint(from) !== null && resolveRoutePoint(to) !== null
  );
}

/** Human-readable route label for UI. */
export function formatRouteLabel(from: string, to: string): string {
  return `${lahoreLabel(from)} → ${lahoreLabel(to)}`;
}

export const NAV_PROVIDER_LABELS = {
  google: "Google Maps",
  osm: `OpenStreetMap (${APP_CITY})`,
} as const;
