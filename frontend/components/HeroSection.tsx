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
import { useAreaAqi } from "@/hooks/useAreaAqi";

const HERO_PILLS = [
  { icon: MapPin, text: "Live WAQI Lahore Feeds" },
  { icon: Bot, text: "Personalized RAG Health AI" },
  { icon: Navigation, text: "Low-AQI Safe Route Navigation" },
  { icon: Microscope, text: "WHO & Doctor Guidelines" },
] as const;

/** Fallback snapshot if API is offline. */
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

  const { reading: liveReading } = useAreaAqi("Civil Secretariat");

  const liveAqiVal = liveReading?.aqi ?? DEMO_AQI.value;
  const liveStation = liveReading?.station ? liveReading.station.replace(/^Estimated for [^·]+· nearest monitor:\s*/i, "").trim() : DEMO_AQI.station;
  const liveLabel = liveReading?.label ?? DEMO_AQI.label;

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

      {/* Lahore Mosque, Smog & Route Visual Graphic Background — Soft Feathered Fade on All Edges */}
      <div 
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15 mix-blend-darken filter contrast-125 dark:opacity-40 dark:mix-blend-screen dark:filter-none transition-all duration-300"
        style={{
          backgroundImage: "url('/images/lahore_hero_bg.png')",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 45%, transparent 85%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 45%, transparent 85%)",
        }}
        aria-hidden
      />

      {/* Feathered Bottom Blend Gradient to eliminate any sharp cut-off lines */}
      <div 
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-vital-bg via-vital-bg/70 to-transparent" 
        aria-hidden 
      />

      <motion.div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center"
        >

          {/* Powerful & Minimalist Main Headline */}
          <motion.h1
            variants={item}
            className="mt-6 max-w-3xl text-3xl font-extrabold tracking-tight text-vital-text sm:text-4xl lg:text-5xl leading-tight"
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
            className="mt-5 max-w-xl text-sm text-vital-muted sm:text-base leading-relaxed font-normal"
          >
            Real-time air quality tracking, doctor-aware health precautions, anti-pollution nutrition, and clean low-exposure route navigation — tailored for your profile.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            variants={item}
            className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto"
          >
            <Link
              href={authLink("/onboarding", isAuthenticated, "register")}
              prefetch
              className="btn-primary w-full sm:w-auto px-5 py-2.5 text-sm font-semibold shadow-md shadow-vital-primary/20 hover:shadow-vital-primary/35 transition-all"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
            <Link
              href={authLink("/dashboard", isAuthenticated)}
              prefetch
              className="btn-secondary w-full sm:w-auto px-5 py-2.5 text-sm font-semibold border-vital-border hover:border-vital-primary/40"
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
                  Live WAQI Feed
                </span>
                <span className="text-xs font-semibold text-amber-400">PM2.5</span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-black text-amber-400 tracking-tight">
                  {liveAqiVal}
                </span>
                <span className="text-xs font-semibold text-vital-muted truncate">
                  {liveLabel}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-vital-text">
                <MapPin className="h-3.5 w-3.5 text-vital-primary shrink-0" />
                <span className="font-semibold truncate">📍 Source: {liveStation}</span>
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
