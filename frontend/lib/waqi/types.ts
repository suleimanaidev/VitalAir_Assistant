import type { LocationSource } from "@/lib/resolveLocation";

export type WaqiIaqi = Record<string, { v?: number } | undefined>;

export type WaqiFetchMethod = "geo" | "station" | "interpolated";

export interface WaqiRaw {
  aqi?: number | string;
  time?: { iso?: string };
  city?: { name?: string; geo?: number[]; location?: string };
  iaqi?: WaqiIaqi;
  dominentpol?: string;
  forecast?: { daily?: { pm25?: Array<{ day: string; avg: number }> } };
}

export interface LocationInput {
  areaId: string;
  areaName: string;
  lat: number;
  lon: number;
  locationSource: LocationSource;
}
