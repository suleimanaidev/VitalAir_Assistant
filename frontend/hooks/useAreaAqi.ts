"use client";

import { useCallback, useEffect, useState } from "react";
import type { AreaAqiPayload } from "@/lib/aqi";
import { cleanAreaName } from "@/lib/formatLocation";

const cache = new Map<string, { at: number; data: AreaAqiPayload }>();
/** Short cache — live WAQI refresh */
const CACHE_MS = 20_000;
const REFRESH_MS = 45_000;

async function fetchAreaAqi(key: string): Promise<AreaAqiPayload | null> {
  const res = await fetch(
    `/api/aqi/lookup?area=${encodeURIComponent(key)}&_=${Date.now()}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  return res.json() as Promise<AreaAqiPayload>;
}

/** Live single-area WAQI — refreshes every 45s while mounted. */
export function useAreaAqi(areaName: string) {
  const [reading, setReading] = useState<AreaAqiPayload | null>(() => {
    const hit = cache.get(areaName.trim().toLowerCase());
    return hit && Date.now() - hit.at < CACHE_MS ? hit.data : null;
  });
  const [loading, setLoading] = useState(!reading);

  const refresh = useCallback(async (force = false) => {
    const key = cleanAreaName(areaName);
    if (!key) {
      setReading(null);
      setLoading(false);
      return;
    }

    const cacheKey = key.toLowerCase();
    if (!force) {
      const hit = cache.get(cacheKey);
      if (hit && Date.now() - hit.at < CACHE_MS) {
        setReading(hit.data);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const data = await fetchAreaAqi(key);
      if (data) {
        cache.set(cacheKey, { at: Date.now(), data });
        setReading(data);
      }
    } catch {
      /* keep last reading */
    } finally {
      setLoading(false);
    }
  }, [areaName]);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  return { reading, loading };
}
