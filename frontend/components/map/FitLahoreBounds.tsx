"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { lahoreMaxBounds } from "@/lib/lahoreBoundary";

interface Props {
  bounds: [[number, number], [number, number]];
}

export default function FitLahoreBounds({ bounds }: Props) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
    map.setMaxBounds(lahoreMaxBounds());
    map.setMinZoom(11);
  }, [map, bounds]);

  return null;
}
