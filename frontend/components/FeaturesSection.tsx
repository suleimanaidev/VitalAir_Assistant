"use client";

import { motion } from "framer-motion";
import { Activity, Apple, FileText, Gauge, Route, Shield } from "lucide-react";

const FEATURES = [
  {
    icon: Activity,
    title: "Know the air before you step out",
    description:
      "See live pollution levels for Lahore — Gulberg, DHA, Model Town, and 15 more areas on one map.",
  },
  {
    icon: Shield,
    title: "Health advice made for you",
    description:
      "Not generic tips. VitalAir checks your age, asthma, diabetes, and sensitivity, then tells you what to do today.",
  },
  {
    icon: Route,
    title: "Pick a safer road to work",
    description:
      "Compare 3 routes and choose the one with cleaner air — shorter is not always safer in Lahore.",
  },
  {
    icon: Apple,
    title: "Eat right on bad air days",
    description:
      "Get simple food and drink suggestions that help your body during smog, heat, and dusty seasons.",
  },
  {
    icon: FileText,
    title: "Upload your prescription",
    description:
      "Add your doctor’s notes or medicine list once. VitalAir uses them when giving you health advice.",
  },
  {
    icon: Gauge,
    title: "See your personal risk score",
    description:
      "One easy number (0–100) shows how risky your daily commute is — so you know when to stay home or wear a mask.",
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="scroll-mt-24 border-t border-vital-border bg-vital-bg py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <h2 className="section-title">Why join VitalAir?</h2>
          <p className="section-subtitle mx-auto max-w-xl">
            Lahore’s air changes every day. VitalAir helps you protect your
            health, plan your commute, and make better choices — free to start.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -6, scale: 1.02 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="group vital-card vital-card-hover flex cursor-default flex-col p-6"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-vital-primary/10 text-vital-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-vital-primary/20">
                <feature.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-vital-text transition-colors duration-300 group-hover:text-vital-primary">
                {feature.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-vital-muted">
                {feature.description}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
