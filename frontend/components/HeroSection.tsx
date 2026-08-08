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
  HeartPulse,
  MapPin,
  Microscope,
  Navigation,
  Sparkles,
  Zap,
} from "lucide-react";

import { LandingHealthAnimations } from "@/components/animations/HealthMotionGraphics";
import { authLink } from "@/lib/authLinks";

const HERO_PILLS = [
  { icon: MapPin, text: "Live WAQI Lahore Feeds" },
  { icon: Bot, text: "Personalized RAG Health AI" },
  { icon: Navigation, text: "Low-AQI Safe Route Navigation" },
  { icon: Microscope, text: "WHO & Doctor Guidelines" },
] as const;

/** Static demo AQI shown on the landing hero. */
const DEMO_AQI = {
  city: "Lahore",
  station: "Civil Secretariat",
  value: 126,
  label: "Unhealthy for Sensitive Groups",
  pm25Index: 126,
  pollutant: "PM2.5",
  adviceUr: "Sensitive groups (Asthma/Heart) outdoor exertion kam karein aur N95 mask istemal karein.",
} as const;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
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

  return (
    <section className="relative overflow-hidden pt-24 pb-16 sm:pt-28 sm:pb-24 lg:pt-32 lg:pb-32">
      <LandingHealthAnimations />
      
      {/* Ambient Radial Background Glows */}
      <div className="pointer-events-none absolute left-1/2 top-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-vital-primary/12 blur-[120px]" />
      <div className="pointer-events-none absolute left-1/2 top-40 h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-[#FFD700]/8 blur-[100px]" />

      <motion.div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center"
        >
          {/* Top Pill Badge */}
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-vital-primary/30 bg-vital-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-vital-primary shadow-sm backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-vital-primary animate-pulse" aria-hidden />
              AI-Powered Environmental Health &amp; Clean Route Intelligence
            </span>
          </motion.div>

          {/* Powerful & Minimalist Main Headline */}
          <motion.h1
            variants={item}
            className="mt-6 text-4xl font-extrabold tracking-tight text-vital-text sm:text-6xl lg:text-7xl leading-[1.1]"
          >
            Breathe Safer. Live Smarter. <br />
            <span className="text-gradient-primary">
              AI Health Guidance
            </span>{" "}
            for Lahore.
          </motion.h1>

          {/* Clean, Crisp Minimalist Subtitle */}
          <motion.p
            variants={item}
            className="mt-6 max-w-2xl text-base text-vital-muted sm:text-lg leading-relaxed font-normal"
          >
            Real-time air quality tracking, doctor-aware health precautions, anti-pollution nutrition, and clean low-exposure route navigation — tailored for your profile.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            variants={item}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          >
            <Link
              href={authLink("/onboarding", isAuthenticated, "register")}
              prefetch
              className="btn-primary w-full sm:w-auto px-8 py-3.5 text-base font-semibold shadow-lg shadow-vital-primary/25 hover:shadow-vital-primary/40 transition-all"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
            <Link
              href={authLink("/dashboard", isAuthenticated)}
              prefetch
              className="btn-secondary w-full sm:w-auto px-8 py-3.5 text-base font-semibold border-vital-border hover:border-vital-primary/40"
            >
              Open Dashboard
            </Link>
          </motion.div>

          {/* Feature Pills */}
          <motion.ul
            variants={item}
            className="mt-8 flex flex-wrap items-center justify-center gap-2.5"
          >
            {HERO_PILLS.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="inline-flex items-center gap-1.5 rounded-full border border-vital-border/80 bg-vital-card/70 px-3.5 py-1.5 text-xs font-medium text-vital-muted shadow-sm backdrop-blur-md"
              >
                <Icon className="h-3.5 w-3.5 text-vital-primary" aria-hidden />
                {text}
              </li>
            ))}
          </motion.ul>

          {/* Hero Visual Showcase Cards (Centered 3-Column Preview Grid) */}
          <motion.div
            variants={item}
            className="mt-14 w-full grid grid-cols-1 md:grid-cols-3 gap-5 text-left"
          >
            {/* Showcase Card 1: AQI Live Monitor */}
            <div className="vital-card relative overflow-hidden p-5 border-vital-primary/25 bg-vital-card/80 backdrop-blur-xl shadow-xl hover:border-vital-primary/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live AQI Monitor
                </span>
                <span className="text-xs font-semibold text-amber-400">PM2.5</span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-black text-amber-400 tracking-tight">
                  {DEMO_AQI.value}
                </span>
                <span className="text-xs font-semibold text-vital-muted">
                  Unhealthy for Sensitive
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-vital-text">
                <MapPin className="h-3.5 w-3.5 text-vital-primary shrink-0" />
                <span className="font-semibold truncate">📍 Source: {DEMO_AQI.station}</span>
              </div>
            </div>

            {/* Showcase Card 2: AI Health Agent */}
            <div className="vital-card relative overflow-hidden p-5 border-vital-primary/25 bg-vital-card/80 backdrop-blur-xl shadow-xl hover:border-vital-primary/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-vital-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-vital-primary">
                  <HeartPulse className="h-3.5 w-3.5" />
                  VitalAir Assistant
                </span>
                <span className="text-[10px] font-medium text-vital-muted">WHO RAG</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-vital-text line-clamp-3">
                &ldquo;{DEMO_AQI.adviceUr}&rdquo;
              </p>
              <p className="mt-2 text-[10px] text-vital-primary font-medium">
                ✓ Personalized for Asthma &amp; Heart profile
              </p>
            </div>

            {/* Showcase Card 3: Smart Route Navigator */}
            <div className="vital-card relative overflow-hidden p-5 border-vital-primary/25 bg-vital-card/80 backdrop-blur-xl shadow-xl hover:border-vital-primary/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-bold text-cyan-400">
                  <Navigation className="h-3.5 w-3.5" />
                  Clean Route AI
                </span>
                <span className="text-[10px] font-medium text-emerald-400">Cleanest Path</span>
              </div>
              <p className="mt-3 text-xs font-semibold text-vital-text">
                Gulberg III → Civil Secretariat
              </p>
              <p className="mt-1 text-xs text-vital-muted">
                Via Jail Road Corridor · Avg AQI 114 (-22% Exposure)
              </p>
              <p className="mt-2 text-[10px] text-cyan-400 font-medium">
                ✓ Lowest pollution exposure option
              </p>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
