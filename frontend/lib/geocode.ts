/** Geocoding fallback for Lahore areas not in area_mapping. */

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const LAHORE_BOUNDS = { minLat: 31.2, maxLat: 31.8, minLon: 73.9, maxLon: 74.6 };

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

function inLahore(lat: number, lon: number): boolean {
  return (
    lat >= LAHORE_BOUNDS.minLat &&
    lat <= LAHORE_BOUNDS.maxLat &&
    lon >= LAHORE_BOUNDS.minLon &&
    lon <= LAHORE_BOUNDS.maxLon
  );
}

export async function geocodeLahoreArea(
  query: string
): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;

  const url = new URL(NOMINATIM);
  url.searchParams.set("q", `${q}, Lahore, Punjab, Pakistan`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "pk");

  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: { "User-Agent": "VitalAir/1.0 (Lahore AQI assistant)" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return null;

  const results = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name?: string;
  }>;
  if (!results.length) return null;

  const hit = results[0];
  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon) || !inLahore(lat, lon)) return null;

  return { lat, lon, displayName: hit.display_name ?? q };
}

export interface GeocodeSearchHit {
  lat: number;
  lon: number;
  displayName: string;
  shortName: string;
}

/** Multiple Nominatim hits for location autocomplete (any Lahore place). */
export async function searchLahoreLocations(
  query: string,
  limit = 5
): Promise<GeocodeSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const url = new URL(NOMINATIM);
  url.searchParams.set("q", `${q}, Lahore, Punjab, Pakistan`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(Math.min(limit, 8)));
  url.searchParams.set("countrycodes", "pk");

  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: { "User-Agent": "VitalAir/1.0 (Lahore AQI assistant)" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return [];

  const results = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name?: string;
  }>;

  const hits: GeocodeSearchHit[] = [];
  const seen = new Set<string>();

  for (const hit of results) {
    const lat = Number(hit.lat);
    const lon = Number(hit.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon) || !inLahore(lat, lon)) continue;

    const displayName = hit.display_name ?? q;
    const shortName =
      displayName.split(",")[0]?.trim() || q;
    const key = shortName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    hits.push({ lat, lon, displayName, shortName });
    if (hits.length >= limit) break;
  }

  return hits;
}
