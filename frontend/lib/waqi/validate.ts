import { LAHORE_BOUNDS } from "@/lib/waqi/constants";
import type { WaqiRaw } from "@/lib/waqi/types";

const INDIA_PATTERN =
  /india|amritsar|delhi|chandigarh|jalandhar|ludhiana|punjab,\s*india/i;

export function inLahoreBounds(lat: number, lon: number): boolean {
  return (
    lat >= LAHORE_BOUNDS.minLat &&
    lat <= LAHORE_BOUNDS.maxLat &&
    lon >= LAHORE_BOUNDS.minLon &&
    lon <= LAHORE_BOUNDS.maxLon
  );
}

/** Reject India-border stations; accept only Lahore/Pakistan WAQI readings. */
export function isLahoreReading(data: WaqiRaw): boolean {
  const blob = `${data.city?.name ?? ""} ${data.city?.location ?? ""}`.toLowerCase();
  if (INDIA_PATTERN.test(blob)) return false;

  const geo = data.city?.geo;
  if (Array.isArray(geo) && geo.length >= 2) {
    const lat = Number(geo[0]);
    const lon = Number(geo[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      return inLahoreBounds(lat, lon);
    }
  }

  return blob.includes("lahore") || blob.includes("pakistan");
}
