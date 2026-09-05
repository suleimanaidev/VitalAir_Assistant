import type { CommuteMode, Gender, OutdoorTime, Sensitivity } from "@/store/useVitalAirStore";

export interface GenderOption {
  value: Gender;
  label: string;
  description: string;
}

export const GENDER_OPTIONS: GenderOption[] = [
  { value: "male", label: "Male", description: "Standard physiological baseline" },
  { value: "female", label: "Female", description: "Standard physiological baseline" },
  { value: "other", label: "Other", description: "Individual baseline" },
];

export interface HealthConditionOption {
  id: string;
  label: string;
  category?: "respiratory" | "cardiovascular" | "allergic" | "general";
  description?: string;
  icon?: string;
}

export const HEALTH_CONDITIONS: HealthConditionOption[] = [
  { id: "asthma", label: "Asthma", category: "respiratory", description: "Bronchial sensitivity to PM2.5 and dust" },
  { id: "dust allergy", label: "Dust & Pollen Allergy", category: "allergic", description: "Sneezing, itchy eyes, rhinitis triggers" },
  { id: "rescue inhaler", label: "Carries Rescue Inhaler", category: "respiratory", description: "Albuterol / Ventolin emergency user" },
  { id: "heart disease", label: "Heart Disease", category: "cardiovascular", description: "Cardiovascular sensitivity to fine particulate matter" },
  { id: "diabetes", label: "Diabetes", category: "general", description: "Metabolic care during high oxidative stress" },
  { id: "pregnancy", label: "Pregnancy", category: "general", description: "Heightened vulnerability to air pollutants" },
  { id: "none", label: "None / No Pre-existing Conditions", category: "general", description: "Healthy baseline" },
];

export interface SensitivityOption {
  value: Sensitivity;
  label: string;
  description: string;
  color: string;
  riskBadge: string;
}

export const SENSITIVITY_OPTIONS: SensitivityOption[] = [
  {
    value: "low",
    label: "Low (Mild)",
    description: "Tolerates normal urban pollution without immediate respiratory distress.",
    color: "emerald",
    riskBadge: "Standard Smog Threshold",
  },
  {
    value: "medium",
    label: "Medium (Moderate)",
    description: "Experiences mild irritation, eye burn, or coughing when AQI exceeds 120.",
    color: "amber",
    riskBadge: "Early Precaution Mode",
  },
  {
    value: "high",
    label: "High (Sensitive)",
    description: "High vulnerability. Requires strict indoor refuge, air purifiers & N95 masks at AQI > 100.",
    color: "rose",
    riskBadge: "High Alert Mode",
  },
];

export interface CommuteOption {
  value: CommuteMode;
  label: string;
  description: string;
  exposureLevel: "Low" | "Medium" | "High" | "Extreme";
  subtext: string;
}

export const COMMUTE_OPTIONS: CommuteOption[] = [
  {
    value: "car",
    label: "Car / Cab",
    description: "Enclosed cabin with AC filter",
    exposureLevel: "Low",
    subtext: "Best air filtration with recirculate mode",
  },
  {
    value: "bike",
    label: "Bike / Motorcycle",
    description: "Open-air direct road exposure",
    exposureLevel: "Extreme",
    subtext: "High PM2.5 & heavy exhaust intake",
  },
  {
    value: "walk",
    label: "Walking / Jogging",
    description: "Outdoor pedestrian exertion",
    exposureLevel: "High",
    subtext: "Increased lung inhalation rate",
  },
  {
    value: "public_transport",
    label: "Public Transport",
    description: "Bus, Speedo & Metro Orange Line",
    exposureLevel: "Medium",
    subtext: "Station waiting + enclosed transit",
  },
];

export interface OutdoorOption {
  value: OutdoorTime;
  label: string;
  description: string;
}

export const OUTDOOR_OPTIONS: OutdoorOption[] = [
  { value: "under_30", label: "< 30 mins", description: "Minimal daily exposure" },
  { value: "30_60", label: "30–60 mins", description: "Moderate daily routine" },
  { value: "1_2", label: "1–2 hours", description: "Substantial daily exposure" },
  { value: "2_plus", label: "2+ hours", description: "High prolonged exposure" },
];

export const POPULAR_LAHORE_AREAS = [
  "Gulberg",
  "DHA Phase 5",
  "Johar Town",
  "Model Town",
  "Lahore Cantt",
  "Mall Road",
  "Faisal Town",
  "Wapda Town",
  "Bahria Town",
  "Allama Iqbal Town",
  "Shadman",
  "Anarkali / Old City"
];

export const inputClass =
  "mt-1.5 w-full rounded-xl border border-vital-border bg-vital-bg/80 px-4 py-3 text-vital-text placeholder:text-vital-muted focus:border-vital-primary focus:outline-none focus:ring-2 focus:ring-vital-primary/20 transition-all";
