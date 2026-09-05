"use client";

import { useState } from "react";
import {
  AlertTriangle,
  MapPin,
  Newspaper,
  Radio,
  Route,
  Navigation,
  Languages,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import NavigateRouteLinks from "@/components/map/NavigateRouteLinks";
import { aqiLabel } from "@/lib/aqi";
import { getLahoreSeason } from "@/lib/lahoreSeason";

export interface RouteOption {
  rank: number;
  label: string;
  distance: string;
  duration?: string;
  avg_aqi: number;
  exposure: string;
  waypoints: string[];
  via_areas: string[];
  recommendation?: string;
}

export interface RouteCardProps {
  from?: string;
  to?: string;
  routeOptions?: RouteOption[];
  avoidAreas?: string[];
  roadNews?: string[];
  seasonFocus?: string;
  emptyMessage?: string;
}

function aqiBadgeClass(aqi: number): string {
  if (aqi >= 200) return "bg-red-500/15 text-red-500 border-red-500/40";
  if (aqi >= 150) return "bg-orange-500/15 text-orange-400 border-orange-500/40";
  if (aqi >= 100) return "bg-amber-500/15 text-amber-400 border-amber-500/40";
  return "bg-emerald-500/15 text-emerald-400 border-emerald-500/40";
}

export default function RouteCard({
  from,
  to,
  routeOptions = [],
  avoidAreas = [],
  roadNews = [],
  seasonFocus,
  emptyMessage = "Enter source and destination, then tap Analyze.",
}: RouteCardProps) {
  const [lang, setLang] = useState<"en" | "ur">("en");
  const isUr = lang === "ur";

  const hasRoute = Boolean(from && to && routeOptions.length > 0);

  // Strictly sort routes by rank (Rank 1, Rank 2, Rank 3)
  const sortedOptions = [...routeOptions].sort((a, b) => (a.rank || 0) - (b.rank || 0));

  const activeSeason = getLahoreSeason();
  const alertTitle =
    activeSeason.id === "monsoon"
      ? (isUr ? "🌧️ لائیو برسات اور ٹریفک الرٹس (CTPL / WASA)" : "🌧️ Live Monsoon & Road Alerts (CTPL / WASA)")
      : activeSeason.id === "summer_heatwave"
      ? (isUr ? "☀️ لائیو ہیٹ ویو اور ٹریفک الرٹس" : "☀️ Live Heatwave & Traffic Alerts")
      : activeSeason.id === "spring_dust"
      ? (isUr ? "💨 لائیو ڈسٹ اور ٹریفک الرٹس" : "💨 Live Dust & Road Alerts")
      : (isUr ? "🌫️ لائیو سموگ اور موٹروے الرٹس" : "🌫️ Live Smog & Motorway Alerts");

  return (
    <article className="vital-card p-5 sm:p-6 space-y-5">
      {/* Header with Title & Language Switcher */}
      <header className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-vital-border/50">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-vital-bg border border-vital-border shadow-inner text-vital-primary shrink-0">
            <Route className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className={`text-base font-extrabold text-vital-text ${isUr ? "font-['Arial',sans-serif]" : ""}`}>
              {isUr ? "سمارٹ روٹ نیویگیٹر (کم ترین سموگ راستے)" : "Smart Route Suggestions"}
            </h2>
            {hasRoute && (
              <p className="text-xs text-vital-muted font-medium">
                {from} → {to} · {isUr ? "کم ترین فضائی آلودگی کے مطابق ترتیب شدہ 3 راستے" : "3 paths ranked by lowest exposure"}
              </p>
            )}
          </div>
        </div>

        {/* Bilingual Toggle */}
        <div className="inline-flex rounded-lg border border-vital-border/80 bg-vital-bg/90 p-0.5 shadow-inner">
          <button
            type="button"
            onClick={() => setLang("en")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              lang === "en"
                ? "bg-vital-primary text-white shadow-sm"
                : "text-vital-muted hover:text-vital-text"
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLang("ur")}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              lang === "ur"
                ? "bg-vital-primary text-white shadow-sm"
                : "text-vital-muted hover:text-vital-text"
            }`}
          >
            <Languages className="h-3 w-3" />
            اردو
          </button>
        </div>
      </header>

      {/* Live Weather & Traffic News via Serper */}
      {roadNews && roadNews.length > 0 && (
        <div className="rounded-2xl border border-vital-primary/30 bg-vital-primary/5 p-4 shadow-sm animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="relative mt-0.5 shrink-0">
              <Radio className="h-5 w-5 text-vital-primary animate-pulse" aria-hidden />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-vital-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-vital-primary"></span>
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <p className={`text-xs font-extrabold uppercase tracking-wider text-vital-primary ${isUr ? "font-['Arial',sans-serif]" : ""}`}>
                  {alertTitle}
                </p>
                <span className="text-[10px] font-semibold text-vital-muted bg-vital-bg/80 border border-vital-border/60 px-2 py-0.5 rounded-md">
                  Live Scanner
                </span>
              </div>
              <ul className={`mt-2.5 space-y-1.5 ${isUr ? "font-['Arial',sans-serif]" : ""}`} dir={isUr ? "rtl" : "ltr"}>
                {roadNews.slice(0, 3).map((headline, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-vital-text/90 leading-relaxed">
                    <span className="text-vital-primary font-bold mt-0.5 shrink-0">•</span>
                    <span>{headline}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* GPS Direct Navigation Action Bar */}
      {hasRoute && from && to && (
        <div className="rounded-xl border border-vital-border/80 bg-vital-bg/50 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-vital-primary" aria-hidden />
            <span className={`text-xs font-bold text-vital-text ${isUr ? "font-['Arial',sans-serif]" : ""}`}>
              {isUr ? "لائیو جی پی ایس نیویگیشن (مفت):" : "One-Click GPS Navigation (Free):"}
            </span>
          </div>
          <NavigateRouteLinks
            from={from}
            to={to}
            waypoints={sortedOptions[0]?.via_areas}
            variant="compact"
          />
        </div>
      )}

      {/* 3 Sorted Route Cards */}
      {hasRoute ? (
        <div className="space-y-3.5">
          {sortedOptions.map((opt, idx) => {
            const isBest = opt.rank === 1 || idx === 0;

            let rankBadgeEn = "Recommended: Lowest Exposure";
            let rankBadgeUr = "🌿 تجویز کردہ: سب سے کم سموگ";
            if (opt.rank === 2 || idx === 1) {
              rankBadgeEn = "Balanced & Fast Route";
              rankBadgeUr = "⚡ متوازن اور تیز راستہ";
            } else if (opt.rank === 3 || idx === 2) {
              rankBadgeEn = "Alternative Route";
              rankBadgeUr = "🚗 متبادل راستہ";
            }

            return (
              <div
                key={opt.rank || idx}
                className={`group relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-300 hover:shadow-lg ${
                  isBest
                    ? "border-vital-primary/60 bg-vital-primary/5 shadow-glow-primary"
                    : "border-vital-border/80 bg-vital-card/85 hover:border-vital-primary/40"
                }`}
              >
                {/* Top Row: Rank Tag, Label & AQI Badge */}
                <div className="flex flex-wrap items-start justify-between gap-2.5 pb-2.5 border-b border-vital-border/50">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black shadow-sm ${
                        isBest
                          ? "bg-vital-primary text-white"
                          : "bg-vital-bg border border-vital-border text-vital-muted"
                      }`}
                    >
                      {opt.rank || idx + 1}
                    </span>
                    <div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${
                        isBest ? "bg-vital-primary/20 text-vital-primary border border-vital-primary/30" : "bg-vital-bg text-vital-muted border border-vital-border"
                      }`}>
                        {isUr ? rankBadgeUr : rankBadgeEn}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-extrabold ${aqiBadgeClass(opt.avg_aqi)}`}
                      title={aqiLabel(opt.avg_aqi)}
                    >
                      Avg AQI {opt.avg_aqi}
                    </span>
                  </div>
                </div>

                {/* Corridor & Path */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-vital-text group-hover:text-vital-primary transition-colors">
                      {opt.label}
                    </h3>
                  </div>

                  {/* Travel Stats Chips */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-vital-muted">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-vital-bg/80 border border-vital-border/60 px-2.5 py-1">
                      <span>📍</span> {opt.distance}
                    </span>
                    {opt.duration && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-vital-bg/80 border border-vital-border/60 px-2.5 py-1">
                        <Clock className="h-3 w-3 text-vital-primary" /> {opt.duration}
                      </span>
                    )}
                    {opt.exposure && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-vital-bg/80 border border-vital-border/60 px-2.5 py-1 capitalize">
                        <span>🛡️</span> {opt.exposure} exposure
                      </span>
                    )}
                  </div>

                  {/* Waypoints Flow Chain */}
                  {opt.waypoints.length > 0 && (
                    <div className="rounded-xl bg-vital-bg/60 border border-vital-border/50 p-2.5 text-xs text-vital-text flex flex-wrap items-center gap-1.5 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-vital-primary shrink-0" />
                      {opt.waypoints.map((wp, wIdx) => (
                        <span key={wIdx} className="inline-flex items-center gap-1">
                          <span className={wIdx === 0 || wIdx === opt.waypoints.length - 1 ? "font-bold text-vital-text" : "text-vital-muted"}>
                            {wp}
                          </span>
                          {wIdx < opt.waypoints.length - 1 && (
                            <ChevronRight className="h-3 w-3 text-vital-primary shrink-0" />
                          )}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Recommendation Note */}
                  {opt.recommendation && (
                    <p className={`text-xs text-vital-muted italic pt-1 ${isUr ? "font-['Arial',sans-serif]" : ""}`}>
                      💡 {opt.recommendation}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-vital-muted text-center py-6">{emptyMessage}</p>
      )}
    </article>
  );
}
