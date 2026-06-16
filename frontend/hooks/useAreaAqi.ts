"use client";

import { useEffect, useState } from "react";
import type { AreaAqiPayload } from "@/lib/aqi";

const cache = new Map<string, { at: number; data: AreaAqiPayload }>();
const CACHE_MS = 45_000;

/** Fast single-area WAQI — one API call, ~1–2s vs 18-area batch. */
export function useAreaAqi(areaName: string) {
  const [reading, setReading] = useState<AreaAqiPayload | null>(() => {
    const hit = cache.get(areaName.trim().toLowerCase());
    return hit && Date.now() - hit.at < CACHE_MS ? hit.data : null;
  });
  const [loading, setLoading] = useState(!reading);

  useEffect(() => {
    const key = areaName.trim();
    if (!key) {
      setReading(null);
      setLoading(false);
      return;
    }

    const cacheKey = key.toLowerCase();
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_MS) {
      setReading(hit.data);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetch(`/api/aqi/lookup?area=${encodeURIComponent(key)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("lookup failed");
        return res.json() as Promise<AreaAqiPayload>;
      })
      .then((data) => {
        if (cancelled) return;
        cache.set(cacheKey, { at: Date.now(), data });
        setReading(data);
      })
      .catch(() => {
        if (!cancelled) setReading(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [areaName]);

  return { reading, loading };
}
