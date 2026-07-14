import React from "react";
import { aqiColor } from "@/lib/aqiColors";
import { cleanStationLabel, formatAreaTitle } from "@/lib/formatLocation";

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
  geo: "Live WAQI reading at this location",
  interpolated: "Estimated from nearby Lahore WAQI monitors",
  station: "Reading from nearest WAQI monitor",
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
  const color = aqiColor(aqi);
  const pmVal = pm25Index ?? pm25;
  const areaTitle = formatAreaTitle(city ?? "Lahore");
  const stationLabel = cleanStationLabel(station);
  const sourceHint = fetchMethod ? SOURCE_HINT[fetchMethod] : undefined;

  // Calculate percentage of AQI (max scale of 300 or 500 for the gauge display)
  const maxScale = 300;
  const pct = Math.min(1, Math.max(0, aqi / maxScale));
  
  // Rotate the needle from -90 deg (left) to 90 deg (right)
  const rotation = -90 + (pct * 180);



  return (
    <article 
      className="vital-card p-5 flex flex-col items-center justify-between text-center relative overflow-hidden transition-all duration-300"
      style={{ 
        backgroundColor: `${color}0D`,
        borderColor: `${color}40`,
        borderWidth: "1px",
        boxShadow: `0 4px 20px -2px ${color}1A`
      }}
    >
      <header className="w-full flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold tracking-wide text-vital-text uppercase opacity-80">
          {areaTitle.split(",")[0]} AQI
        </h3>
        <span 
          className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
          style={{ color: color, backgroundColor: `${color}1A` }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </span>
      </header>

      {/* SVG Arc Gauge */}
      <div className="relative w-full flex justify-center py-2">
        <svg width="200" height="110" viewBox="0 0 200 110" className="overflow-visible">
          <defs>
            <linearGradient id="aqi-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00C896" />
              <stop offset="25%" stopColor="#FFD700" />
              <stop offset="50%" stopColor="#FFA500" />
              <stop offset="75%" stopColor="#FF4545" />
              <stop offset="100%" stopColor="#9B59B6" />
            </linearGradient>
          </defs>
          
          {/* Background Track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="10"
            strokeLinecap="round"
            className="dark:stroke-slate-800"
          />
          
          {/* Colored Range Indicator */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#aqi-gauge-gradient)"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Needle Pin / Center Point */}
          <circle cx="100" cy="100" r="6" fill="#1E293B" className="dark:fill-slate-200" />
          
          {/* Rotated Needle Indicator */}
          <g transform={`translate(100, 100) rotate(${rotation})`}>
            <line 
              x1="0" 
              y1="0" 
              x2="0" 
              y2="-74" 
              stroke="#1E293B" 
              strokeWidth="4.5" 
              strokeLinecap="round"
              className="dark:stroke-slate-200" 
            />
          </g>
        </svg>

        {/* Central Display */}
        <div className="absolute bottom-1 flex flex-col items-center">
          <span className="text-5xl font-extrabold tracking-tight text-vital-text">
            {aqi}
          </span>
          <span className="text-sm font-semibold mt-1" style={{ color: color }}>
            {label}
          </span>
        </div>
      </div>



      {/* Station / Meta Footer */}
      <footer className="mt-4 w-full flex items-center justify-between text-[10px] text-vital-muted border-t border-vital-border/40 pt-2">
        <span className="truncate max-w-[140px]">
          {stationLabel || sourceHint || "Lahore"}
        </span>
        <span>
          {updatedAt || "Updated just now"}
        </span>
      </footer>
    </article>
  );
}
