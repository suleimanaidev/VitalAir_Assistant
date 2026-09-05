"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Bike,
  Bus,
  Car,
  CheckCircle2,
  Clock,
  Footprints,
  HeartPulse,
  History,
  Loader2,
  MapPin,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  COMMUTE_OPTIONS,
  GENDER_OPTIONS,
  HEALTH_CONDITIONS,
  OUTDOOR_OPTIONS,
  SENSITIVITY_OPTIONS,
  inputClass,
} from "@/lib/healthProfileOptions";
import { profilePayloadFromHealth, updateMyProfile } from "@/lib/profileApi";
import { clearAllHistory } from "@/lib/historyApi";
import { APP_CITY } from "@/lib/constants";
import {
  defaultProfile,
  useVitalAirStore,
  type CommuteMode,
  type Gender,
  type HealthProfile,
  type OutdoorTime,
  type Sensitivity,
} from "@/store/useVitalAirStore";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().min(1, "Age must be at least 1").max(120, "Age must be 120 or younger"),
  gender: z.enum(["male", "female", "other"]),
  conditions: z.array(z.string()).min(1, "Please select at least one condition or 'None'"),
  sensitivity: z.enum(["low", "medium", "high"]),
  commuteMode: z.enum(["car", "bike", "walk", "public_transport"]),
  outdoorTime: z.enum(["under_30", "30_60", "1_2", "2_plus"]),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileEditorProps {
  onSaved?: () => void;
}

