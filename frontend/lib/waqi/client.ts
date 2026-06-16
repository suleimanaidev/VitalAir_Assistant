import {
  LAHORE_WAQI_STATIONS,
  WAQI_BASE,
  WAQI_TIMEOUT_MS,
  type WaqiStation,
} from "@/lib/waqi/constants";
import type { WaqiFetchMethod, WaqiRaw } from "@/lib/waqi/types";
import { isLahoreReading } from "@/lib/waqi/validate";
import { resolveAqi } from "@/lib/waqi/parse";

export interface LiveWaqiResult {
  data: WaqiRaw;
  method: WaqiFetchMethod;
  stationId?: string;
}

export interface LahoreStationReading {
  station: WaqiStation;
  aqi: number;
  data: WaqiRaw;
}

async function waqiGet(path: string, token: string): Promise<WaqiRaw | null> {
  const url = new URL(`${WAQI_BASE}/${path}/`);
  url.searchParams.set("token", token);
  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(WAQI_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const payload = (await res.json()) as { status?: string; data?: WaqiRaw };
  if (payload.status !== "ok" || !payload.data) return null;
  return payload.data;
}

export function nearestStation(lat: number, lon: number): WaqiStation {
  let best = LAHORE_WAQI_STATIONS[0];
  let bestDist = Infinity;
  for (const station of LAHORE_WAQI_STATIONS) {
    const dLat = lat - station.lat;
    const dLon = lon - station.lon;
    const dist = dLat * dLat + dLon * dLon;
    if (dist < bestDist) {
      bestDist = dist;
      best = station;
    }
  }
  return best;
}

/**
 * Real-time WAQI at coordinates:
 * 1) geo feed at exact lat/lon (if Lahore-valid)
 * 2) nearest verified Lahore station feed (live HTTP, no cache)
 */
export async function fetchLiveWaqi(
  lat: number,
  lon: number,
  token: string
): Promise<LiveWaqiResult | null> {
  const geo = await fetchGeoWaqiOnly(lat, lon, token);
  if (geo) return geo;

  const station = nearestStation(lat, lon);
  const feed = await waqiGet(station.id, token);
  if (feed) {
    return { data: feed, method: "station", stationId: station.id };
  }

  return null;
}

/** Geo feed only — for batch area fetch without duplicate station calls. */
export async function fetchGeoWaqiOnly(
  lat: number,
  lon: number,
  token: string
): Promise<LiveWaqiResult | null> {
  const geo = await waqiGet(`geo:${lat};${lon}`, token);
  if (geo && isLahoreReading(geo)) {
    return { data: geo, method: "geo" };
  }
  return null;
}

/**
 * Real-time WAQI for batch fetches — geo per area, station feeds cached
 * within the same request (still live HTTP, no long-lived cache).
 */
export async function fetchLiveWaqiCached(
  lat: number,
  lon: number,
  token: string,
  stationCache: Map<string, LiveWaqiResult>
): Promise<LiveWaqiResult | null> {
  const geo = await fetchGeoWaqiOnly(lat, lon, token);
  if (geo) return geo;

  const station = nearestStation(lat, lon);
  const cached = stationCache.get(station.id);
  if (cached) return cached;

  const feed = await waqiGet(station.id, token);
  if (!feed) return null;

  const result: LiveWaqiResult = {
    data: feed,
    method: "station",
    stationId: station.id,
  };
  stationCache.set(station.id, result);
  return result;
}

export async function fetchCityWaqi(
  token: string,
  stationIds: readonly string[]
): Promise<LiveWaqiResult | null> {
  for (const id of stationIds) {
    const feed = await waqiGet(id, token);
    if (feed) return { data: feed, method: "station", stationId: id };
  }
  return null;
}

/** Fetch all verified Lahore WAQI stations (3 API calls). */
export async function fetchAllLahoreStations(
  token: string
): Promise<LahoreStationReading[]> {
  const results = await mapConcurrent(
    [...LAHORE_WAQI_STATIONS],
    3,
    async (station) => {
      const feed = await waqiGet(station.id, token);
      if (!feed) return null;
      const aqi = resolveAqi(feed);
      if (aqi <= 0) return null;
      return { station, aqi, data: feed };
    }
  );
  return results.filter((r): r is LahoreStationReading => r != null);
}

/**
 * Drop stale/outlier feeds (e.g. US Embassy reporting AQI 34 while city stations
 * are 120+). Keeps real Lahore smog readings only.
 */
export function filterTrustedLahoreStations(
  readings: LahoreStationReading[]
): LahoreStationReading[] {
  if (readings.length <= 1) return readings;

  const aqis = readings.map((r) => r.aqi).sort((a, b) => a - b);
  const median = aqis[Math.floor(aqis.length / 2)];

  const trusted = readings.filter((r) => {
    if (median >= 90 && r.aqi < median * 0.7) return false;
    if (median < 60 && r.aqi > median * 1.6) return false;
    return true;
  });

  return trusted.length > 0 ? trusted : readings;
}

/** Nearest trusted Lahore station for a neighborhood. */
export function nearestStationReading(
  lat: number,
  lon: number,
  readings: LahoreStationReading[]
): LahoreStationReading {
  let best = readings[0];
  let bestDist = Infinity;

  for (const reading of readings) {
    const dLat = lat - reading.station.lat;
    const dLon = lon - reading.station.lon;
    const dist = dLat * dLat + dLon * dLon;
    if (dist < bestDist) {
      bestDist = dist;
      best = reading;
    }
  }

  return best;
}

/**
 * Inverse-distance weighted AQI from multiple Lahore stations.
 * Gives each neighborhood a distinct estimate when geo feed is unavailable.
 */
export function interpolateAqiFromStations(
  lat: number,
  lon: number,
  stations: LahoreStationReading[]
): { aqi: number; nearest: LahoreStationReading } {
  if (stations.length === 0) {
    throw new Error("No Lahore station readings for interpolation");
  }
  if (stations.length === 1) {
    return { aqi: stations[0].aqi, nearest: stations[0] };
  }

  let weightSum = 0;
  let aqiSum = 0;
  let nearest = stations[0];
  let nearestDist = Infinity;

  for (const reading of stations) {
    const dLat = lat - reading.station.lat;
    const dLon = lon - reading.station.lon;
    const dist = Math.sqrt(dLat * dLat + dLon * dLon);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = reading;
    }
    const w = 1 / Math.max(dist, 0.008) ** 2;
    weightSum += w;
    aqiSum += w * reading.aqi;
  }

  return {
    aqi: Math.round(aqiSum / weightSum),
    nearest,
  };
}

/** Run async tasks with a concurrency limit. */
export async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return results;
}
