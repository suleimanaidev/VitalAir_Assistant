"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Info,
  Languages,
  ShieldAlert,
  HeartPulse,
  Home,
  Clock,
  Pill,
  Activity,
  Copy,
  Check,
  Stethoscope,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import HealthGuidanceIllustration from "@/components/illustrations/HealthGuidanceIllustration";
import { parseHealthAdvice, type ClinicalPillar } from "@/lib/formatAdvice";
import type { HealthProfile } from "@/store/useVitalAirStore";

export interface HealthAlertCardProps {
  title?: string;
  message?: string;
  severity?: "info" | "warning" | "critical";
  sourceHint?: string;
  aqi?: number;
  profile?: HealthProfile;
  conditions?: string[];
  seasonLabel?: string;
  hasPatientDocs?: boolean;
}

export default function HealthAlertCard({
  title = "Clinical Health Advisory",
  message = "",
  severity = "warning",
  sourceHint,
  aqi = 109,
  profile,
  conditions = [],
  seasonLabel,
  hasPatientDocs,
}: HealthAlertCardProps) {
  const parsed = parseHealthAdvice(message, aqi);
  const reduce = useReducedMotion();

  const [lang, setLang] = useState<"en" | "ur">("en");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = `[VitalAir Health Advisory - AQI ${aqi}]\n${title}\n\nKey Guidance:\n${parsed.bullets.map((b) => `• ${b}`).join("\n")}\n\n${sourceHint || "WHO Respiratory & Air Quality Standards"}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const activeConditions =
    conditions.length > 0
      ? conditions
      : profile?.conditions && profile.conditions.length > 0
        ? profile.conditions
        : ["General Respiratory Care"];

  const SeverityIcon = severity === "info" ? Info : AlertTriangle;
  const pulseSpeed =
    severity === "critical" ? 1.2 : severity === "warning" ? 1.8 : 0;

  const styles = {
    info: "border-vital-primary/40 bg-gradient-to-b from-vital-primary/10 via-vital-bg to-vital-card",
    warning: "border-[#f0c040]/40 bg-gradient-to-b from-[#f0c040]/10 via-vital-bg to-vital-card",
    critical: "border-vital-danger/50 bg-gradient-to-b from-vital-danger/12 via-vital-bg to-vital-card",
  };

  const badgeStyles = {
    info: "bg-vital-primary/15 text-vital-primary border-vital-primary/30",
    warning: "bg-[#f0c040]/15 text-[#f0c040] border-[#f0c040]/30",
    critical: "bg-vital-danger/15 text-vital-danger border-vital-danger/40 animate-pulse",
  };

  const iconStyles = {
    info: "text-vital-primary",
    warning: "text-[#f0c040]",
    critical: "text-vital-danger",
  };

  const renderPillarIcon = (category: ClinicalPillar["category"]) => {
    switch (category) {
      case "airway":
        return <ShieldAlert className="h-5 w-5 text-emerald-500" />;
      case "cardio":
        return <HeartPulse className="h-5 w-5 text-rose-500" />;
      case "indoor":
        return <Home className="h-5 w-5 text-sky-500" />;
      case "medication":
        return <Pill className="h-5 w-5 text-purple-500" />;
      case "timing":
        return <Clock className="h-5 w-5 text-amber-500" />;
      default:
        return <Activity className="h-5 w-5 text-vital-primary" />;
    }
  };

  return (
    <motion.article
      className={`vital-card flex h-full flex-col border-2 p-5 sm:p-7 shadow-xl backdrop-blur-md ${styles[severity]}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Top Clinical Header Bar */}
      <header className="flex flex-col gap-3 pb-4 border-b border-vital-border/60">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-vital-primary/20 text-vital-primary">
              <Stethoscope className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-vital-primary">
              Digital Pulmonologist · Health &amp; Smog Safety
            </span>
          </div>

          <div className="flex items-center gap-2">
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

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              title="Copy advisory"
              className="flex items-center gap-1 rounded-lg border border-vital-border/80 bg-vital-bg/90 px-2.5 py-1 text-xs font-medium text-vital-muted hover:border-vital-primary/50 hover:text-vital-primary transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Advisory Title & Alert Level */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-start gap-3">
            <motion.span
              className="mt-1 shrink-0"
              animate={
                reduce || pulseSpeed === 0
                  ? undefined
                  : { scale: [1, 1.15, 1], opacity: [0.85, 1, 0.85] }
              }
              transition={{
                duration: pulseSpeed,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <SeverityIcon className={`h-6 w-6 ${iconStyles[severity]}`} />
            </motion.span>
            <div>
              <h2 className="text-lg font-black tracking-tight text-vital-text sm:text-xl leading-snug">
                {title}
              </h2>
              <p className="mt-0.5 text-xs text-vital-muted flex items-center gap-1.5 font-medium">
                <span>AQI Baseline: <strong className="text-vital-text">{aqi}</strong></span>
                <span>•</span>
                <span>Season: <strong className="text-vital-text">{seasonLabel || "Lahore Environmental Profile"}</strong></span>
                {hasPatientDocs && (
                  <>
                    <span>•</span>
                    <span className="text-vital-primary font-bold">📄 Patient Docs Indexed</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${badgeStyles[severity]}`}
            >
              {parsed.triageLevel.toUpperCase()} RISK
            </span>
          </div>
        </div>

        {/* Patient Vulnerability Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-vital-muted mr-1">
            Health Focus:
          </span>
          {activeConditions.map((cond, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-400 capitalize shadow-sm"
            >
              <HeartPulse className="h-3 w-3 text-rose-500" />
              {cond}
            </span>
          ))}
          {profile?.sensitivity && (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-400 capitalize shadow-sm">
              <Activity className="h-3 w-3 text-amber-500" />
              {profile.sensitivity} Sensitivity
            </span>
          )}
          {profile?.commuteMode && (
            <span className="inline-flex items-center gap-1 rounded-md border border-vital-border bg-vital-card/80 px-2 py-0.5 text-[11px] font-medium text-vital-muted capitalize">
              Commute: {profile.commuteMode.replace("_", " ")}
            </span>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="mt-5 flex-1 space-y-5">
        {!message?.trim() && (
          <HealthGuidanceIllustration className="mx-auto w-full max-w-[280px] opacity-90" />
        )}

        {/* Bilingual Summary Banner */}
        {lang === "ur" && parsed.summaryUr && (
          <div
            className="rounded-2xl border border-vital-primary/40 bg-vital-primary/10 px-4 py-3.5 shadow-sm font-['Arial',sans-serif]"
            role="note"
            dir="rtl"
          >
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-vital-primary">
              <Languages className="h-3.5 w-3.5" />
              اہم طبی رہنمائی (Clinical Brief)
            </div>
            <p className="text-base font-semibold leading-relaxed text-vital-text">
              {parsed.summaryUr}
            </p>
          </div>
        )}

        {lang === "en" && parsed.summaryEn && (
          <div className="rounded-2xl border border-vital-border/80 bg-vital-bg/60 p-3.5 shadow-inner">
            <p className="text-sm font-medium leading-relaxed text-vital-text sm:text-[15px]">
              {parsed.summaryEn}
            </p>
          </div>
        )}

        {/* 4 Clinical Precautions Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {parsed.pillars.map((pillar, i) => {
            const currentDetails =
              lang === "ur" && pillar.detailsUr && pillar.detailsUr.length > 0
                ? pillar.detailsUr
                : pillar.details;

            return (
              <div
                key={pillar.id || i}
                className="flex flex-col justify-between rounded-2xl border border-vital-border/80 bg-vital-card/95 p-4 sm:p-5 transition-all duration-300 hover:border-vital-primary/50 hover:shadow-lg"
              >
                <div>
                  {/* Category Header */}
                  <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-vital-border/50">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-vital-bg border border-vital-border shadow-inner shrink-0">
                        {renderPillarIcon(pillar.category)}
                      </span>
                      <div>
                        <h3 className={`text-[13px] font-extrabold uppercase tracking-wide text-vital-text ${lang === "ur" ? "font-['Arial',sans-serif]" : ""}`}>
                          {lang === "ur" ? pillar.titleUr : pillar.title}
                        </h3>
                      </div>
                    </div>
                    <span className="rounded-full bg-vital-primary/10 border border-vital-primary/25 px-2.5 py-0.5 text-[10px] font-extrabold text-vital-primary whitespace-nowrap shrink-0">
                      {pillar.badge}
                    </span>
                  </div>

                  {/* 3 Detailed Ehtiyat & Actionable Checklist */}
                  {currentDetails && currentDetails.length > 0 && (
                    <div className={`rounded-xl bg-vital-bg/70 border border-vital-border/60 p-3 space-y-2 ${lang === "ur" ? "font-['Arial',sans-serif]" : ""}`} dir={lang === "ur" ? "rtl" : "ltr"}>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-vital-muted flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-vital-primary shrink-0" />
                        <span>{lang === "ur" ? "ضروری احتیاطی تدابیر (3 اہم نکات)" : "Key Precautions (3 Action Items)"}</span>
                      </div>
                      <ul className="space-y-2 text-xs sm:text-[13px] text-vital-text leading-relaxed">
                        {currentDetails.slice(0, 3).map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-vital-primary font-bold mt-0.5 shrink-0">•</span>
                            <span className="flex-1">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {parsed.pillars.length === 0 && (
            <p className="text-base text-vital-muted col-span-2 text-center py-6">
              Select an area and click &quot;Get personal health advice&quot; to generate real-time pulmonology recommendations.
            </p>
          )}
        </div>
      </div>

      {/* Footer Standards */}
      {sourceHint && (
        <footer className="mt-5 border-t border-vital-border/50 pt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-vital-muted">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-vital-primary" />
            {sourceHint}
          </span>
        </footer>
      )}
    </motion.article>
  );
}
