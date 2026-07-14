"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Info, Languages } from "lucide-react";
import AdviceBulletList from "@/components/ui/AdviceBulletList";
import HealthGuidanceIllustration from "@/components/illustrations/HealthGuidanceIllustration";
import { emojiForHealthItem, parseHealthAdvice } from "@/lib/formatAdvice";

export interface HealthAlertCardProps {
  title?: string;
  message?: string;
  severity?: "info" | "warning" | "critical";
  sourceHint?: string;
}

export default function HealthAlertCard({
  title = "Health advisory",
  message = "",
  severity = "warning",
  sourceHint,
}: HealthAlertCardProps) {
  const parsed = parseHealthAdvice(message);
  const reduce = useReducedMotion();

  const SeverityIcon = severity === "info" ? Info : AlertTriangle;
  const pulseSpeed =
    severity === "critical" ? 1.2 : severity === "warning" ? 1.8 : 0;

  const styles = {
    info: "border-vital-primary/50 bg-vital-primary/8",
    warning: "border-[#f0c040]/50 bg-[#f0c040]/8",
    critical: "border-vital-danger/50 bg-vital-danger/8",
  };

  const iconStyles = {
    info: "text-vital-primary",
    warning: "text-[#f0c040]",
    critical: "text-vital-danger",
  };

  const titleStyles = {
    info: "text-vital-primary",
    warning: "text-[#f0c040]",
    critical: "text-vital-danger",
  };

  return (
    <motion.article
      className={`vital-card flex h-full flex-col border-2 p-5 sm:p-6 ${styles[severity]}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <header className="flex items-start gap-3">
        <motion.span
          className="mt-0.5 shrink-0"
          animate={
            reduce || pulseSpeed === 0
              ? undefined
              : { scale: [1, 1.12, 1], opacity: [0.85, 1, 0.85] }
          }
          transition={{
            duration: pulseSpeed,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <SeverityIcon
            className={`h-6 w-6 ${iconStyles[severity]}`}
            aria-hidden
          />
        </motion.span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-vital-muted">
            Aap ke liye health guidance
          </p>
          <h2 className={`mt-1 text-lg font-bold leading-snug sm:text-xl ${titleStyles[severity]}`}>
            {title}
          </h2>
        </div>
      </header>

      <div className="mt-5 flex-1 space-y-4">
        {!message?.trim() && (
          <HealthGuidanceIllustration className="mx-auto w-full max-w-[280px] opacity-90" />
        )}

        {parsed.summaryUr && (
          <div
            className="rounded-xl border border-vital-primary/35 bg-vital-primary/12 px-4 py-3.5"
            role="note"
          >
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-vital-primary">
              <Languages className="h-3.5 w-3.5" aria-hidden />
              Roman Urdu — short summary
            </div>
            <p className="text-base font-medium leading-relaxed text-vital-text sm:text-[17px]">
              {parsed.summaryUr}
            </p>
          </div>
        )}

        {parsed.summaryEn && (
          <p className="text-sm leading-relaxed text-vital-muted sm:text-[15px]">
            {parsed.summaryEn}
          </p>
        )}

        <div className="mt-4 grid gap-3">
          {parsed.bullets.slice(0, 4).map((bullet, i) => {
            const emoji = emojiForHealthItem(bullet, i);
            const clean = bullet.replace(/^[\s•\-*]+/, "");
            return (
              <div
                key={i}
                className="group flex items-start gap-3 rounded-xl border border-vital-border/60 bg-vital-bg/70 px-4 py-3.5 transition-all duration-300 hover:scale-[1.01] hover:border-vital-primary/40 hover:bg-vital-card hover:shadow-glow-primary"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vital-primary/10 text-lg shadow-inner">
                  {emoji}
                </span>
                <p className="text-[15px] leading-relaxed text-vital-text sm:text-base">
                  {clean}
                </p>
              </div>
            );
          })}
          {parsed.bullets.length === 0 && (
             <p className="text-base text-vital-muted">Route analyze karein — AQI, season aur aap ki health profile ke hisaab se 4 tips yahan aayengi.</p>
          )}
        </div>
      </div>

      {sourceHint && (
        <p className="mt-4 border-t border-vital-border/50 pt-3 text-xs leading-relaxed text-vital-muted">
          {sourceHint}
        </p>
      )}
    </motion.article>
  );
}
