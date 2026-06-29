import { findAreaByName, type LahoreArea } from "@/lib/lahoreAreas";
import { geocodeLahoreArea } from "@/lib/geocode";
import { cleanAreaName } from "@/lib/formatLocation";

export type LocationSource = "area_mapping" | "geocode";

export interface ResolvedLocation {
  name: string;
  lat: number;
  lon: number;
  source: LocationSource;
  area?: LahoreArea;
  geocodedName?: string;
}

/** Resolve area name → coordinates (mapping first, geocode fallback). */
export async function resolveLocation(
  query: string
): Promise<ResolvedLocation | null> {
  const q = cleanAreaName(query);
  if (!q) return null;

  const mapped = findAreaByName(q);
  if (mapped) {
    return {
      name: mapped.name,
      lat: mapped.lat,
      lon: mapped.lon,
      source: "area_mapping",
      area: mapped,
    };
  }

  const geocoded = await geocodeLahoreArea(q);
  if (geocoded) {
    const fromDisplay =
      geocoded.displayName.split(",")[0]?.trim() || q;
    return {
      name: cleanAreaName(fromDisplay),
      lat: geocoded.lat,
      lon: geocoded.lon,
      source: "geocode",
      geocodedName: geocoded.displayName,
    };
  }

  return null;
}
