/**
 * Lahore boundary — convex hull around all AQI areas (exact fit, no marker mismatch).
 */

import { LAHORE_AREAS } from "@/lib/lahoreAreas";

/** [lat, lng] for Leaflet */
type LatLng = [number, number];

function cross(o: [number, number], a: [number, number], b: [number, number]) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

/** Convex hull on (lng, lat) plane */
function convexHullLngLat(
  points: [number, number][]
): [number, number][] {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) =>
    a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]
  );

  const lower: [number, number][] = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: [number, number][] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

const lngLatPoints: [number, number][] = LAHORE_AREAS.map((a) => [a.lon, a.lat]);

const cLng =
  lngLatPoints.reduce((s, p) => s + p[0], 0) / lngLatPoints.length;
const cLat =
  lngLatPoints.reduce((s, p) => s + p[1], 0) / lngLatPoints.length;

const EXPAND = 1.08;
const expanded: [number, number][] = lngLatPoints.map(([lng, lat]) => [
  cLng + (lng - cLng) * EXPAND,
  cLat + (lat - cLat) * EXPAND,
] as [number, number]);

const hullLngLat = convexHullLngLat(expanded);

export const LAHORE_BOUNDARY: LatLng[] = [
  ...hullLngLat.map(([lng, lat]) => [lat, lng] as LatLng),
  (() => {
    const [lng, lat] = hullLngLat[0];
    return [lat, lng] as LatLng;
  })(),
];

function boundsFromBoundary(ring: LatLng[]): [[number, number], [number, number]] {
  const lats = ring.map((p) => p[0]);
  const lngs = ring.map((p) => p[1]);
  const pad = 0.012;
  return [
    [Math.min(...lats) - pad, Math.min(...lngs) - pad],
    [Math.max(...lats) + pad, Math.max(...lngs) + pad],
  ];
}

export const LAHORE_BOUNDS = boundsFromBoundary(LAHORE_BOUNDARY);

export const LAHORE_CENTER: LatLng = [
  (LAHORE_BOUNDS[0][0] + LAHORE_BOUNDS[1][0]) / 2,
  (LAHORE_BOUNDS[0][1] + LAHORE_BOUNDS[1][1]) / 2,
];

export const LAHORE_MAP_LABEL =
  "Lahore city boundary — VitalAir coverage area";

export function lahoreMaxBounds(): [[number, number], [number, number]] {
  const m = 0.012;
  return [
    [LAHORE_BOUNDS[0][0] - m, LAHORE_BOUNDS[0][1] - m],
    [LAHORE_BOUNDS[1][0] + m, LAHORE_BOUNDS[1][1] + m],
  ];
}
