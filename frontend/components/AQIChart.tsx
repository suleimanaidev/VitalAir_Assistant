"use client";

import { APP_CITY } from "@/lib/constants";
import type { ForecastDay } from "@/lib/aqi";
import { TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PRIMARY = "#00C896";
const DANGER = "#FF4545";
const DANGER_FILL = "rgba(255, 69, 69, 0.12)";
const HAZARD_FILL = "rgba(255, 69, 69, 0.22)";

const UNHEALTHY_THRESHOLD = 150;
const HAZARDOUS_THRESHOLD = 200;

export interface AQIChartProps {
  city?: string;
  forecast?: ForecastDay[];
  loading?: boolean;
}

function buildChartData(forecast: ForecastDay[]) {
  return forecast.map(({ day, aqi }) => {
    const d = new Date(`${day}T12:00:00`);
    const valid = !Number.isNaN(d.getTime());
    return {
      day: valid
        ? d.toLocaleDateString("en-US", { weekday: "short" })
        : day.slice(5),
      label: valid
        ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : day,
      aqi,
    };
  });
}

interface TooltipPayload {
  payload?: { day: string; label: string; aqi: number };
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const { day, label, aqi } = payload[0].payload;
  const isDanger = aqi >= UNHEALTHY_THRESHOLD;
  return (
    <div className="rounded-md border border-vital-border bg-vital-card px-3 py-2 shadow-lg">
      <p className="text-xs text-vital-muted">
        {day} · {label}
      </p>
      <p
        className="text-lg font-bold tabular-nums"
        style={{ color: isDanger ? DANGER : PRIMARY }}
      >
        AQI {aqi}
      </p>
    </div>
  );
}

/** 7-day AQI line chart — live WAQI forecast when available */
export default function AQIChart({
  city = APP_CITY,
  forecast,
  loading = false,
}: AQIChartProps) {
  const data = forecast?.length ? buildChartData(forecast) : [];
  const values = data.map((d) => d.aqi);
  const maxAqi = Math.max(...(values.length ? values : [0]), HAZARDOUS_THRESHOLD + 20, 350);

  return (
    <article className="vital-card p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-vital-primary" aria-hidden />
          <div>
            <h2 className="font-semibold text-vital-text">7-day AQI trend</h2>
            <p className="text-sm text-vital-muted">
              {city}
              {forecast?.length ? " · Live forecast (WAQI)" : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-vital-muted">
          <span className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-4 rounded"
              style={{ backgroundColor: PRIMARY }}
            />
            AQI level
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-3 w-4 rounded-sm"
              style={{ backgroundColor: DANGER_FILL, border: `1px solid ${DANGER}40` }}
            />
            Unhealthy (150+)
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-3 w-4 rounded-sm"
              style={{ backgroundColor: HAZARD_FILL, border: `1px solid ${DANGER}66` }}
            />
            Hazardous (200+)
          </span>
        </div>
      </header>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-sm text-vital-muted sm:h-72">
          Loading forecast…
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-vital-muted sm:h-72">
          Forecast data unavailable
        </div>
      ) : (
        <div className="h-64 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                stroke="#30363D"
                strokeDasharray="3 3"
                vertical={false}
              />
              <ReferenceArea
                y1={UNHEALTHY_THRESHOLD}
                y2={HAZARDOUS_THRESHOLD}
                fill={DANGER_FILL}
                fillOpacity={1}
                strokeOpacity={0}
              />
              <ReferenceArea
                y1={HAZARDOUS_THRESHOLD}
                y2={maxAqi}
                fill={HAZARD_FILL}
                fillOpacity={1}
                strokeOpacity={0}
              />
              <XAxis
                dataKey="day"
                tick={{ fill: "#8B949E", fontSize: 12 }}
                axisLine={{ stroke: "#30363D" }}
                tickLine={{ stroke: "#30363D" }}
              />
              <YAxis
                domain={[0, maxAqi]}
                tick={{ fill: "#8B949E", fontSize: 12 }}
                axisLine={{ stroke: "#30363D" }}
                tickLine={{ stroke: "#30363D" }}
                width={36}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="aqi"
                stroke={PRIMARY}
                strokeWidth={2.5}
                dot={{ fill: PRIMARY, stroke: "#0D1117", strokeWidth: 2, r: 4 }}
                activeDot={{
                  r: 6,
                  fill: PRIMARY,
                  stroke: "#0D1117",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}
