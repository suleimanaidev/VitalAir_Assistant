"use client";

import { CloudSun } from "lucide-react";
import {
  getSeasonProfile,
  normalizeSeasonId,
} from "@/lib/lahoreSeasonalIntelligence";
import type { LahoreSeasonId } from "@/lib/lahoreSeason";

const SEASON_COLORS: Record<LahoreSeasonId, string> = {
  winter_smog: "border-slate-400/40 bg-slate-500/5",
  spring_dust: "border-amber-500/40 bg-amber-500/5",
  summer_heatwave: "border-orange-500/40 bg-orange-500/5",
  monsoon: "border-sky-500/40 bg-sky-500/5",
};

export interface SeasonIntelligenceData {
  id: LahoreSeasonId | string;
  name: string;
  months: string;
  label_en: string;
  primary_hazard: string;
  pollutants: string[];
  health_agent_focus: string;
  nutrition_agent_focus: string;
  route_agent_focus: string;
  avoid_areas: string[];
  preferred_travel_window: string;
}

export default function SeasonIntelligenceCard({
  data,
}: {
  data?: SeasonIntelligenceData;
}) {
  return null;
}
