"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bike,
  Bus,
  Car,
  CheckCircle2,
  Clock,
  Footprints,
  HeartPulse,
  Loader2,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import ProgressBar from "@/components/ProgressBar";
import {
  COMMUTE_OPTIONS,
  GENDER_OPTIONS,
  HEALTH_CONDITIONS,
  OUTDOOR_OPTIONS,
  SENSITIVITY_OPTIONS,
  inputClass,
} from "@/lib/healthProfileOptions";
import { profilePayloadFromHealth, updateMyProfile } from "@/lib/profileApi";
import { APP_CITY } from "@/lib/constants";
import {
  useVitalAirStore,
  type HealthProfile,
  defaultProfile,
  type Gender,
  type Sensitivity,
  type CommuteMode,
  type OutdoorTime,
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

const slide = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-vital-text">{title}</h2>
      <p className="mt-1 text-sm text-vital-muted">{subtitle}</p>
    </div>
  );
}

export default function OnboardingForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const setHealthProfile = useVitalAirStore((s) => s.setHealthProfile);
  const setProfileComplete = useVitalAirStore((s) => s.setProfileComplete);
  const setUserId = useVitalAirStore((s) => s.setUserId);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: defaultProfile.name,
      age: defaultProfile.age,
      gender: defaultProfile.gender ?? "male",
      conditions: ["none"],
      sensitivity: defaultProfile.sensitivity,
      commuteMode: defaultProfile.commuteMode,
      outdoorTime: defaultProfile.outdoorTime,
    },
  });

  const conditions = watch("conditions") || [];
  const gender = watch("gender");
  const sensitivity = watch("sensitivity");
  const commuteMode = watch("commuteMode");
  const outdoorTime = watch("outdoorTime");

  useEffect(() => {
    if (session?.user?.name) {
      setValue("name", session.user.name);
    }
  }, [session?.user?.name, setValue]);

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

  const handleNext = async () => {
    let isValid = false;
    if (step === 1) {
      isValid = await trigger(["name", "age", "gender"]);
    } else if (step === 2) {
      isValid = await trigger(["conditions", "sensitivity"]);
    }
    if (isValid && step < 3) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const onSubmit = async (data: ProfileFormValues) => {
    setSubmitting(true);
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

    setHealthProfile(profile);

    try {
      const uid = session?.user?.id;
      if (!uid || !session?.backendToken) {
        throw new Error("Please sign in to complete your profile.");
      }
      const saved = await updateMyProfile(profilePayloadFromHealth(profile));
      setUserId(uid);
      setProfileComplete(saved.profile_complete);
    } catch (err) {
      setSubmitting(false);
      alert(
        err instanceof Error
          ? err.message
          : "Could not save profile. Is the backend running?"
      );
      return;
    }

    setSubmitting(false);
    router.replace("/dashboard");
  };

  const commuteIcons = {
    car: Car,
    bike: Bike,
    walk: Footprints,
    public_transport: Bus,
  };

  return (
    <motion.div className="vital-card p-6 sm:p-8">
      <ProgressBar currentStep={step} />

      <form className="mt-8" onSubmit={handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <StepHeader
                title="Basic info"
                subtitle="Tell us a little about yourself to initialize your health baseline."
              />
              <div>
                <label className="block text-sm font-medium text-vital-text">Full Name</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Suleiman Ahmed"
                  {...register("name")}
                />
                {errors.name && <p className="mt-1 text-xs text-vital-danger">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-vital-text">Age</label>
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="e.g. 28"
                    {...register("age", { valueAsNumber: true })}
                  />
                  {errors.age && <p className="mt-1 text-xs text-vital-danger">{errors.age.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-vital-text">Gender</label>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {GENDER_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`cursor-pointer rounded-xl border py-3 px-2 text-center text-xs font-semibold transition-all ${
                          gender === opt.value
                            ? "border-vital-primary bg-vital-primary/15 text-vital-primary ring-1 ring-vital-primary"
                            : "border-vital-border bg-vital-bg/40 text-vital-muted hover:border-vital-primary/40 hover:text-vital-text"
                        }`}
                      >
                        <input
                          type="radio"
                          value={opt.value}
                          {...register("gender")}
                          className="sr-only"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  {errors.gender && <p className="mt-1 text-xs text-vital-danger">{errors.gender.message}</p>}
                </div>
              </div>

              <div className="rounded-xl border border-vital-border bg-vital-bg/50 p-3.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-vital-text font-medium">
                  <MapPin className="h-4 w-4 text-vital-primary" />
                  Active City: {APP_CITY}, Pakistan
                </span>
                <span className="rounded bg-vital-primary/10 px-2 py-0.5 text-vital-primary font-semibold">
                  Smog AI Engine Active
                </span>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <StepHeader
                title="Health conditions & Smog Sensitivity"
                subtitle="We adapt respiratory alerts and route safety to your conditions."
              />

              <div className="space-y-3">
                <label className="text-sm font-medium text-vital-text">Health &amp; Respiratory Triggers</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {HEALTH_CONDITIONS.map((cond) => {
                    const active = conditions.includes(cond.id);
                    return (
                      <button
                        key={cond.id}
                        type="button"
                        onClick={() => toggleCondition(cond.id)}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          active
                            ? "border-vital-primary bg-vital-primary/15 text-vital-text"
                            : "border-vital-border bg-vital-bg/40 text-vital-muted hover:border-vital-primary/40 hover:text-vital-text"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            active
                              ? "border-vital-primary bg-vital-primary text-black font-bold"
                              : "border-vital-border"
                          }`}
                        >
                          {active && <CheckCircle2 className="h-3 w-3" />}
                        </div>
                        <div>
                          <p className={`text-xs font-semibold ${active ? "text-vital-primary" : "text-vital-text"}`}>
                            {cond.label}
                          </p>
                          {cond.description && (
                            <p className="text-[11px] text-vital-muted mt-0.5">{cond.description}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.conditions && <p className="mt-1 text-xs text-vital-danger">{errors.conditions.message}</p>}
              </div>

              <div className="space-y-3 pt-3 border-t border-vital-border/60">
                <label className="text-sm font-medium text-vital-text">Pollution Sensitivity</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {SENSITIVITY_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`cursor-pointer rounded-xl border p-3.5 text-center transition-all ${
                        sensitivity === opt.value
                          ? "border-vital-primary bg-vital-primary/15 text-vital-primary font-semibold ring-1 ring-vital-primary"
                          : "border-vital-border bg-vital-bg/40 text-vital-muted hover:border-vital-primary/40 hover:text-vital-text"
                      }`}
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        {...register("sensitivity")}
                        className="sr-only"
                      />
                      <p className="text-xs font-bold text-vital-text">{opt.label}</p>
                      <p className="text-[10px] text-vital-muted mt-1 leading-tight">{opt.description}</p>
                    </label>
                  ))}
                </div>
                {errors.sensitivity && <p className="mt-1 text-xs text-vital-danger">{errors.sensitivity.message}</p>}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <StepHeader
                title="Commute & Daily Exposure"
                subtitle="Helps our AI agents calculate your daily particulate exposure."
              />

              <div className="space-y-3">
                <label className="text-sm font-medium text-vital-text">Primary Commute Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {COMMUTE_OPTIONS.map((opt) => {
                    const Icon = commuteIcons[opt.value];
                    const active = commuteMode === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 rounded-xl border p-3.5 transition-all cursor-pointer ${
                          active
                            ? "border-vital-primary bg-vital-primary/15 text-vital-text ring-1 ring-vital-primary"
                            : "border-vital-border bg-vital-bg/40 text-vital-muted hover:border-vital-primary/40 hover:text-vital-text"
                        }`}
                      >
                        <input
                          type="radio"
                          value={opt.value}
                          {...register("commuteMode")}
                          className="sr-only"
                        />
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            active ? "bg-vital-primary text-black font-bold" : "bg-vital-card text-vital-muted"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-vital-text">{opt.label}</p>
                          <p className="text-[11px] text-vital-muted mt-0.5">{opt.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {errors.commuteMode && <p className="mt-1 text-xs text-vital-danger">{errors.commuteMode.message}</p>}
              </div>

              <div className="space-y-3 pt-3 border-t border-vital-border/60">
                <label className="text-sm font-medium text-vital-text">Daily Outdoor Time</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {OUTDOOR_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`cursor-pointer rounded-xl border p-3 text-center transition-all ${
                        outdoorTime === opt.value
                          ? "border-vital-primary bg-vital-primary/15 text-vital-primary font-semibold"
                          : "border-vital-border bg-vital-bg/40 text-vital-muted hover:border-vital-primary/40 hover:text-vital-text"
                      }`}
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        {...register("outdoorTime")}
                        className="sr-only"
                      />
                      <Clock className="h-3.5 w-3.5 mx-auto mb-1 text-vital-primary" />
                      <p className="text-xs font-bold text-vital-text">{opt.label}</p>
                    </label>
                  ))}
                </div>
                {errors.outdoorTime && <p className="mt-1 text-xs text-vital-danger">{errors.outdoorTime.message}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between gap-4 pt-4 border-t border-vital-border/60">
          <button
            type="button"
            className="btn-ghost text-sm disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
            onClick={handleBack}
            disabled={step === 1 || submitting}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="btn-primary text-sm flex items-center gap-1.5 cursor-pointer"
              disabled={submitting}
            >
              Next
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button
              type="submit"
              className="btn-primary text-sm flex items-center gap-1.5 cursor-pointer shadow-lg shadow-vital-primary/20"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  Complete Health Profile
                  <Sparkles className="h-4 w-4" aria-hidden />
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </motion.div>
  );
}
