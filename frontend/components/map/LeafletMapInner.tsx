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
import { Layers, Map as MapIcon, Compass, Sparkles } from "lucide-react";

import FitLahoreBounds from "@/components/map/FitLahoreBounds";
import MapFocusArea from "@/components/map/MapFocusArea";
import NavigateRouteLinks from "@/components/map/NavigateRouteLinks";
import type { AreaAqiPayload } from "@/lib/aqi";
import { formatAqiUpdated } from "@/lib/aqi";
import { getAqiTheme, aqiColor } from "@/lib/aqiColors";
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

type MapStyle = "dark" | "voyager" | "satellite";

const TILE_LAYERS: Record<
  MapStyle,
  { url: string; attribution: string; name: string; icon: string }
> = {
  dark: {
    name: "Dark Cyber",
    icon: "🌙",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  voyager: {
    name: "Light Clean",
    icon: "☀️",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  satellite: {
    name: "Satellite",
    icon: "🛰️",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  },
};

const AQI_SCALE_ITEMS = [
  { range: "0-50", label: "Good", color: "#10B981" },
  { range: "51-100", label: "Moderate", color: "#F59E0B" },
  { range: "101-150", label: "Sensitive", color: "#F97316" },
  { range: "151-200", label: "Unhealthy", color: "#EF4444" },
  { range: "201-300", label: "Very Unhealthy", color: "#A855F7" },
  { range: "301+", label: "Hazardous", color: "#E11D48" },
];

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

  const [mapStyle, setMapStyle] = useState<MapStyle>("dark");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const byId = useMemo(() => new Map(areas.map((a) => [a.area_id, a])), [areas]);

  const activeArea = useMemo(
    () => LAHORE_AREAS.find((z) => z.id === activeAreaId) ?? null,
    [activeAreaId]
  );

  const activeReading = activeArea ? byId.get(activeArea.id) : null;
  const activeAqiTheme = activeReading?.aqi ? getAqiTheme(activeReading.aqi) : null;

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
    <div className="relative h-[560px] w-full overflow-hidden rounded-2xl border border-vital-border/80 bg-slate-950 shadow-2xl lahore-map-wrap group">
      {/* Top Glass Panel — Location Badge & Map Style Switcher */}
      <div className="absolute left-3 right-3 top-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Badge: City & Active Area */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-vital-border/60 bg-slate-900/85 px-3 py-1.5 shadow-lg backdrop-blur-md transition-all">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-vital-primary">
            <Compass className="h-4 w-4 animate-spin-slow text-emerald-400" />
            <span>Lahore, Pakistan</span>
          </div>
          {activeArea && (
            <div
              className="flex items-center gap-1.5 border-l border-vital-border/60 pl-2 text-xs font-medium"
              style={{ color: activeAqiTheme?.textColor || "#00C896" }}
            >
              <span>{activeArea.name}</span>
              {activeReading?.aqi && (
                <span
                  className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: activeAqiTheme?.color }}
                >
                  AQI {activeReading.aqi}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Map Theme Control */}
        <div className="pointer-events-auto flex items-center rounded-xl border border-vital-border/60 bg-slate-900/85 p-1 shadow-lg backdrop-blur-md">
          {(["dark", "voyager", "satellite"] as MapStyle[]).map((styleKey) => {
            const style = TILE_LAYERS[styleKey];
            const isSelected = mapStyle === styleKey;
            return (
              <button
                key={styleKey}
                onClick={() => setMapStyle(styleKey)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-vital-primary/20 text-vital-primary border border-vital-primary/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
                title={`Switch to ${style.name} map`}
              >
                <span>{style.icon}</span>
                <span className="hidden sm:inline">{style.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Navigation Links Overlay if route exists */}
      {showNavigation && (
        <div className="absolute bottom-16 left-3 right-3 z-[1000] rounded-xl border border-vital-border/80 bg-slate-900/90 p-3 shadow-xl backdrop-blur-md">
          <NavigateRouteLinks
            from={source}
            to={destination}
            waypoints={navWaypoints}
            variant="bar"
          />
        </div>
      )}

      {/* Main Leaflet Map Container */}
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
      >
        <ZoomControl position="bottomright" />
        <FitLahoreBounds bounds={LAHORE_BOUNDS} />
        <MapFocusArea area={activeArea} />

        <TileLayer
          key={mapStyle}
          attribution={TILE_LAYERS[mapStyle].attribution}
          url={TILE_LAYERS[mapStyle].url}
        />

        {/* Lahore Boundary Overlay with Neon Dash */}
        <Polygon
          positions={LAHORE_BOUNDARY}
          pathOptions={{
            color: "#10B981",
            weight: 2.5,
            fillColor: "#10B981",
            fillOpacity: 0.05,
            dashArray: "10 6",
          }}
        >
          <Tooltip sticky direction="top" className="custom-lahore-tooltip">
            {LAHORE_MAP_LABEL}
          </Tooltip>
        </Polygon>

        {/* Cleanest Route Glow Polyline */}
        {cleanestCoords.length > 1 && (
          <>
            {/* Outer Glow Line */}
            <Polyline
              positions={cleanestCoords}
              pathOptions={{
                color: "#10B981",
                weight: 12,
                opacity: 0.35,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            {/* Inner Core Polyline */}
            <Polyline
              positions={cleanestCoords}
              pathOptions={{
                color: "#059669",
                weight: 5,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </>
        )}

        {/* Fastest Route Glow Polyline */}
        {fastestCoords.length > 1 && (
          <>
            {/* Outer Glow Line */}
            <Polyline
              positions={fastestCoords}
              pathOptions={{
                color: "#F59E0B",
                weight: 9,
                opacity: 0.3,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            {/* Inner Core Polyline */}
            <Polyline
              positions={fastestCoords}
              pathOptions={{
                color: "#D97706",
                weight: 3.5,
                dashArray: "8 6",
                opacity: 0.9,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </>
        )}

        {/* Route Checkpoints */}
        {route?.aqiCheckpoints?.map((cp, i) => {
          const theme = getAqiTheme(cp.aqi);
          return (
            <CircleMarker
              key={`aqi-cp-${i}`}
              center={[cp.lat, cp.lng]}
              radius={7}
              pathOptions={{
                color: "#FFFFFF",
                fillColor: theme.color,
                fillOpacity: 0.95,
                weight: 2,
              }}
            >
              <Popup>
                <div className="p-1">
                  <div className="text-xs font-semibold text-slate-100">
                    Route Checkpoint #{i + 1}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: theme.color }}
                    />
                    <span className="text-sm font-bold text-white">
                      AQI {cp.aqi}
                    </span>
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: theme.textColor }}
                    >
                      ({theme.label})
                    </span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Lahore Area Pins */}
        {LAHORE_AREAS.map((zone) => {
          const reading = byId.get(zone.id);
          const aqi = reading?.aqi ?? 0;
          const theme = getAqiTheme(aqi);
          const isActive = activeAreaId === zone.id;
          const showTip = hoveredId === zone.id || isActive;

          return (
            <g key={zone.id}>
              {/* Outer Pulsing Glow Circle for Active Area */}
              {isActive && (
                <CircleMarker
                  center={[zone.lat, zone.lon]}
                  radius={20}
                  pathOptions={{
                    color: theme.color,
                    fillColor: theme.color,
                    fillOpacity: 0.25,
                    weight: 1.5,
                    dashArray: "4 4",
                  }}
                />
              )}

              {/* Main Area Marker */}
              <CircleMarker
                center={[zone.lat, zone.lon]}
                radius={isActive ? 13 : 10}
                pathOptions={{
                  color: isActive ? "#FFFFFF" : theme.color,
                  fillColor: theme.color,
                  fillOpacity: isActive ? 0.95 : 0.85,
                  weight: isActive ? 3 : 2,
                }}
                eventHandlers={{
                  click: () => onAreaSelect?.(zone),
                  mouseover: () => setHoveredId(zone.id),
                  mouseout: () => setHoveredId(null),
                }}
              >
                {showTip && (
                  <Tooltip permanent direction="top" offset={[0, -10]}>
                    <div className="flex items-center gap-1.5 px-1 py-0.5">
                      <span className="font-bold text-slate-100">{zone.name}</span>
                      <span className="text-slate-400">·</span>
                      <span
                        className="font-extrabold"
                        style={{ color: theme.color }}
                      >
                        AQI {aqi > 0 ? aqi : "—"}
                      </span>
                    </div>
                  </Tooltip>
                )}

                <Popup>
                  <div className="p-1 min-w-[160px]">
                    <div className="flex items-center justify-between gap-2 border-b border-vital-border/40 pb-1.5">
                      <span className="font-bold text-slate-100">{zone.name}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white"
                        style={{ backgroundColor: theme.color }}
                      >
                        AQI {aqi > 0 ? aqi : "N/A"}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Air Quality:</span>
                        <span className="font-semibold" style={{ color: theme.textColor }}>
                          {theme.label}
                        </span>
                      </div>

                      {reading?.station && (
                        <div className="text-[11px] text-slate-400 truncate">
                          📍 {reading.station}
                        </div>
                      )}

                      {reading?.updated_at && (
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-vital-border/30">
                          {formatAqiUpdated(
                            reading.updated_at,
                            reading.station_reported_at
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            </g>
          );
        })}
      </MapContainer>

      {/* Floating Bottom Left Color Theory Legend Bar */}
      <div className="absolute bottom-3 left-3 z-[1000] hidden sm:flex items-center gap-2 rounded-xl border border-vital-border/60 bg-slate-900/90 px-3 py-2 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 mr-1">
          <Sparkles className="h-3.5 w-3.5 text-vital-primary" />
          <span>AQI Scale:</span>
        </div>
        <div className="flex items-center gap-1">
          {AQI_SCALE_ITEMS.map((item) => (
            <div
              key={item.range}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: `${item.color}20`, color: item.color }}
              title={`AQI ${item.range}: ${item.label}`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.range}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

