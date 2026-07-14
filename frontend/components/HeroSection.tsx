"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  FileText,
  Gauge,
  MapPin,
  Microscope,
} from "lucide-react";

import { LandingHealthAnimations } from "@/components/animations/HealthMotionGraphics";
import { authLink } from "@/lib/authLinks";

const HERO_STATS = [
  { icon: Bot, title: "4 AI assistants" },
  { icon: Gauge, title: "Risk score 0–100" },
  { icon: FileText, title: "Prescriptions" },
] as const;

const HERO_PILLS = [
  { icon: MapPin, text: "Live air updates" },
  { icon: BarChart3, text: "30-day history" },
  { icon: Microscope, text: "Clear explanations" },
] as const;

/** Static demo AQI shown on the landing hero (no API call). */
const DEMO_AQI = {
  city: "Lahore",
  station: "Lahore",
  value: 142,
  label: "Unhealthy for Sensitive Groups",
  pm25Index: 142,
  pollutant: "PM25",
  updatedLabel: "Live snapshot",
  adviceEn:
    "Sensitive individuals should reduce prolonged outdoor exertion and keep a mask handy.",
  adviceUr:
    "Sensitive log lambi outdoor activity kam karein aur mask saath rakhein.",
} as const;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function HeroSection() {
  const router = useRouter();
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  useEffect(() => {
    router.prefetch("/login");
    router.prefetch("/dashboard");
    router.prefetch("/onboarding");
  }, [router]);

  const isHazardous = DEMO_AQI.value >= 150;

  return (
    <section className="relative pt-24 pb-16 sm:pt-28 sm:pb-24 lg:pb-32">
      <LandingHealthAnimations />
      <motion.div
        className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 1 }}
      />
      <motion.div className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-vital-primary/10 blur-3xl" />

      <motion.div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={item}>
            <motion.div
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-vital-border bg-vital-card px-3 py-1 text-sm text-vital-muted transition-colors duration-300 hover:border-vital-primary/50 hover:bg-vital-primary/10"
              whileHover={{ scale: 1.03 }}
            >
              <MapPin className="h-4 w-4 text-vital-primary" aria-hidden />
              <span>Environmental Health Intelligence · Lahore</span>
            </motion.div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Smarter decisions for{" "}
              <span className="text-gradient-primary">air quality</span>{" "}
              and personal health
            </h1>

            <p className="section-subtitle mt-6 max-w-xl leading-relaxed">
              VitalAir tells you how clean the air is in Lahore, what it means
              for your health, what to eat, and which road is safer to take. It
              remembers your medical history, tracks your exposure over time, and
              explains every suggestion in plain language.
            </p>

            <ul className="mt-5 flex flex-wrap gap-2">
              {HERO_PILLS.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="inline-flex items-center gap-1.5 rounded-full border border-vital-border bg-vital-card/60 px-3 py-1 text-xs text-vital-muted"
                >
                  <Icon className="h-3.5 w-3.5 text-vital-primary" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>

            <motion.div className="mt-8 flex flex-wrap gap-4">
              <motion.div
                className="group"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href={authLink("/onboarding", isAuthenticated, "register")}
                  prefetch
                  className="btn-primary"
                >
                  Get started
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden
                  />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href={authLink("/dashboard", isAuthenticated)}
                  prefetch
                  className="btn-secondary"
                >
                  Open dashboard
                </Link>
              </motion.div>
            </motion.div>

            <ul className="mt-10 grid gap-2 sm:grid-cols-3">
              {HERO_STATS.map(({ icon: Icon, title }) => (
                <motion.li
                  key={title}
                  className="group vital-card-hover flex cursor-default items-center gap-2 rounded-xl border border-vital-border bg-vital-card/50 px-3 py-2.5 sm:px-3.5"
                  whileHover={{ scale: 1.02 }}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-vital-primary/10 transition-colors duration-300 group-hover:bg-vital-primary/25">
                    <Icon className="h-4 w-4 text-vital-primary" aria-hidden />
                  </span>
                  <p className="text-xs font-semibold leading-snug text-vital-text sm:text-sm">
                    {title}
                  </p>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div variants={item} className="w-full lg:justify-self-end z-20">
            <motion.div
              className={`vital-card relative w-full max-w-md overflow-hidden p-6 sm:p-8 backdrop-blur-xl bg-vital-card/80 border-white/10 shadow-2xl ${
                isHazardous ? "shadow-glow-danger" : "shadow-glow-primary"
              }`}
              whileHover={{
                y: -6,
                boxShadow:
                  "0 16px 48px rgba(0, 0, 0, 0.4), 0 0 32px rgba(0, 200, 150, 0.18)",
              }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-vital-muted">Live Lahore AQI</p>
                  <p className="mt-1 text-2xl font-semibold text-vital-text">
                    {DEMO_AQI.city}
                  </p>
                  <p className="text-xs text-vital-muted">
                    WAQI · {DEMO_AQI.station}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    isHazardous
                      ? "bg-vital-danger/15 text-vital-danger"
                      : "bg-vital-primary/15 text-vital-primary"
                  }`}
                >
                  {DEMO_AQI.label}
                </span>
              </div>

              <p
                className={`mt-6 text-7xl font-bold tabular-nums tracking-tight ${
                  isHazardous ? "text-gradient-danger" : "text-gradient-primary"
                }`}
              >
                {DEMO_AQI.value}
              </p>

              <p className="mt-2 text-sm text-vital-muted">
                PM2.5 index {DEMO_AQI.pm25Index} · Main pollutant:{" "}
                {DEMO_AQI.pollutant}
              </p>
              <p className="mt-1 text-xs text-vital-muted">
                {DEMO_AQI.updatedLabel}
              </p>

              <motion.div
                className="mt-6 h-2 overflow-hidden rounded-full bg-vital-border"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                style={{ originX: 0 }}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-vital-primary via-[#f0c040] to-vital-danger"
                  style={{ width: `${Math.min(DEMO_AQI.value / 3, 100)}%` }}
                />
              </motion.div>

              <p className="mt-4 text-sm text-vital-muted">{DEMO_AQI.adviceEn}</p>
              <p className="mt-1 text-xs text-vital-muted/80">
                {DEMO_AQI.adviceUr}
              </p>

              <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-vital-muted">
                Enter your route on the dashboard to get health tips and safer
                road options for today.
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
