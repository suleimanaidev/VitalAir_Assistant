import {
  aqiHealthAdvice,
  aqiLabel,
  type AreaAqiPayload,
  type AqiBreakdown,
  type ForecastDay,
  type LiveAqiPayload,
} from "@/lib/aqi";
import { APP_CITY } from "@/lib/constants";
import { cleanAreaName, cleanStationLabel } from "@/lib/formatLocation";
import { STALE_READING_MS } from "@/lib/waqi/constants";
import type { LocationInput, WaqiFetchMethod, WaqiIaqi, WaqiRaw } from "@/lib/waqi/types";

export function resolveAqi(data: WaqiRaw): number {
  const raw = data.aqi;
  if (raw != null && raw !== "-" && raw !== "") {
    const n = Math.round(Number(raw));
    if (n > 0) return n;
  }
  const pm25 = data.iaqi?.pm25?.v;
  if (pm25 != null) return Math.round(Number(pm25));
  const pm10 = data.iaqi?.pm10?.v;
  if (pm10 != null) return Math.round(Number(pm10));
  return 0;
}

function parseBreakdown(iaqi: WaqiIaqi | undefined): AqiBreakdown {
  const read = (key: string) => {
    const v = iaqi?.[key]?.v;
    return v != null ? Number(v) : undefined;
  };
  return {
    pm25: read("pm25") ?? 0,
    pm10: read("pm10"),
    o3: read("o3"),
    no2: read("no2"),
    co: read("co"),
    so2: read("so2"),
  };
}

function parseForecast(data: WaqiRaw): ForecastDay[] {
  const daily = data.forecast?.daily?.pm25 ?? [];
  return [...daily]
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(-7)
    .filter((row) => row.avg != null && row.day)
    .map((row) => ({ day: row.day, aqi: Math.round(row.avg) }));
}

function stationLabel(data: WaqiRaw): string {
  return data.city?.name?.trim() || "Lahore monitoring station";
}

function readingAgeMs(stationIso: string | undefined): number | null {
  if (!stationIso) return null;
  const t = new Date(stationIso).getTime();
  return Number.isNaN(t) ? null : Date.now() - t;
}

function buildBaseFields(data: WaqiRaw, fetchMethod: WaqiFetchMethod) {
  const aqi = resolveAqi(data);
  if (aqi <= 0) return null;

  const breakdown = parseBreakdown(data.iaqi);
  const stationIso = data.time?.iso;
  const fetchedAt = new Date().toISOString();
  const advice = aqiHealthAdvice(aqi);
  const ageMs = readingAgeMs(stationIso);

  return {
    aqi,
    label: aqiLabel(aqi),
    pm25: breakdown.pm25,
    pm25_index: breakdown.pm25,
    breakdown,
    dominent: data.dominentpol,
    updated_at: stationIso ?? fetchedAt,
    station_reported_at: stationIso,
    fetched_at: fetchedAt,
    source: "waqi" as const,
    station: stationLabel(data),
    forecast: parseForecast(data),
    health_advice_en: advice.en,
    health_advice_ur: advice.ur,
    fetch_method: fetchMethod,
    is_stale: ageMs != null && ageMs > STALE_READING_MS,
  };
}

export function toAreaPayload(
  data: WaqiRaw,
  loc: LocationInput,
  fetchMethod: WaqiFetchMethod,
  aqiOverride?: number,
  nearestMonitorLabel?: string
): AreaAqiPayload | null {
  const base = buildBaseFields(data, fetchMethod);
  if (!base) return null;

  const aqi = aqiOverride ?? base.aqi;
  const areaLabel = cleanAreaName(loc.areaName);
  const stationClean = base.station.trim();
  const monitor =
    nearestMonitorLabel?.trim() || cleanStationLabel(stationClean) || stationClean;

  let station: string;
  if (fetchMethod === "interpolated") {
    station = `Estimated for ${areaLabel} · nearest monitor: ${monitor}`;
  } else if (fetchMethod === "station") {
    station = `Nearest WAQI monitor · ${monitor}`;
  } else {
    station = monitor.includes(areaLabel)
      ? monitor
      : `${monitor} · ${areaLabel}`;
  }

  return {
    ...base,
    aqi,
    label: aqiLabel(aqi),
    health_advice_en: aqiHealthAdvice(aqi).en,
    health_advice_ur: aqiHealthAdvice(aqi).ur,
    area_id: loc.areaId,
    area: areaLabel,
    city: APP_CITY,
    lat: loc.lat,
    lon: loc.lon,
    location_source: loc.locationSource,
    station,
  };
}

export function toCityPayload(
  data: WaqiRaw,
  fetchMethod: WaqiFetchMethod
): LiveAqiPayload | null {
  const base = buildBaseFields(data, fetchMethod);
  if (!base) return null;
  return { ...base, city: APP_CITY };
}
