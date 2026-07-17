"use client";

import { useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";

import FitLahoreBounds from "@/components/map/FitLahoreBounds";
import MapFocusArea from "@/components/map/MapFocusArea";
import NavigateRouteLinks from "@/components/map/NavigateRouteLinks";
import type { AreaAqiPayload } from "@/lib/aqi";
import { formatAqiUpdated } from "@/lib/aqi";
import { aqiColor } from "@/lib/aqiColors";
import {
  LAHORE_BOUNDARY,
  LAHORE_BOUNDS,
  LAHORE_CENTER,
  LAHORE_MAP_LABEL,
  lahoreMaxBounds,
} from "@/lib/lahoreBoundary";
import { LAHORE_AREAS, type LahoreArea } from "@/lib/lahoreAreas";
import { useVitalAirStore } from "@/store/useVitalAirStore";

export interface LeafletMapProps {
  areas: AreaAqiPayload[];
  activeAreaId?: string | null;
  onAreaSelect?: (area: LahoreArea | null) => void;
}

function toLatLng(coords: number[][]): [number, number][] {
  return coords.map(([lng, lat]) => [lat, lng] as [number, number]);
}

export default function LeafletMapInner({
  areas,
  activeAreaId,
  onAreaSelect,
}: LeafletMapProps) {
  const route = useVitalAirStore((s) => s.results.safeRoute);
  const { source, destination } = useVitalAirStore((s) => s.query);

  const byId = useMemo(() => new Map(areas.map((a) => [a.area_id, a])), [areas]);

  const activeArea = useMemo(
    () => LAHORE_AREAS.find((z) => z.id === activeAreaId) ?? null,
    [activeAreaId]
  );

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const cleanestCoords = route?.cleanest?.geometry?.coordinates
    ? toLatLng(route.cleanest.geometry.coordinates)
    : [];

  const fastestCoords = route?.fastest?.geometry?.coordinates
    ? toLatLng(route.fastest.geometry.coordinates)
    : [];

  const showNavigation = Boolean(
    source.trim() && destination.trim() && (cleanestCoords.length > 1 || fastestCoords.length > 1)
  );

  const navWaypoints = route?.routeOptions?.[0]?.via_areas ?? [];

  return (
    <div className="relative h-[520px] overflow-hidden rounded-xl border border-vital-border lahore-map-wrap">
      <div className="pointer-events-none absolute right-3 top-3 z-[1000] rounded-md border border-vital-primary/40 bg-vital-bg/90 px-2.5 py-1.5 text-xs font-medium text-vital-primary shadow-glow backdrop-blur-sm">
        Lahore only · Pakistan
      </div>

      {showNavigation && (
        <div className="absolute bottom-12 left-3 right-3 z-[1000] rounded-lg border border-vital-border bg-vital-bg/95 p-3 shadow-lg backdrop-blur-sm">
          <NavigateRouteLinks
            from={source}
            to={destination}
            waypoints={navWaypoints}
            variant="bar"
          />
        </div>
      )}

      <MapContainer
        center={LAHORE_CENTER}
        zoom={12}
        minZoom={11}
        maxZoom={16}
        className="z-10 h-full w-full"
        scrollWheelZoom
        doubleClickZoom
        zoomControl={false}
        maxBounds={lahoreMaxBounds()}
        maxBoundsViscosity={1}
        dragging={!L.Browser.mobile}
        tap={!L.Browser.mobile}
      >
        <ZoomControl position="bottomright" />
        <FitLahoreBounds bounds={LAHORE_BOUNDS} />
        <MapFocusArea area={activeArea} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <Polygon
          positions={LAHORE_BOUNDARY}
          pathOptions={{
            color: "#00C896",
            weight: 2.5,
            fillColor: "#00C896",
            fillOpacity: 0.06,
            dashArray: "12 6",
          }}
        >
          <Tooltip sticky direction="top">
            {LAHORE_MAP_LABEL}
          </Tooltip>
        </Polygon>

        {cleanestCoords.length > 1 && (
          <Polyline
            positions={cleanestCoords}
            pathOptions={{ color: "#00C896", weight: 5 }}
          />
        )}

        {fastestCoords.length > 1 && (
          <Polyline
            positions={fastestCoords}
            pathOptions={{ color: "#FFA500", weight: 4, dashArray: "10 8" }}
          />
        )}

        {route?.aqiCheckpoints?.map((cp, i) => (
          <CircleMarker
            key={`aqi-cp-${i}`}
            center={[cp.lat, cp.lng]}
            radius={8}
            pathOptions={{
              color: aqiColor(cp.aqi),
              fillColor: aqiColor(cp.aqi),
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              Route checkpoint
              <br />
              AQI {cp.aqi}
            </Popup>
          </CircleMarker>
        ))}

        {LAHORE_AREAS.map((zone) => {
          const reading = byId.get(zone.id);
          const aqi = reading?.aqi ?? 0;
          const color = aqi > 0 ? aqiColor(aqi) : "#94a3b8";
          const isActive = activeAreaId === zone.id;
          const showTip = hoveredId === zone.id || isActive;

          return (
            <CircleMarker
              key={zone.id}
              center={[zone.lat, zone.lon]}
              radius={isActive ? 13 : 10}
              pathOptions={{
                color: isActive ? "#00C896" : color,
                fillColor: color,
                fillOpacity: 0.88,
                weight: isActive ? 3 : 2,
              }}
              eventHandlers={{
                click: () => onAreaSelect?.(zone),
                mouseover: () => setHoveredId(zone.id),
                mouseout: () => setHoveredId(null),
              }}
            >
              {showTip && (
                <Tooltip permanent direction="top" offset={[0, -8]}>
                  <strong>{zone.name}</strong>
                  {" · "}AQI {aqi > 0 ? aqi : "—"}
                </Tooltip>
              )}
              <Popup>
                <strong>{zone.name}</strong>
                <br />
                AQI {aqi > 0 ? aqi : "—"}
                {reading?.label && (
                  <>
                    <br />
                    {reading.label}
                  </>
                )}
                {reading?.station && (
                  <>
                    <br />
                    <span style={{ fontSize: 11 }}>{reading.station}</span>
                  </>
                )}
                {reading?.updated_at && (
                  <>
                    <br />
                    <span style={{ fontSize: 10 }}>
                      {formatAqiUpdated(
                        reading.updated_at,
                        reading.station_reported_at
                      )}
                    </span>
                  </>
                )}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <p className="pointer-events-none absolute bottom-2 left-3 z-[1000] text-[10px] text-vital-muted">
        {showNavigation
          ? "Green = cleaner route · Orange = fastest"
          : "Hover or tap a pin · Lahore city view"}
      </p>
    </div>
  );
}
