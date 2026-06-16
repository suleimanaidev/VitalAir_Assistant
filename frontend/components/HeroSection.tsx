"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  FileText,
  Gauge,
  Loader2,
  MapPin,
  Microscope,
} from "lucide-react";

import { aqiHealthHint, formatAqiUpdated, type LiveAqiPayload } from "@/lib/aqi";

const HERO_STATS = [
  { icon: Bot, label: "Smart assistants", value: "4 working together" },
  { icon: Gauge, label: "Your risk score", value: "Easy 0–100" },
  { icon: FileText, label: "Your prescriptions", value: "Upload & use" },
] as const;

const HERO_PILLS = [
  { icon: MapPin, text: "Live air updates" },
  { icon: BarChart3, text: "30-day history" },
  { icon: Microscope, text: "Clear explanations" },
] as const;

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
  const [aqi, setAqi] = useState<LiveAqiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/aqi", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("AQI unavailable");
        return res.json() as Promise<LiveAqiPayload>;
      })
      .then((data) => {
        if (!cancelled) setAqi(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load AQI");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = aqi?.aqi ?? null;
  const isHazardous = value != null && value >= 150;

  return (
    <section className="relative pt-24 pb-16 sm:pt-28 sm:pb-24 lg:pb-32">
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
                <Link href="/onboarding" className="btn-primary">
                  Get started
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden
                  />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link href="/dashboard" className="btn-secondary">
                  Open dashboard
                </Link>
              </motion.div>
            </motion.div>

            <ul className="mt-10 grid gap-4 sm:grid-cols-3">
              {HERO_STATS.map(({ icon: Icon, label, value: statVal }) => (
                <motion.li
                  key={label}
                  className="group vital-card-hover flex cursor-default items-center gap-3 rounded-lg border border-vital-border bg-vital-card/50 px-4 py-3"
                  whileHover={{ scale: 1.02 }}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-vital-primary/10 transition-colors duration-300 group-hover:bg-vital-primary/25">
                    <Icon className="h-5 w-5 text-vital-primary" aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs text-vital-muted">{label}</p>
                    <p className="font-medium text-vital-text">{statVal}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div variants={item} className="lg:justify-self-end">
            <motion.div
              className={`vital-card w-full max-w-md p-6 glow-primary ${
                isHazardous ? "shadow-glow-danger" : ""
              }`}
              whileHover={{
                y: -6,
                boxShadow:
                  "0 16px 48px rgba(0, 0, 0, 0.4), 0 0 32px rgba(0, 200, 150, 0.18)",
              }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
            >
              <div className="flex items-start justify-between">
                <motion.div>
                  <p className="text-sm text-vital-muted">Live Lahore AQI</p>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={aqi?.city ?? "loading"}
                      className="mt-1 text-2xl font-semibold text-vital-text"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25 }}
                    >
                      {aqi?.city ?? "Lahore"}
                    </motion.p>
                  </AnimatePresence>
                  <p className="text-xs text-vital-muted">
                    WAQI · {aqi?.station ?? "Pakistan"}
                  </p>
                </motion.div>
                {loading ? (
                  <Loader2
                    className="h-5 w-5 animate-spin text-vital-primary"
                    aria-label="Loading air quality"
                  />
                ) : (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      isHazardous
                        ? "bg-vital-danger/15 text-vital-danger"
                        : "bg-vital-primary/15 text-vital-primary"
                    }`}
                  >
                    {aqi?.label ?? "—"}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="mt-10 flex min-h-[120px] items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-vital-primary" />
                </div>
              ) : error ? (
                <p className="mt-6 text-sm text-vital-danger" role="alert">
                  {error}
                </p>
              ) : (
                <>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={`aqi-${aqi?.city}`}
                      className={`mt-6 text-7xl font-bold tabular-nums ${
                        isHazardous
                          ? "text-vital-danger"
                          : "text-vital-primary"
                      }`}
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ type: "spring", stiffness: 260 }}
                    >
                      {value}
                    </motion.p>
                  </AnimatePresence>

                  <p className="mt-2 text-sm text-vital-muted">
                    {aqi?.pm25_index ?? aqi?.pm25
                      ? `PM2.5 index ${aqi.pm25_index ?? aqi.pm25}`
                      : ""}
                    {aqi?.dominent
                      ? ` · Main pollutant: ${aqi.dominent.toUpperCase()}`
                      : ""}
                  </p>
                  <p className="mt-1 text-xs text-vital-muted">
                    {aqi?.updated_at
                      ? formatAqiUpdated(
                          aqi.updated_at,
                          aqi.station_reported_at
                        )
                      : "Live WAQI reading"}
                  </p>

                  <motion.div
                    className="mt-6 h-2 overflow-hidden rounded-full bg-vital-border"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    style={{ originX: 0 }}
                  >
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-vital-primary via-[#f0c040] to-vital-danger"
                      style={{
                        width: `${Math.min((value ?? 0) / 3, 100)}%`,
                      }}
                    />
                  </motion.div>

                  <p className="mt-4 text-sm text-vital-muted">
                    {value != null
                      ? aqi?.health_advice_en ?? aqiHealthHint(value)
                      : ""}
                  </p>
                  {aqi?.health_advice_ur && (
                    <p className="mt-1 text-xs text-vital-muted/80">
                      {aqi.health_advice_ur}
                    </p>
                  )}

                  <p className="mt-4 border-t border-vital-border/50 pt-3 text-xs text-vital-muted">
                    Enter your route on the dashboard to get health tips and
                    safer road options for today.
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
