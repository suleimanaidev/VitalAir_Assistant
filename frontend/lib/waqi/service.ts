import { APP_CITY } from "@/lib/constants";
import type { LahoreArea } from "@/lib/lahoreAreas";
import { resolveLocation } from "@/lib/resolveLocation";
import type { AreaAqiPayload, LiveAqiPayload } from "@/lib/aqi";
import { CITY_STATION_PRIORITY, BATCH_CONCURRENCY } from "@/lib/waqi/constants";
import {
  fetchAllLahoreStations,
  fetchCityWaqi,
  fetchGeoWaqiOnly,
  fetchLiveWaqi,
  filterTrustedLahoreStations,
  interpolateAqiFromStations,
  mapConcurrent,
  nearestStationReading,
} from "@/lib/waqi/client";
import { toAreaPayload, toCityPayload } from "@/lib/waqi/parse";
import type { LocationInput } from "@/lib/waqi/types";

function fromLahoreArea(area: LahoreArea): LocationInput {
  return {
    areaId: area.id,
    areaName: area.name,
    lat: area.lat,
    lon: area.lon,
    locationSource: "area_mapping",
  };
}

async function fetchAtLocation(
  token: string,
  loc: LocationInput
): Promise<AreaAqiPayload | null> {
  // Lahore's verified WAQI stations are clustered in the city centre, so the
  // raw geo feed snaps every neighbourhood to the same dominant station and
  // returns an identical AQI. Interpolating across all trusted stations gives
  // each area a distinct, coordinate-aware estimate (nearest station dominates).
  const allReadings = await fetchAllLahoreStations(token);
  const stationReadings = filterTrustedLahoreStations(allReadings);

  if (stationReadings.length >= 2) {
    const { aqi, nearest } = interpolateAqiFromStations(
      loc.lat,
      loc.lon,
      stationReadings
    );
    return toAreaPayload(
      nearest.data,
      loc,
      "interpolated",
      aqi,
      nearest.station.label
    );
  }

  if (stationReadings.length === 1) {
    const only = stationReadings[0];
    return toAreaPayload(
      only.data,
      loc,
      "station",
      undefined,
      only.station.label
    );
  }

  // No trusted station feeds available — fall back to the geo feed at the
  // exact coordinates, then to the nearest-station live lookup.
  const geo = await fetchGeoWaqiOnly(loc.lat, loc.lon, token);
  if (geo) {
    return toAreaPayload(geo.data, loc, "geo");
  }

  const live = await fetchLiveWaqi(loc.lat, loc.lon, token);
  if (!live) return null;
  return toAreaPayload(live.data, loc, live.method);
}

/** Single mapped neighborhood — real-time WAQI at its coordinates. */
export async function fetchAreaAqi(
  token: string,
  area: LahoreArea
): Promise<AreaAqiPayload | null> {
  return fetchAtLocation(token, fromLahoreArea(area));
}

/** Resolve area name → coordinates → live WAQI (mapping, then geocode). */
export async function fetchAqiByAreaName(
  token: string,
  areaQuery: string
): Promise<AreaAqiPayload | null> {
  const resolved = await resolveLocation(areaQuery);
  if (!resolved) return null;

  const loc: LocationInput = {
    areaId: resolved.area?.id ?? areaQuery.toLowerCase().replace(/\s+/g, "-"),
    areaName: resolved.area?.name ?? resolved.name,
    lat: resolved.lat,
    lon: resolved.lon,
    locationSource: resolved.source,
  };

  return fetchAtLocation(token, loc);
}

/** City-level Lahore AQI from primary waqi.info stations. */
export async function fetchLahoreAqi(token: string): Promise<LiveAqiPayload | null> {
  const live = await fetchCityWaqi(token, CITY_STATION_PRIORITY);
  if (!live) return null;
  return toCityPayload(live.data, live.method);
}

/**
 * All Lahore areas — valid geo feed when Lahore/Pakistan, else the **actual AQI**
 * from the nearest trusted WAQI monitoring station (not blended/interpolated).
 */
export async function fetchAreasInBatches(
  token: string,
  areas: LahoreArea[]
): Promise<AreaAqiPayload[]> {
  const allReadings = await fetchAllLahoreStations(token);
  const stationReadings = filterTrustedLahoreStations(allReadings);
  if (stationReadings.length === 0) return [];

  const locs = areas.map(fromLahoreArea);

  const results = await mapConcurrent(locs, BATCH_CONCURRENCY, async (loc) => {
    const geo = await fetchGeoWaqiOnly(loc.lat, loc.lon, token);
    if (geo) {
      return toAreaPayload(geo.data, loc, "geo");
    }

    const nearest = nearestStationReading(loc.lat, loc.lon, stationReadings);
    const { aqi } = interpolateAqiFromStations(
      loc.lat,
      loc.lon,
      stationReadings
    );
    return toAreaPayload(
      nearest.data,
      loc,
      "interpolated",
      aqi,
      nearest.station.label
    );
  });

  return results.filter((r): r is AreaAqiPayload => r != null);
}