export default function ProfileEditor({ onSaved }: ProfileEditorProps) {
  const { data: session } = useSession();
  const stored = useVitalAirStore((s) => s.healthProfile);
  const setHealthProfile = useVitalAirStore((s) => s.setHealthProfile);
  const setProfileComplete = useVitalAirStore((s) => s.setProfileComplete);
  const autoSaveHistory = useVitalAirStore((s) => s.autoSaveHistory);
  const setAutoSaveHistory = useVitalAirStore((s) => s.setAutoSaveHistory);

  const initial = stored ?? {
    ...defaultProfile,
    name: session?.user?.name ?? defaultProfile.name,
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: initial.name,
      age: initial.age,
      gender: initial.gender ?? "male",
      conditions: initial.conditions.length ? initial.conditions : ["none"],
      sensitivity: initial.sensitivity,
      commuteMode: initial.commuteMode,
      outdoorTime: initial.outdoorTime,
    },
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [historyActionMsg, setHistoryActionMsg] = useState<string | null>(null);

  const name = watch("name");
  const age = watch("age");
  const gender = watch("gender");
  const rawConditions = watch("conditions");
  const conditions = useMemo(() => rawConditions || [], [rawConditions]);
  const sensitivity = watch("sensitivity");
  const commuteMode = watch("commuteMode");
  const outdoorTime = watch("outdoorTime");

  useEffect(() => {
    if (!stored) return;
    setValue("name", stored.name);
    setValue("age", stored.age);
    setValue("gender", stored.gender ?? "male");
    setValue("conditions", stored.conditions.length ? stored.conditions : ["none"]);
    setValue("sensitivity", stored.sensitivity);
    setValue("commuteMode", stored.commuteMode);
    setValue("outdoorTime", stored.outdoorTime);
  }, [stored, setValue]);

  // Dynamic Profile Completion Calculation
  const completionScore = useMemo(() => {
    let score = 0;
    if (name?.trim()) score += 20;
    if (age && age > 0) score += 20;
    if (conditions.length > 0) score += 20;
    if (sensitivity) score += 15;
    if (commuteMode) score += 15;
    if (outdoorTime) score += 10;
    return Math.min(score, 100);
  }, [name, age, conditions, sensitivity, commuteMode, outdoorTime]);

  const toggleCondition = (id: string) => {
    if (id === "none") {
      setValue("conditions", ["none"], { shouldValidate: true });
      return;
    }
    const withoutNone = conditions.filter((c) => c !== "none");
    const next = withoutNone.includes(id)
      ? withoutNone.filter((c) => c !== id)
      : [...withoutNone, id];
    setValue("conditions", next.length ? next : ["none"], { shouldValidate: true });
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear your entire health history?")) {
      return;
    }
    setClearingHistory(true);
    setHistoryActionMsg(null);
    try {
      const res = await clearAllHistory(session?.user?.id, session?.backendToken);
      setHistoryActionMsg(res.message || "Health history cleared successfully.");
      setTimeout(() => setHistoryActionMsg(null), 4000);
    } catch (err) {
      setHistoryActionMsg(
        err instanceof Error ? err.message : "Could not clear history."
      );
      setTimeout(() => setHistoryActionMsg(null), 4000);
    } finally {
      setClearingHistory(false);
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    setError(null);
    setMessage(null);

    if (!session?.user?.id) {
      setError("You must be signed in to save your profile.");
      return;
    }

    const profile: HealthProfile = {
      name: data.name.trim(),
      age: data.age,
      gender: data.gender as Gender,
      city: APP_CITY,
      conditions: data.conditions.includes("none") ? [] : data.conditions,
      sensitivity: data.sensitivity as Sensitivity,
      commuteMode: data.commuteMode as CommuteMode,
      outdoorTime: data.outdoorTime as OutdoorTime,
    };

    setSaving(true);
    try {
      const saved = await updateMyProfile(profilePayloadFromHealth(profile));
      setHealthProfile(profile);
      setProfileComplete(saved.profile_complete);
      setMessage("✓ Health profile saved! Real-time smog risk and clean routes are updated.");
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const commuteIcons = {
    car: Car,
    bike: Bike,
    walk: Footprints,
    public_transport: Bus,
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
      {/* Top Banner: Profile Completion Header */}
      <div className="vital-card relative overflow-hidden p-4 sm:p-6 border border-vital-primary/30 bg-gradient-to-br from-vital-card to-vital-primary/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-vital-primary/15 text-vital-primary shrink-0">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 className="text-sm sm:text-base font-semibold text-vital-text">
                Personalized AI Health Engine
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-vital-muted">
              {completionScore === 100
                ? "Profile 100% complete — VitalAir AI agents are active with maximum precision."
                : "Fill details so VitalAir AI can calculate exact personalized smog risks & clean routes."}
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="text-right">
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-vital-muted">Completion</p>
              <p className="text-lg sm:text-xl font-bold text-vital-primary">{completionScore}%</p>
            </div>
            <div className="relative h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center shrink-0">
              <svg className="h-10 w-10 sm:h-12 sm:w-12 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-vital-border stroke-current"
                  strokeWidth="3.5"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-vital-primary stroke-current transition-all duration-500 ease-out"
                  strokeWidth="3.5"
                  strokeDasharray={`${completionScore}, 100`}
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              {completionScore === 100 && (
                <CheckCircle2 className="absolute h-4 w-4 sm:h-5 sm:w-5 text-vital-primary" />
              )}
            </div>
          </div>
        </div>

        {/* Progress bar line */}
        <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-vital-bg">
          <motion.div
            className="h-full bg-gradient-to-r from-vital-primary to-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${completionScore}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Main Container: Fully Responsive Flow */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8 items-start">
        {/* Left / Main Column: Form Sections */}
        <div className="xl:col-span-2 space-y-6 sm:space-y-8 min-w-0">
          
          {/* Section 1: Personal Details & Location */}
          <div className="vital-card space-y-4 sm:space-y-5 p-4 sm:p-6 lg:p-7">
            <div className="flex items-center gap-2 border-b border-vital-border/60 pb-3">
              <User className="h-5 w-5 text-vital-primary shrink-0" />
              <h2 className="text-base sm:text-lg font-semibold text-vital-text">1. Personal Details &amp; Area</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="min-w-0">
                <label className="block text-xs sm:text-sm font-medium text-vital-text">
                  Full Name <span className="text-vital-primary">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Suleiman Ahmed"
                  className={inputClass}
                  disabled={saving}
                  {...register("name")}
                />
                {errors.name && <p className="mt-1 text-xs text-vital-danger">{errors.name.message}</p>}
              </div>

              <div className="min-w-0">
                <label className="block text-xs sm:text-sm font-medium text-vital-text">
                  Age <span className="text-vital-primary">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 28"
                  className={inputClass}
                  disabled={saving}
                  {...register("age", { valueAsNumber: true })}
                />
                {errors.age && <p className="mt-1 text-xs text-vital-danger">{errors.age.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
              <div className="min-w-0">
                <label className="block text-xs sm:text-sm font-medium text-vital-text">Gender</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {GENDER_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`cursor-pointer rounded-xl border py-2.5 px-2 text-center text-xs font-semibold transition-all ${
                        gender === opt.value
                          ? "border-vital-primary bg-vital-primary/15 text-vital-primary ring-1 ring-vital-primary"
                          : "border-vital-border bg-vital-bg/40 text-vital-muted hover:border-vital-primary/40 hover:text-vital-text"
                      }`}
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        {...register("gender")}
                        disabled={saving}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                {errors.gender && <p className="mt-1 text-xs text-vital-danger">{errors.gender.message}</p>}
              </div>

              <div className="min-w-0">
                <label className="block text-xs sm:text-sm font-medium text-vital-text">City</label>
                <div className="mt-1.5 flex items-center justify-between rounded-xl border border-vital-border bg-vital-bg/50 px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm text-vital-text">
                  <span className="font-semibold text-vital-primary">{APP_CITY}</span>
                  <span className="rounded bg-vital-primary/10 px-2 py-0.5 text-[10px] sm:text-xs text-vital-primary font-medium">
                    Active Coverage
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Respiratory & Health Conditions */}
          <div className="vital-card space-y-5 p-4 sm:p-6 lg:p-7">
            <div className="flex items-center gap-2 border-b border-vital-border/60 pb-3">
              <HeartPulse className="h-5 w-5 text-vital-primary shrink-0" />
              <h2 className="text-base sm:text-lg font-semibold text-vital-text">2. Respiratory &amp; Health Conditions</h2>
            </div>

            <div className="space-y-3">
              <p className="text-xs sm:text-sm text-vital-muted leading-relaxed">
                Select pre-existing conditions or triggers. VitalAir will personalize smog risk evaluations accordingly:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {HEALTH_CONDITIONS.map((cond) => {
                  const active = conditions.includes(cond.id);
                  return (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() => toggleCondition(cond.id)}
                      disabled={saving}
                      className={`group relative flex items-start gap-3 rounded-xl border p-3 sm:p-3.5 text-left transition-all cursor-pointer min-w-0 ${
                        active
                          ? "border-vital-primary bg-vital-primary/15 text-vital-text shadow-[0_0_16px_rgba(0,200,150,0.1)]"
                          : "border-vital-border bg-vital-bg/40 text-vital-muted hover:border-vital-primary/40 hover:bg-vital-bg hover:text-vital-text"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-4 w-4 sm:h-5 sm:w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                          active
                            ? "border-vital-primary bg-vital-primary text-black font-bold"
                            : "border-vital-border group-hover:border-vital-primary/50"
                        }`}
                      >
                        {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={`text-xs sm:text-sm font-semibold truncate ${active ? "text-vital-primary" : "text-vital-text"}`}>
                          {cond.label}
                        </p>
                        {cond.description && (
                          <p className="text-[11px] sm:text-xs text-vital-muted mt-0.5 leading-snug line-clamp-2">
                            {cond.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {errors.conditions && (
                <p className="text-xs text-vital-danger">{errors.conditions.message}</p>
              )}
            </div>

            {/* Visual Sensitivity Gauge */}
            <div className="space-y-3 pt-4 border-t border-vital-border/60">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs sm:text-sm font-medium text-vital-text">Air Pollution Sensitivity</label>
                <span className="text-[11px] text-vital-muted">Smog physiological response</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {SENSITIVITY_OPTIONS.map((opt) => {
                  const active = sensitivity === opt.value;
                  const borderCol =
                    opt.color === "emerald"
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                      : opt.color === "amber"
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                      : "border-rose-500/50 bg-rose-500/10 text-rose-400";

                  return (
                    <label
                      key={opt.value}
                      className={`group relative flex flex-col justify-between rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer min-w-0 ${
                        active
                          ? `${borderCol} shadow-md shadow-black/20 ring-1 ring-current`
                          : "border-vital-border bg-vital-bg/40 text-vital-muted hover:border-vital-primary/40 hover:text-vital-text"
                      }`}
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        {...register("sensitivity")}
                        disabled={saving}
                        className="sr-only"
                      />
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs sm:text-sm font-bold text-vital-text">{opt.label}</p>
                          <span
                            className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                              opt.color === "emerald"
                                ? "bg-emerald-400"
                                : opt.color === "amber"
                                ? "bg-amber-400"
                                : "bg-rose-400"
                            }`}
                          />
                        </div>
                        <p className="text-[11px] sm:text-xs leading-relaxed text-vital-muted">{opt.description}</p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-vital-border/30">
                        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-85">
                          {opt.riskBadge}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
              {errors.sensitivity && (
                <p className="text-xs text-vital-danger">{errors.sensitivity.message}</p>
              )}
            </div>
          </div>

          {/* Section 3: Commute Mode & Daily Outdoors */}
          <div className="vital-card space-y-5 p-4 sm:p-6 lg:p-7">
            <div className="flex items-center gap-2 border-b border-vital-border/60 pb-3">
              <Activity className="h-5 w-5 text-vital-primary shrink-0" />
              <h2 className="text-base sm:text-lg font-semibold text-vital-text">3. Commute &amp; Daily Exposure</h2>
            </div>

            {/* Commute Mode Cards */}
            <div className="space-y-3">
              <label className="block text-xs sm:text-sm font-medium text-vital-text">Primary Commute Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {COMMUTE_OPTIONS.map((opt) => {
                  const Icon = commuteIcons[opt.value];
                  const active = commuteMode === opt.value;

                  return (
                    <label
                      key={opt.value}
                      className={`group relative flex items-start gap-3 rounded-xl border p-3.5 transition-all cursor-pointer min-w-0 ${
                        active
                          ? "border-vital-primary bg-vital-primary/15 text-vital-text shadow-[0_0_18px_rgba(0,200,150,0.12)] ring-1 ring-vital-primary"
                          : "border-vital-border bg-vital-bg/40 text-vital-muted hover:border-vital-primary/40 hover:bg-vital-bg hover:text-vital-text"
                      }`}
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        {...register("commuteMode")}
                        disabled={saving}
                        className="sr-only"
                      />

                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                          active
                            ? "bg-vital-primary text-black font-bold shadow-sm"
                            : "bg-vital-card border border-vital-border text-vital-muted group-hover:text-vital-primary"
                        }`}
                      >
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-semibold text-vital-text">{opt.label}</p>
                        <p className="text-[11px] sm:text-xs text-vital-muted mt-1 leading-snug">{opt.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              {errors.commuteMode && (
                <p className="text-xs text-vital-danger">{errors.commuteMode.message}</p>
              )}
            </div>

            {/* Daily Outdoor Time Pills */}
            <div className="space-y-3 pt-4 border-t border-vital-border/60">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs sm:text-sm font-medium text-vital-text">Daily Outdoor Exposure Duration</label>
                <span className="text-[11px] text-vital-muted">Outside hours / day</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                {OUTDOOR_OPTIONS.map((opt) => {
                  const active = outdoorTime === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`group flex flex-col items-center justify-center rounded-xl border p-2.5 sm:p-3 text-center transition-all cursor-pointer min-w-0 ${
                        active
                          ? "border-vital-primary bg-vital-primary/15 text-vital-primary font-semibold shadow-sm"
                          : "border-vital-border bg-vital-bg/40 text-vital-muted hover:border-vital-primary/40 hover:text-vital-text"
                      }`}
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        {...register("outdoorTime")}
                        disabled={saving}
                        className="sr-only"
                      />
                      <Clock className={`h-3.5 w-3.5 mb-1 ${active ? "text-vital-primary" : "text-vital-muted"}`} />
                      <p className="text-xs font-bold text-vital-text">{opt.label}</p>
                      <p className="text-[10px] text-vital-muted mt-0.5 truncate w-full">{opt.description}</p>
                    </label>
                  );
                })}
              </div>
              {errors.outdoorTime && (
                <p className="text-xs text-vital-danger">{errors.outdoorTime.message}</p>
              )}
            </div>
          </div>

          {/* Section 4: Health History & Tracking Settings */}
          <div className="vital-card space-y-4 p-4 sm:p-6 lg:p-7 border border-vital-border bg-vital-bg/20">
            <div className="flex items-center gap-2 border-b border-vital-border/60 pb-3">
              <History className="h-5 w-5 text-vital-primary shrink-0" />
              <h2 className="text-base sm:text-lg font-semibold text-vital-text">Health History &amp; Privacy</h2>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs sm:text-sm font-medium text-vital-text">
                  Auto-save checks &amp; daily risk to Health History
                </p>
                <p className="text-[11px] sm:text-xs text-vital-muted mt-0.5">
                  Logs queries to track pollution exposure &amp; respiratory trends over time.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 self-start sm:self-auto">
                <input
                  type="checkbox"
                  checked={autoSaveHistory}
                  onChange={(e) => setAutoSaveHistory(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-vital-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-vital-primary"></div>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-vital-border/40">
              <Link
                href="/history"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-vital-primary hover:underline"
              >
                Open My Health History
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>

              <button
                type="button"
                onClick={handleClearHistory}
                disabled={clearingHistory}
                className="inline-flex items-center gap-1.5 text-xs text-vital-danger hover:underline disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {clearingHistory ? "Clearing history…" : "Clear all health history"}
              </button>
            </div>
            {historyActionMsg && (
              <p className="text-xs font-medium text-vital-primary animate-fade-in">{historyActionMsg}</p>
            )}
          </div>
        </div>

        {/* Right Column: Live AI Agent Preview Card + Save Action */}
        <div className="xl:col-span-1 space-y-5 min-w-0">
          <div className="xl:sticky xl:top-24 space-y-5">
            <div className="vital-card border border-vital-primary/40 bg-vital-card p-4 sm:p-5 shadow-xl shadow-black/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-vital-primary/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-vital-border/60">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-vital-text flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-vital-primary" />
                    Live AI Agent Preview
                  </h3>
                </div>
                <span className="rounded bg-vital-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-vital-primary">
                  Active Sync
                </span>
              </div>

              <div className="space-y-3.5">
                <div className="rounded-lg bg-vital-bg/70 p-3 border border-vital-border/60">
                  <p className="text-[10px] text-vital-muted uppercase font-semibold tracking-wider">Configured Patient</p>
                  <p className="text-xs sm:text-sm font-bold text-vital-text mt-0.5">
                    {name?.trim() || "Anonymous"} {age ? `(${age} yrs${gender ? `, ${gender}` : ""})` : ""}
                  </p>
                  <p className="text-xs text-vital-primary font-medium mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {APP_CITY}, Pakistan
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="font-semibold text-vital-muted text-[10px] uppercase tracking-wider">AI Safety Triggers:</p>

                  <div className="flex items-start gap-2 rounded-lg bg-vital-primary/10 p-2.5 border border-vital-primary/20 text-vital-text">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-vital-primary mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-bold text-vital-primary text-[11px] sm:text-xs">
                        {sensitivity === "high"
                          ? "High Alert (AQI > 90)"
                          : sensitivity === "medium"
                          ? "Moderate Precaution (AQI > 120)"
                          : "Standard Baseline (AQI > 150)"}
                      </span>
                      <p className="text-[10px] sm:text-[11px] text-vital-muted mt-0.5 leading-snug">
                        {sensitivity === "high"
                          ? "Immediate push alerts & purifier guidance."
                          : "Alerts before outdoor workout / rush hour."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg bg-vital-bg/70 p-2.5 border border-vital-border/60 text-vital-text">
                    <Activity className="h-3.5 w-3.5 shrink-0 text-vital-primary mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-semibold text-[11px] sm:text-xs">
                        Commute: {commuteMode === "bike" ? "Motorcycle (Open Road)" : commuteMode === "walk" ? "Pedestrian Exertion" : commuteMode === "car" ? "Cabin Filtered Car" : "Public Transit"}
                      </span>
                      <p className="text-[10px] sm:text-[11px] text-vital-muted mt-0.5 leading-snug">
                        {commuteMode === "bike"
                          ? "AI Clean Route prioritizes detours away from brick kilns & heavy diesel corridors."
                          : commuteMode === "walk"
                          ? "Pollen & PM2.5 avoidance routes through parks."
                          : "Standard route optimization with AC recirculate advice."}
                      </p>
                    </div>
                  </div>

                  {conditions.filter((c) => c !== "none").length > 0 && (
                    <div className="flex items-start gap-2 rounded-lg bg-vital-bg/70 p-2.5 border border-vital-border/60 text-vital-text">
                      <HeartPulse className="h-3.5 w-3.5 shrink-0 text-rose-400 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-semibold text-rose-300 text-[11px] sm:text-xs truncate block">
                          Active: {conditions.filter((c) => c !== "none").join(", ")}
                        </span>
                        <p className="text-[10px] sm:text-[11px] text-vital-muted mt-0.5 leading-snug">
                          Medical AI answers will prioritize clinical safety regarding these conditions.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Save Action Card */}
            <div className="vital-card p-4 sm:p-5 space-y-3.5">
              {error && (
                <div className="rounded-lg border border-vital-danger/30 bg-vital-danger/10 p-2.5 text-xs text-vital-danger" role="alert">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-400 font-medium" role="status">
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold shadow-lg shadow-vital-primary/25 cursor-pointer"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Saving Profile…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" aria-hidden />
                    Save Health Profile
                  </>
                )}
              </button>

              <p className="text-[10px] sm:text-[11px] text-center text-vital-muted leading-tight">
                Your medical data is encrypted and used exclusively for your air quality protection.
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
