"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { LahoreArea } from "@/lib/lahoreAreas";

export default function MapFocusArea({ area }: { area: LahoreArea | null }) {
  const map = useMap();

  useEffect(() => {
    if (!area) return;
    map.flyTo([area.lat, area.lon], Math.max(map.getZoom(), 14), {
      duration: 0.6,
    });
  }, [area, map]);

  return null;
}
