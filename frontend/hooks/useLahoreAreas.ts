"use client";

import { useCallback, useEffect, useState } from "react";

import type { AreaAqiPayload } from "@/lib/aqi";
import { LAHORE_ROTATE_MS } from "@/lib/lahoreAreas";
import { useVitalAirStore } from "@/store/useVitalAirStore";

/** Real-time refresh — every 60 seconds */
const REFRESH_MS = 60 * 1000;
const CACHE_FRESH_MS = 45_000;

async function fetchLahoreAreas(): Promise<AreaAqiPayload[]> {
  const res = await fetch(`/api/aqi/areas?_=${Date.now()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail || `WAQI areas unavailable (${res.status})`);
  }
  const json = (await res.json()) as { areas: AreaAqiPayload[] };
  const list = json.areas ?? [];
  if (list.length === 0) throw new Error("No Lahore WAQI data returned");
  return list;
}

export function useLahoreAreas(options?: { rotate?: boolean; enabled?: boolean }) {
  const rotate = options?.rotate ?? false;
  const enabled = options?.enabled ?? true;

  const cachedAreas = useVitalAirStore((s) => s.lahoreAreas);
  const cachedAt = useVitalAirStore((s) => s.lahoreAreasFetchedAt);
  const setLahoreAreas = useVitalAirStore((s) => s.setLahoreAreas);

  const [areas, setAreas] = useState<AreaAqiPayload[]>(cachedAreas);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(
    enabled && cachedAreas.length === 0
  );
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(cachedAt);

  const current = areas.length > 0 ? areas[index % areas.length] : null;

  const refresh = useCallback(
    async (silent = false) => {
      if (!enabled) return;

      const cacheAge = cachedAt
        ? Date.now() - new Date(cachedAt).getTime()
        : Infinity;
      const hasFreshCache = cachedAreas.length > 0 && cacheAge < CACHE_FRESH_MS;

      if (hasFreshCache && areas.length === 0) {
        setAreas(cachedAreas);
        setLoading(false);
      }

      setError(null);
      if (!silent && !hasFreshCache && areas.length === 0) setLoading(true);
      else setRefreshing(true);

      try {
        const list = await fetchLahoreAreas();
        setAreas(list);
        setLahoreAreas(list);
        setLastFetched(new Date().toISOString());
        setIndex((i) => (list.length ? i % list.length : 0));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load WAQI data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [enabled, cachedAreas, cachedAt, areas.length, setLahoreAreas]
  );

  useEffect(() => {
    if (!enabled) return;
    if (cachedAreas.length > 0 && areas.length === 0) {
      setAreas(cachedAreas);
      setLastFetched(cachedAt);
      setLoading(false);
    }
    void refresh(cachedAreas.length > 0);
    const refreshId = window.setInterval(() => void refresh(true), REFRESH_MS);
    return () => window.clearInterval(refreshId);
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!rotate || areas.length < 2) return;
    const rotateId = window.setInterval(() => {
      setIndex((i) => (i + 1) % areas.length);
    }, LAHORE_ROTATE_MS);
    return () => window.clearInterval(rotateId);
  }, [rotate, areas.length]);

  return {
    areas,
    data: rotate ? current : null,
    areaIndex: index,
    areaTotal: areas.length,
    loading,
    refreshing,
    error,
    lastFetched,
    refresh: () => refresh(false),
  };
}
