import type { LahoreSeasonId } from "@/lib/lahoreSeason";

export interface SeasonProfile {
  id: LahoreSeasonId;
  name: string;
  months: string;
  primaryHazard: string;
  pollutants: string[];
  healthFocus: string;
  nutritionFocus: string;
  routeFocus: string;
  avoidAreas: string[];
  preferredTravelWindow: string;
}

export const SEASON_PROFILES: Record<LahoreSeasonId, SeasonProfile> = {
  winter_smog: {
    id: "winter_smog",
    name: "Winter Smog",
    months: "Oct–Jan",
    primaryHazard: "PM2.5, PM10, NO₂ from crop burning & inversion",
    pollutants: ["PM2.5", "PM10", "NO₂"],
    healthFocus: "N95 mandatory outdoors; stay indoors when AQI > 150",
    nutritionFocus: "Ginger tea, vitamin C, turmeric, omega-3",
    routeFocus: "Avoid industrial corridors (Kot Lakhpat)",
    avoidAreas: ["Kot Lakhpat", "Quaid-e-Azam Industrial Estate"],
    preferredTravelWindow: "Mid-morning when inversion lifts",
  },
  spring_dust: {
    id: "spring_dust",
    name: "Spring Dust",
    months: "Feb–Apr",
    primaryHazard: "Dust storms, pollen, variable AQI",
    pollutants: ["PM10", "Pollen", "Dust"],
    healthFocus: "Mask for dust storms; pollen allergy plan",
    nutritionFocus: "Vitamin C, honey, anti-inflammatory greens",
    routeFocus: "Avoid open arterial roads during dust spikes",
    avoidAreas: ["Canal Bank Road (open dust)", "GT Road dusty stretches"],
    preferredTravelWindow: "Early morning before wind pick-up",
  },
  summer_heatwave: {
    id: "summer_heatwave",
    name: "Summer Heatwave",
    months: "May–Jul",
    primaryHazard: "Ozone (O₃), heat stress, dehydration",
    pollutants: ["O₃", "Heat", "PM2.5"],
    healthFocus: "Hydration; heat stroke watch; avoid 12–4 PM outdoors",
    nutritionFocus: "Electrolytes, watermelon, ORS, lassi",
    routeFocus: "Travel before 10 AM or after 6 PM",
    avoidAreas: ["Open sun corridors", "Mall Road midday"],
    preferredTravelWindow: "Before 10 AM or after 6 PM",
  },
  monsoon: {
    id: "monsoon",
    name: "Monsoon",
    months: "Aug–Sep",
    primaryHazard: "Humidity, mold spores, post-rain dust",
    pollutants: ["Humidity", "Mold spores", "PM10"],
    healthFocus: "Mold allergy alert; avoid flooded underpasses",
    nutritionFocus: "Garlic, turmeric, boiled water, light meals",
    routeFocus: "Flood-prone road avoidance after heavy rain",
    avoidAreas: ["Underpasses", "Low-lying Shahdara approaches"],
    preferredTravelWindow: "Between rain spells",
  },
};

const LEGACY_SEASON_MAP: Record<string, LahoreSeasonId> = {
  smog_winter: "winter_smog",
  autumn_buildup: "winter_smog",
  spring_transition: "spring_dust",
  pre_monsoon_heat: "summer_heatwave",
};

export function normalizeSeasonId(seasonId: string): LahoreSeasonId {
  if (seasonId in SEASON_PROFILES) return seasonId as LahoreSeasonId;
  return LEGACY_SEASON_MAP[seasonId] ?? "winter_smog";
}

export function getSeasonProfile(seasonId: LahoreSeasonId | string): SeasonProfile {
  const id = normalizeSeasonId(seasonId);
  return SEASON_PROFILES[id];
}
