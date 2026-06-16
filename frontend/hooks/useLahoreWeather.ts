"use client";

import { useEffect, useState } from "react";
import { fetchLahoreWeather, type LahoreWeather } from "@/lib/weather";

export function useLahoreWeather() {
  const [weather, setWeather] = useState<LahoreWeather | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchLahoreWeather()
      .then((data) => {
        if (!cancelled) setWeather(data);
      })
      .catch(() => {
        if (!cancelled) setWeather(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { weather, loading };
}
