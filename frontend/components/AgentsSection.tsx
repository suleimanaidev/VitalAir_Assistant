"use client";

import { motion } from "framer-motion";
import {
  Bot,
  Activity,
  Stethoscope,
  Apple,
  Navigation,
} from "lucide-react";

const AGENTS = [
  {
    icon: Activity,
    name: "Monitor Agent",
    role: "Air quality",
    task: "Checks live pollution for your start and end points, plus 18 Lahore neighborhoods on the map.",
  },
  {
    icon: Stethoscope,
    name: "Health Agent",
    role: "Your health",
    task: "Reads your profile and prescriptions, then gives clear advice you can trust — with sources shown.",
  },
  {
    icon: Apple,
    name: "Nutritionist Agent",
    role: "Food & drink",
    task: "Suggests what to eat and drink based on today's season, air quality, and your health needs.",
  },
  {
    icon: Navigation,
    name: "Route Agent",
    role: "Safer commute",
    task: "Finds three routes for you and ranks them by cleaner air and travel time.",
  },
];

const PIPELINE = [
  "Works step by step — each agent uses the last answer",
  "Adjusts for Lahore's season: smog, heat, dust, rain",
  "Includes your uploaded prescriptions when you add them",
  "You get: risk score, routes, history, and plain explanations",
];

export default function AgentsSection() {
  return (
    <section
      id="agents"
      className="scroll-mt-24 border-t border-vital-border bg-vital-card/30 py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center text-center"
        >
          <motion.span
            className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-vital-primary/15 text-vital-primary transition-all duration-300 hover:scale-110 hover:bg-vital-primary/25 hover:shadow-glow"
            whileHover={{ rotate: 8 }}
          >
            <Bot className="h-5 w-5" aria-hidden />
          </motion.span>
          <h2 className="section-title">Four specialists, one clear answer</h2>
          <p className="section-subtitle mx-auto max-w-xl">
            Every time you analyze a trip, four AI helpers work in order — air
            quality, health, food, then your best route. Each step builds on the
            last so everything fits together.
          </p>
        </motion.div>

        <ul className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
          {PIPELINE.map((line) => (
            <li
              key={line}
              className="rounded-full border border-vital-border bg-vital-bg/80 px-3 py-1.5 text-xs leading-snug text-vital-muted"
            >
              {line}
            </li>
          ))}
        </ul>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {AGENTS.map((agent, i) => (
            <motion.article
              key={agent.name}
              initial={{ opacity: 0, x: i % 2 === 0 ? -12 : 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              whileHover={{ y: -5, scale: 1.01 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="group vital-card vital-card-hover flex cursor-default gap-4 p-5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-vital-primary/10 text-vital-primary transition-all duration-300 group-hover:scale-105 group-hover:bg-vital-primary/20 group-hover:shadow-glow">
                <agent.icon className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-vital-primary">
                  {agent.role}
                </p>
                <h3 className="mt-1 font-semibold text-vital-text transition-colors duration-300 group-hover:text-vital-primary">
                  {agent.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-vital-muted">
                  {agent.task}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
