import "server-only";

import { searchLahoreLocations } from "@/lib/geocode";
import { LAHORE_AREAS, searchAreas } from "@/lib/lahoreAreas";

export interface LocationSuggestion {
  id: string;
  /** Value stored in the form */
  name: string;
  /** Full label shown in the dropdown */
  label: string;
  detail?: string;
  source: "area_mapping" | "geocode";
  group?: "popular" | "other";
}

/** Mapped Lahore areas + geocoded places for any-neighborhood search. */
export async function searchLocations(
  query: string,
  limit = 16
): Promise<LocationSuggestion[]> {
  const q = query.trim();

  if (!q) {
    return LAHORE_AREAS.map((area) => ({
      id: area.id,
      name: area.name,
      label: `${area.name}, Lahore`,
      detail: "Popular area · live AQI",
      source: "area_mapping" as const,
      group: "popular" as const,
    }));
  }

  const out: LocationSuggestion[] = [];
  const seen = new Set<string>();

  for (const area of searchAreas(q, 12)) {
    const key = area.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: area.id,
      name: area.name,
      label: `${area.name}, Lahore`,
      detail: "Mapped Lahore area · live AQI",
      source: "area_mapping",
      group: "popular",
    });
  }

  try {
    const geocoded = await searchLahoreLocations(q, 6);
    for (const hit of geocoded) {
      const key = hit.shortName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: `geo-${key.replace(/\s+/g, "-")}`,
        name: hit.shortName,
        label: hit.displayName,
        detail: "Lahore · map search",
        source: "geocode",
        group: "other",
      });
      if (out.length >= limit) break;
    }
  } catch {
    /* geocode optional */
  }

  return out.slice(0, limit);
}
