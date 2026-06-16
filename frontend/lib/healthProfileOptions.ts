import type { CommuteMode, OutdoorTime, Sensitivity } from "@/store/useVitalAirStore";

export const HEALTH_CONDITIONS = [
  { id: "asthma", label: "Asthma" },
  { id: "heart disease", label: "Heart Disease" },
  { id: "diabetes", label: "Diabetes" },
  { id: "none", label: "None" },
] as const;

export const SENSITIVITY_OPTIONS: { value: Sensitivity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const COMMUTE_OPTIONS: { value: CommuteMode; label: string }[] = [
  { value: "walk", label: "Walk" },
  { value: "bike", label: "Bike" },
  { value: "car", label: "Car" },
  { value: "public_transport", label: "Public Transport" },
];

export const OUTDOOR_OPTIONS: { value: OutdoorTime; label: string }[] = [
  { value: "under_30", label: "<30 min" },
  { value: "30_60", label: "30–60 min" },
  { value: "1_2", label: "1–2 hrs" },
  { value: "2_plus", label: "2+ hrs" },
];

export const inputClass =
  "mt-1.5 w-full rounded-lg border border-vital-border bg-vital-bg px-3 py-2.5 text-vital-text placeholder:text-vital-muted focus:border-vital-primary focus:outline-none focus:ring-1 focus:ring-vital-primary";
