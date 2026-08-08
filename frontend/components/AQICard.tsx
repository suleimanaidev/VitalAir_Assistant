import React from "react";
import { MapPin, Radio } from "lucide-react";
import { getAqiTheme, aqiColor } from "@/lib/aqiColors";
import { cleanStationLabel, extractExactStationName, formatAreaTitle } from "@/lib/formatLocation";

export interface AQICardProps {
  city?: string;
  aqi?: number;
  label?: string;
  pm25?: number;
  pm25Index?: number;
  station?: string;
  fetchMethod?: "geo" | "station" | "interpolated";
  isStale?: boolean;
  updatedAt?: string;
  subtitle?: string;
}

const SOURCE_HINT: Record<
  NonNullable<AQICardProps["fetchMethod"]>,
  string
> = {
  geo: "Live GPS WAQI reading",
  interpolated: "Estimated from nearby monitors",
  station: "Live WAQI station reading",
};

export default function AQICard({
  city,
  aqi,
  label,
  pm25,
  pm25Index,
  station,
  fetchMethod,
  isStale,
  updatedAt,
  subtitle,
}: AQICardProps) {
  if (aqi == null) return null;

  const theme = getAqiTheme(aqi);
  const color = theme.color;
  const areaTitle = formatAreaTitle(city ?? "Lahore");
  const exactLocationName = extractExactStationName(station, city);
  const sourceHint = fetchMethod ? SOURCE_HINT[fetchMethod] : undefined;
  const displayLabel = label || theme.label;

  // Max scale 300 for EPA gauge calculation
  const maxScale = 300;
  const pct = Math.min(1, Math.max(0, aqi / maxScale));

  // Rotate needle from -90 deg (left) to 90 deg (right)
  const rotation = -90 + pct * 180;

  // Arc math for 180° semi-circle (radius = 85, center = [110, 105])
  const arcLength = Math.PI * 85; // ~267.035
  const strokeDashoffset = arcLength * (1 - pct);

  return (
    <article
      className="vital-card relative flex flex-col items-center justify-between overflow-hidden p-5 text-center transition-all duration-500 group"
      style={{
        backgroundColor: `${color}0F`,
        borderColor: `${color}50`,
        borderWidth: "1.5px",
        boxShadow: `0 8px 30px -4px ${theme.glow}`,
      }}
    >
      {/* Top Header — Area Title & Live Status Badge */}
      <header className="mb-2 flex w-full items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-vital-text opacity-90">
          {areaTitle.split(",")[0]} AQI
        </h3>
        <span
          className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-vital-primary bg-vital-primary/10 border border-vital-primary/30"
        >
          <span
            className="h-1.5 w-1.5 rounded-full bg-vital-primary animate-pulse"
          />
          Live Monitor
        </span>
      </header>

      {/* SVG Arc Gauge Section */}
      <div className="relative flex w-full justify-center py-1">
        <svg
          width="220"
          height="115"
          viewBox="0 0 220 115"
          className="overflow-visible"
        >
          <defs>
            {/* Website Design System Gradient Stops */}
            <linearGradient
              id="aqi-gauge-gradient-pro"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#00C896" />
              <stop offset="20%" stopColor="#FFD700" />
              <stop offset="40%" stopColor="#FFA500" />
              <stop offset="60%" stopColor="#FF4545" />
              <stop offset="80%" stopColor="#9B59B6" />
              <stop offset="100%" stopColor="#8B0000" />
            </linearGradient>

            {/* Glowing Drop Shadow Filter for Active Arc */}
            <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Track Arc (Vital Border Color) */}
          <path
            d="M 25 105 A 85 85 0 0 1 195 105"
            fill="none"
            stroke="#30363D"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Full Color Scale Track (Subtle background) */}
          <path
            d="M 25 105 A 85 85 0 0 1 195 105"
            fill="none"
            stroke="url(#aqi-gauge-gradient-pro)"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.3"
          />

          {/* Active Filled Arc Segment with Neon Glow */}
          <path
            d="M 25 105 A 85 85 0 0 1 195 105"
            fill="none"
            stroke="url(#aqi-gauge-gradient-pro)"
            strokeWidth="13"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            filter="url(#gauge-glow)"
            className="transition-all duration-1000 ease-out"
          />

          {/* Center Pin Glow Halo */}
          <circle cx="110" cy="105" r="10" fill={color} opacity="0.3" />
          <circle cx="110" cy="105" r="6" fill="#FFFFFF" />

          {/* Needle Indicator Line (Crisp White + Glowing Tip) */}
          <g transform={`translate(110, 105) rotate(${rotation})`}>
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="-78"
              stroke="#FFFFFF"
              strokeWidth="4"
              strokeLinecap="round"
              style={{
                filter: "drop-shadow(0 0 4px rgba(255,255,255,0.8))",
              }}
            />
            {/* Needle Tip Marker */}
            <circle
              cx="0"
              cy="-78"
              r="3.5"
              fill={color}
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          </g>
        </svg>

        {/* Central AQI Number inside the arc */}
        <div className="absolute bottom-2 flex flex-col items-center pointer-events-none">
          <span
            className="text-5xl font-black tracking-tight text-white"
            style={{
              textShadow: `0 0 20px ${color}80, 0 2px 4px rgba(0,0,0,0.8)`,
            }}
          >
            {aqi}
          </span>
        </div>
      </div>

      {/* Category Banner below Gauge */}
      <div
        className="mt-1 flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold tracking-wide shadow-sm"
        style={{
          color: theme.textColor,
          backgroundColor: `${color}1A`,
          border: `1px solid ${color}40`,
        }}
      >
        <span
          className="h-2 w-2 rounded-full animate-pulse shrink-0"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
        />
        <span className="text-center">{displayLabel}</span>
      </div>

      {/* Prominent High-Visibility Source Location Banner */}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-vital-text bg-vital-card/90 border border-vital-border/80 rounded-xl px-3 py-2 w-full shadow-inner">
        <MapPin className="h-4 w-4 text-vital-primary shrink-0" />
        <span className="text-vital-muted font-medium">Exact Source:</span>
        <span className="font-extrabold text-white truncate max-w-[200px]" title={exactLocationName}>
          {exactLocationName}
        </span>
      </div>

      {/* Footer Meta Details — Clean & Responsive */}
      <footer className="mt-2.5 flex w-full items-center justify-between border-t border-vital-border/60 pt-2 text-[11px] text-vital-muted">
        <span className="flex items-center gap-1 text-[10px] text-vital-primary font-medium">
          <Radio className="h-3 w-3 animate-pulse" />
          {sourceHint || "WAQI Live Station"}
        </span>
        <span className="font-medium shrink-0">
          {updatedAt || "Updated 5 min ago"}
        </span>
      </footer>
    </article>
  );
}

