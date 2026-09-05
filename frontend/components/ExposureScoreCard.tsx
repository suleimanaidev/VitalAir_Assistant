"use client";

import { useState } from "react";
import { Activity, Languages, ShieldAlert, Sparkles, Navigation, HeartPulse, HelpCircle } from "lucide-react";

export interface PesBreakdown {
  aqi_component: number;
  distance_component: number;
  commute_component: number;
  health_component: number;
}

export interface PersonalExposureScore {
  score: number;
  level: string;
  level_label: string;
  emoji: string;
  aqi: number;
  aqi_label: string;
  commute_mode: string;
  commute_label: string;
  commute_factor: number;
  health_flags: string[];
  health_factor: number;
  distance_km: number;
  distance_label: string;
  recommendation: string;
  breakdown: PesBreakdown;
}

const LEVEL_STYLES: Record<string, { badge: string; bg: string; text: string; labelUr: string }> = {
  low: {
    badge: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
    bg: "border-emerald-500/30 bg-emerald-500/5",
    text: "text-emerald-400",
    labelUr: "کم خطرہ (Low Risk)",
  },
  moderate: {
    badge: "border-amber-500/40 bg-amber-500/15 text-amber-400",
    bg: "border-amber-500/30 bg-amber-500/5",
    text: "text-amber-400",
    labelUr: "درمیانہ خطرہ (Moderate Exposure)",
  },
  high: {
    badge: "border-orange-500/40 bg-orange-500/15 text-orange-400",
    bg: "border-orange-500/30 bg-orange-500/5",
    text: "text-orange-400",
    labelUr: "زیادہ خطرہ (High Exposure Alert)",
  },
  critical: {
    badge: "border-red-500/40 bg-red-500/15 text-red-400",
    bg: "border-red-500/30 bg-red-500/5",
    text: "text-red-400",
    labelUr: "انتہائی خطرناک (Critical Health Hazard)",
  },
};

