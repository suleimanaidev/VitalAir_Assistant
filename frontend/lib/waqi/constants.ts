/** WAQI API + verified Lahore station registry */

export const WAQI_BASE = "https://api.waqi.info/feed";
export const WAQI_TIMEOUT_MS = 12_000;
export const BATCH_CONCURRENCY = 12;
export const STALE_READING_MS = 3 * 60 * 60 * 1000;

export const LAHORE_BOUNDS = {
  minLat: 31.2,
  maxLat: 31.8,
  minLon: 73.9,
  maxLon: 74.6,
} as const;

export interface WaqiStation {
  id: string;
  lat: number;
  lon: number;
  label: string;
}

/** Verified Lahore, Pakistan stations (geo feed often returns India). */
export const LAHORE_WAQI_STATIONS: readonly WaqiStation[] = [
  { id: "A471607", lat: 31.5482, lon: 74.344, label: "Lahore (G.O.R.)" },
  { id: "A540730", lat: 31.5659, lon: 74.2994, label: "Civil Secretariat" },
  { id: "@11765", lat: 31.5601, lon: 74.3359, label: "Lahore US Embassy" },
] as const;

export const CITY_STATION_PRIORITY = ["A471607", "A540730", "@11765"] as const;
