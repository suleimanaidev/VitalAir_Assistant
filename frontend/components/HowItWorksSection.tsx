"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  FileUp,
  Search,
  UserCircle,
} from "lucide-react";

const STEPS = [
  {
    icon: UserCircle,
    step: "01",
    title: "Health profile & documents",
    description:
      "Set age, conditions, commute, and sensitivity. Upload prescriptions (PDF, Word, JPG) — OCR indexes them into your personal RAG knowledge base.",
    href: "/onboarding",
  },
  {
    icon: Search,
    step: "02",
    title: "Analyze your commute",
    description:
      "Enter From → To on the dashboard. Four agents run in sequence: AQI → health (with XAI) → nutrition → 3 ranked low-AQI routes + Personal Exposure Score.",
    href: "/dashboard",
  },
  {
    icon: FileUp,
    step: "03",
    title: "Explore map & routes",
    description:
      "Open the Lahore map for 18 live area AQIs. View cleanest path on OpenStreetMap with checkpoints after each analysis.",
    href: "/route",
  },
  {
    icon: BarChart3,
    step: "04",
    title: "Track exposure over time",
    description:
      "History page shows 30-day PES trends, AQI category bars, route-choice habits, and advisory compliance — data saved on every analysis.",
    href: "/history",
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 border-t border-vital-border bg-vital-bg py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="section-title">How it works</h2>
          <p className="section-subtitle mx-auto max-w-2xl">
            From onboarding to long-term exposure tracking — the full VitalAir
            journey in four steps.
          </p>
        </motion.div>

        <ol className="mt-12 grid gap-6 lg:grid-cols-2">
          {STEPS.map((item, i) => (
            <motion.li
              key={item.step}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.01 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                href={item.href}
                className="group vital-card vital-card-hover flex h-full flex-col gap-4 p-6 sm:flex-row sm:items-start"
              >
                <span className="text-3xl font-bold text-vital-primary/40 transition-colors duration-300 group-hover:text-vital-primary/70">
                  {item.step}
                </span>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-vital-primary/10 text-vital-primary transition-all duration-300 group-hover:scale-105 group-hover:bg-vital-primary/20">
                  <item.icon className="h-6 w-6" aria-hidden />
                </span>
                <div className="flex-1">
                  <h3 className="font-semibold text-vital-text group-hover:text-vital-primary">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-vital-muted">
                    {item.description}
                  </p>
                </div>
              </Link>
            </motion.li>
          ))}
        </ol>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
            <Link href="/onboarding" className="btn-primary inline-flex">
              Start free
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </motion.div>
          <Link
            href="/login"
            className="text-sm text-vital-muted underline-offset-4 hover:text-vital-primary hover:underline"
          >
            Already have an account? Sign in
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