export default function ExposureScoreCard({
  pes,
}: {
  pes: PersonalExposureScore;
}) {
  const [lang, setLang] = useState<"en" | "ur">("en");
  const isUr = lang === "ur";

  const config = LEVEL_STYLES[pes.level] || LEVEL_STYLES.moderate;
  const scorePercent = Math.min(Math.max(pes.score, 0), 100);

  return (
    <article className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${config.bg} bg-vital-card/90 shadow-md backdrop-blur-md`}>
      {/* Header with Title & Language Switcher */}
      <header className="flex flex-wrap items-start justify-between gap-3 pb-3.5 border-b border-vital-border/50">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-vital-bg border border-vital-border shadow-inner text-vital-primary shrink-0">
            <Activity className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className={`text-base font-extrabold text-vital-text ${isUr ? "font-['Arial',sans-serif]" : ""}`}>
              {isUr ? "ذاتی فضائی خطرہ (Personal Exposure Score)" : "Personal Exposure Score"}
            </h2>
            <p className={`text-xs text-vital-muted ${isUr ? "font-['Arial',sans-serif]" : ""}`}>
              {isUr ? "صحت کے پروفائل، فاصلے اور سفری ذریعے پر مبنی سائنسی اسکور" : "Multi-factor exposure risk beyond raw AQI"}
            </p>
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

      {/* Main Score Visual Meter */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl bg-vital-bg/60 border border-vital-border/60 p-4">
        <div className="flex-1 w-full space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-vital-text flex items-center gap-1.5">
              <span>{pes.emoji}</span>
              <span>{isUr ? "آج آپ کا متوقع فضائی خطرہ:" : "Your commute exposure today:"}</span>
            </span>
            <span className={`font-extrabold uppercase px-2.5 py-0.5 rounded-full border text-[11px] ${config.badge}`}>
              {isUr ? config.labelUr : pes.level_label}
            </span>
          </div>

          {/* Visual Progress Bar */}
          <div className="h-3.5 w-full overflow-hidden rounded-full bg-vital-bg border border-vital-border/80 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                scorePercent > 66
                  ? "bg-gradient-to-r from-amber-500 to-red-500"
                  : scorePercent > 33
                  ? "bg-gradient-to-r from-emerald-500 to-amber-500"
                  : "bg-gradient-to-r from-emerald-400 to-teal-500"
              }`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-semibold text-vital-muted">
            <span>0 (Minimal Risk)</span>
            <span>50 (Moderate)</span>
            <span>100 (Critical Hazard)</span>
          </div>
        </div>

        {/* Big Score Display */}
        <div className="flex sm:flex-col items-center sm:items-end justify-center shrink-0 pl-2 sm:border-l border-vital-border/50">
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-black tabular-nums tracking-tight ${config.text}`}>
              {pes.score}
            </span>
            <span className="text-sm font-bold text-vital-muted">/100</span>
          </div>
          <span className="text-[11px] font-medium text-vital-muted mt-0.5">Exposure Index</span>
        </div>
      </div>

      {/* 4 Factor Breakdown Chips */}
      <dl className="mt-4 grid gap-2.5 text-xs sm:grid-cols-2">
        <div className="rounded-xl border border-vital-border/70 bg-vital-card/80 p-3 shadow-sm">
          <dt className="text-[11px] font-bold text-vital-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            <span>🌫️</span>
            <span>{isUr ? "فضائی آلودگی (Live AQI)" : "Ambient Air Quality (AQI)"}</span>
          </dt>
          <dd className="font-extrabold text-vital-text text-sm">
            {pes.aqi} <span className="text-xs font-normal text-vital-muted">({pes.aqi_label})</span>
          </dd>
        </div>

        <div className="rounded-xl border border-vital-border/70 bg-vital-card/80 p-3 shadow-sm">
          <dt className="text-[11px] font-bold text-vital-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            <span>📍</span>
            <span>{isUr ? "سفری فاصلہ (Travel Distance)" : "Route Distance"}</span>
          </dt>
          <dd className="font-extrabold text-vital-text text-sm">
            {pes.distance_label} <span className="text-xs font-normal text-vital-muted">({pes.distance_km} km)</span>
          </dd>
        </div>

        <div className="rounded-xl border border-vital-border/70 bg-vital-card/80 p-3 shadow-sm">
          <dt className="text-[11px] font-bold text-vital-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            <span>🚗</span>
            <span>{isUr ? "سفری ذریعہ (Commute Vehicle)" : "Commute Mode Protection"}</span>
          </dt>
          <dd className="font-extrabold text-vital-text text-sm">
            {pes.commute_label}
          </dd>
        </div>

        <div className="rounded-xl border border-vital-border/70 bg-vital-card/80 p-3 shadow-sm">
          <dt className="text-[11px] font-bold text-vital-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            <span>🩺</span>
            <span>{isUr ? "صحت کی حساسیت (Health Sensitivity)" : "Health Risk Modifiers"}</span>
          </dt>
          <dd className="font-extrabold text-vital-text text-sm truncate">
            {pes.health_flags.length > 0 ? pes.health_flags.join(" · ") : "Standard Baseline"}
          </dd>
        </div>
      </dl>

      {/* Action Recommendation Tip */}
      <div
        className={`mt-4 rounded-xl border p-3.5 text-xs sm:text-[13px] leading-relaxed ${
          pes.level === "high" || pes.level === "critical"
            ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
            : "border-vital-primary/30 bg-vital-primary/10 text-vital-text"
        } ${isUr ? "font-['Arial',sans-serif]" : ""}`}
        dir={isUr ? "rtl" : "ltr"}
      >
        <span className="font-extrabold text-vital-primary mr-1">
          {isUr ? "💡 اہم سفری مشورہ: " : "💡 Personalized Route Tip: "}
        </span>
        <span>{pes.recommendation}</span>
      </div>

      {/* Scientific Formula Breakdown Dropdown */}
      <details className="mt-3 text-xs text-vital-muted group">
        <summary className="cursor-pointer hover:text-vital-text font-semibold flex items-center gap-1 transition-colors">
          <HelpCircle className="h-3.5 w-3.5 text-vital-primary" />
          <span>Scientific PES Weighted Formula Breakdown</span>
        </summary>
        <div className="mt-2.5 rounded-xl border border-vital-border/60 bg-vital-bg/50 p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="rounded-lg bg-vital-card/60 p-2 border border-vital-border/40">
            <span className="block text-[10px] text-vital-muted uppercase font-bold">AQI Weight (40%)</span>
            <span className="text-sm font-extrabold text-vital-primary">+{pes.breakdown.aqi_component} pts</span>
          </div>
          <div className="rounded-lg bg-vital-card/60 p-2 border border-vital-border/40">
            <span className="block text-[10px] text-vital-muted uppercase font-bold">Distance (25%)</span>
            <span className="text-sm font-extrabold text-vital-primary">+{pes.breakdown.distance_component} pts</span>
          </div>
          <div className="rounded-lg bg-vital-card/60 p-2 border border-vital-border/40">
            <span className="block text-[10px] text-vital-muted uppercase font-bold">Commute (20%)</span>
            <span className="text-sm font-extrabold text-vital-primary">+{pes.breakdown.commute_component} pts</span>
          </div>
          <div className="rounded-lg bg-vital-card/60 p-2 border border-vital-border/40">
            <span className="block text-[10px] text-vital-muted uppercase font-bold">Health Profile (15%)</span>
            <span className="text-sm font-extrabold text-vital-primary">+{pes.breakdown.health_component} pts</span>
          </div>
        </div>
      </details>
    </article>
  );
}
