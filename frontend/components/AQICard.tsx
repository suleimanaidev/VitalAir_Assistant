import { Activity } from "lucide-react";
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

  return (
    <article className="vital-card p-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" style={{ color }} aria-hidden />
          <h2 className="font-semibold">Air Quality</h2>
        </div>
        <span
          className="rounded-full px-2 py-1 text-xs font-medium"
          style={{ color, backgroundColor: `${color}22` }}
        >
          {label}
        </span>
      </header>
      <p className="mt-4 text-5xl font-bold" style={{ color }}>
        {aqi}
      </p>
      <p className="mt-1 text-sm text-vital-muted">
        {areaTitle}
        {pmVal != null && pmVal > 0 ? ` · PM2.5 index ${pmVal}` : ""}
      </p>
      {sourceHint && (
        <p className="mt-2 text-xs text-vital-primary/80">{sourceHint}</p>
      )}
      {stationLabel && (
        <p className="mt-1 text-xs text-vital-muted">{stationLabel}</p>
      )}
      {subtitle && (
        <p className="mt-2 text-xs text-vital-muted">{subtitle}</p>
      )}
      <p className="mt-2 text-xs text-vital-muted">
        {updatedAt}
        {isStale ? " · station data may be delayed" : ""}
      </p>
    </article>
  );
}
