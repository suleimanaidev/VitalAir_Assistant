/** High-resilience Geocoding for Lahore areas using Photon + Nominatim. */

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const PHOTON = "https://photon.komoot.io/api";
const LAHORE_CENTER = { lat: 31.5204, lon: 74.3587 };
export const LAHORE_BOUNDS = { minLat: 31.15, maxLat: 31.85, minLon: 73.85, maxLon: 74.65 };

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

export interface GeocodeSearchHit {
  lat: number;
  lon: number;
  displayName: string;
  shortName: string;
}

const geoCache = new Map<string, { at: number; results: GeocodeSearchHit[] }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

export function inLahore(lat: number, lon: number): boolean {
  return (
    lat >= LAHORE_BOUNDS.minLat &&
    lat <= LAHORE_BOUNDS.maxLat &&
    lon >= LAHORE_BOUNDS.minLon &&
    lon <= LAHORE_BOUNDS.maxLon
  );
}

/** Search via Photon API (OpenStreetMap index optimized for typeahead autocomplete) */
async function searchPhoton(query: string, limit = 6): Promise<GeocodeSearchHit[]> {
  try {
    const url = new URL(PHOTON);
    url.searchParams.set("q", query.toLowerCase().includes("lahore") ? query : `${query} lahore`);
    url.searchParams.set("lat", String(LAHORE_CENTER.lat));
    url.searchParams.set("lon", String(LAHORE_CENTER.lon));
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];

    const json = (await res.json()) as {
      features?: Array<{
        geometry: { coordinates: [number, number] };
        properties: {
          name?: string;
          street?: string;
          district?: string;
          city?: string;
          state?: string;
          country?: string;
        };
      }>;
    };

    const hits: GeocodeSearchHit[] = [];
    for (const f of json.features ?? []) {
      const [lon, lat] = f.geometry.coordinates;
      if (!inLahore(lat, lon)) continue;

      const p = f.properties;
      const shortName = p.name || p.street || query;
      const parts = [p.name, p.street, p.district, p.city || "Lahore", p.state, p.country].filter(Boolean);
      const displayName = Array.from(new Set(parts)).join(", ");

      hits.push({ lat, lon, displayName, shortName });
    }
    return hits;
  } catch {
    return [];
  }
}

/** Search via OpenStreetMap Nominatim */
async function searchNominatim(query: string, limit = 5): Promise<GeocodeSearchHit[]> {
  try {
    const q = query.toLowerCase().includes("lahore") ? query : `${query}, Lahore, Pakistan`;
    const url = new URL(NOMINATIM);
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("countrycodes", "pk");
    url.searchParams.set("viewbox", "73.85,31.85,74.65,31.15");

    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: { "User-Agent": "VitalAir/1.0 (Lahore AQI Health Assistant)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];

    const results = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name?: string;
    }>;

    const hits: GeocodeSearchHit[] = [];
    for (const hit of results) {
      const lat = Number(hit.lat);
      const lon = Number(hit.lon);
      if (Number.isNaN(lat) || Number.isNaN(lon) || !inLahore(lat, lon)) continue;

      const displayName = hit.display_name ?? query;
      const shortName = displayName.split(",")[0]?.trim() || query;
      hits.push({ lat, lon, displayName, shortName });
    }
    return hits;
  } catch {
    return [];
  }
}

/** Multiple hits for location autocomplete (any Lahore place, street, society, or landmark). */
export async function searchLahoreLocations(
  query: string,
  limit = 6
): Promise<GeocodeSearchHit[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  const cacheKey = q.toLowerCase();
  const cached = geoCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.results.slice(0, limit);
  }

  // Query Photon and Nominatim in parallel for fast & robust coverage
  const [photonHits, nominatimHits] = await Promise.all([
    searchPhoton(q, limit),
    searchNominatim(q, limit),
  ]);

  const combined: GeocodeSearchHit[] = [];
  const seen = new Set<string>();

  for (const hit of [...photonHits, ...nominatimHits]) {
    const key = hit.shortName.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(hit);
    if (combined.length >= limit) break;
  }

  if (combined.length > 0) {
    geoCache.set(cacheKey, { at: Date.now(), results: combined });
  }

  return combined;
}

/** Single geocoding result with coordinates in Lahore */
export async function geocodeLahoreArea(
  query: string
): Promise<GeocodeResult | null> {
  const hits = await searchLahoreLocations(query, 1);
  if (hits.length > 0) {
    return {
      lat: hits[0].lat,
      lon: hits[0].lon,
      displayName: hits[0].displayName,
    };
  }

  return null;
}

