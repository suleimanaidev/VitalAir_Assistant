"use client";

import { motion, useReducedMotion } from "framer-motion";

const FLOATERS = [
  { text: "Diet Planner", icon: "🥗", left: "78%", top: "10%", delay: 0.4 },
  { text: "Safe Routes", icon: "🗺️", left: "82%", top: "68%", delay: 0.8 },
] as const;

export function BreathingLungs({
  className = "",
  size = 80,
}: {
  className?: string;
  size?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      animate={reduce ? undefined : { scale: [1, 1.1, 1] }}
      transition={
        reduce
          ? undefined
          : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
      }
      aria-hidden
    >
      <svg
        width={size}
        height={size * 0.65}
        viewBox="0 0 120 78"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M38 28 Q22 38 24 58 Q26 72 38 68 Q44 52 44 38 Q44 28 38 28 Z"
          fill="rgba(0,200,150,0.25)"
          stroke="#00c896"
          strokeWidth="2"
        />
        <path
          d="M82 28 Q98 38 96 58 Q94 72 82 68 Q76 52 76 38 Q76 28 82 28 Z"
          fill="rgba(0,200,150,0.25)"
          stroke="#00c896"
          strokeWidth="2"
        />
        <rect x="54" y="26" width="12" height="42" rx="4" fill="#484f58" />
        <path
          d="M8 40 H24 M96 40 H112"
          stroke="#00c896"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    </motion.div>
  );
}

export function HeartbeatLine({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <svg
      className={`health-ekg ${className}`}
      viewBox="0 0 200 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <motion.path
        d="M0 20 H40 L48 20 L54 8 L62 32 L70 20 H200"
        stroke="#00c896"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0.4 }}
        animate={
          reduce
            ? { pathLength: 1, opacity: 0.7 }
            : { pathLength: [0, 1, 1], opacity: [0.4, 0.9, 0.6] }
        }
        transition={
          reduce
            ? { duration: 0.3 }
            : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
        }
      />
    </svg>
  );
}

export function FloatingHealthIcons() {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <>
      {FLOATERS.map(({ text, icon, left, top, delay }) => (
        <motion.div
          key={`${text}-${left}`}
          className="pointer-events-none absolute hidden select-none items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 shadow-xl backdrop-blur-md md:flex z-10"
          style={{ left, top }}
          initial={{ opacity: 0, y: 15 }}
          animate={{
            opacity: [0.6, 1, 0.6],
            y: [0, -15, 0],
          }}
          transition={{
            duration: 5 + delay,
            repeat: Infinity,
            delay,
            ease: "easeInOut",
          }}
          aria-hidden
        >
          <span className="text-xl">{icon}</span>
          <span className="text-sm font-medium text-white/90 drop-shadow-sm">{text}</span>
        </motion.div>
      ))}
    </>
  );
}

/** Landing hero — floating health icons + breathing lungs */
export function LandingHealthAnimations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <FloatingHealthIcons />
      <motion.div
        className="absolute right-[8%] top-[22%] hidden opacity-30 md:block lg:right-[12%]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.35 }}
        transition={{ delay: 0.6, duration: 1 }}
      >
        <BreathingLungs size={100} />
      </motion.div>
      <motion.div
        className="absolute bottom-[18%] left-[6%] hidden w-40 opacity-50 lg:block"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 0.55, x: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      >
        <HeartbeatLine className="w-full" />
      </motion.div>
    </div>
  );
}


function stripMessage(
  aqi?: number | null,
  seasonLabel?: string,
  tempC?: number
): { headline: string; detail: string } {
  const temp = tempC != null ? `${Math.round(tempC)}°C` : null;
  const season = seasonLabel?.replace(/\s*\/\s*heatwave/i, "").trim();

  if (aqi == null) {
    return {
      headline: "Lahore health monitor",
      detail: "Route analyze karein — live tips yahan aayengi",
    };
  }

  if (aqi <= 50) {
    return {
      headline: "Aaj hawa achi hai",
      detail: [`AQI ${aqi} · Good`, temp, season].filter(Boolean).join(" · "),
    };
  }

  if (aqi <= 100) {
    return {
      headline: "Hawa theek hai — normal ehtiyaat",
      detail: [`AQI ${aqi} · Moderate`, temp, season].filter(Boolean).join(" · "),
    };
  }

  if (aqi <= 150) {
    return {
      headline: "Sensitive log extra ehtiyaat karein",
      detail: [`AQI ${aqi}`, temp, season].filter(Boolean).join(" · "),
    };
  }

  return {
    headline: "Aaj hawa kharab hai",
    detail: [`AQI ${aqi} · mask zaroori`, temp, season].filter(Boolean).join(" · "),
  };
}

/** Dashboard top strip — contextual status (no noisy rotation) */
export function DashboardHealthStrip({
  aqi,
  seasonLabel,
  tempC,
}: {
  aqi?: number | null;
  seasonLabel?: string;
  tempC?: number;
}) {
  const reduce = useReducedMotion();
  const { headline, detail } = stripMessage(aqi, seasonLabel, tempC);

  return (
    <motion.div
      className="relative mb-6 overflow-hidden rounded-xl border border-vital-primary/25 bg-vital-card/90 px-4 py-3.5 sm:px-5 sm:py-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="relative flex items-center gap-3 sm:gap-4">
        <motion.div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vital-primary/12 text-lg"
          animate={reduce ? undefined : { scale: [1, 1.04, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          {aqi != null && aqi <= 100 ? "✓" : "🫁"}
        </motion.div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-vital-text sm:text-base">
            {headline}
          </p>
          <p className="mt-0.5 text-xs text-vital-muted sm:text-sm">{detail}</p>
        </div>
      </div>
    </motion.div>
  );
}

export const cardReveal = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" },
  }),
};
