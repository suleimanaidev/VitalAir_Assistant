"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, MapPin } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import ProgressBar from "@/components/ProgressBar";
import {
  COMMUTE_OPTIONS,
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
  type Sensitivity,
  type CommuteMode,
  type OutdoorTime,
} from "@/store/useVitalAirStore";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.coerce.number().min(1, "Age must be at least 1").max(120, "Age must be 120 or younger"),
  conditions: z.array(z.string()).min(1, "Please select at least one condition"),
  sensitivity: z.enum(["low", "medium", "high"]),
  commuteMode: z.enum(["car", "bike", "walk", "public_transport"]),
  outdoorTime: z.enum(["less_30", "30_60", "1_2", "2_plus"])
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
      <h2 className="text-xl font-semibold text-vital-text">{title}</h2>
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

  const { register, handleSubmit, control, watch, setValue, trigger, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: defaultProfile.name,
      age: defaultProfile.age,
      conditions: [],
      sensitivity: defaultProfile.sensitivity,
      commuteMode: defaultProfile.commuteMode,
      outdoorTime: defaultProfile.outdoorTime
    }
  });

  const conditions = watch("conditions");
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
    const current = conditions || [];
    const withoutNone = current.filter((c) => c !== "none");
    const next = withoutNone.includes(id)
      ? withoutNone.filter((c) => c !== id)
      : [...withoutNone, id];
    setValue("conditions", next, { shouldValidate: true });
  };

  const handleNext = async () => {
    let isValid = false;
    if (step === 1) {
      isValid = await trigger(["name", "age"]);
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
                subtitle="Tell us a little about yourself."
              />
              <div>
                <label className="block text-sm font-medium text-vital-text">Name</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Suleiman Ahmed"
                  {...register("name")}
                />
                {errors.name && <p className="mt-1 text-sm text-vital-danger">{errors.name.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-vital-text">Age</label>
                <input
                  type="number"
                  className={inputClass}
                  {...register("age")}
                />
                {errors.age && <p className="mt-1 text-sm text-vital-danger">{errors.age.message}</p>}
              </div>
              
              <div className="rounded-md border border-vital-border bg-vital-bg px-3 py-2.5">
                <p className="text-xs font-medium text-vital-muted">City</p>
                <p className="mt-1 flex items-center gap-2 text-vital-text">
                  <MapPin className="h-4 w-4 text-vital-primary" aria-hidden />
                  {APP_CITY}, Pakistan
                </p>
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
                title="Health conditions"
                subtitle="We use this to personalize smog safety advice."
              />
              <fieldset>
                <legend className="text-sm font-medium text-vital-text">
                  Conditions
                </legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {HEALTH_CONDITIONS.map(({ id, label }) => (
                    <label
                      key={id}
                      className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-colors ${
                        (conditions || []).includes(id)
                          ? "border-vital-primary bg-vital-primary/10"
                          : "border-vital-border hover:border-vital-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#00C896]"
                        checked={(conditions || []).includes(id)}
                        onChange={() => toggleCondition(id)}
                      />
                      <span className="text-sm text-vital-text">{label}</span>
                    </label>
                  ))}
                </div>
                {errors.conditions && <p className="mt-1 text-sm text-vital-danger">{errors.conditions.message}</p>}
              </fieldset>
              
              <fieldset>
                <legend className="text-sm font-medium text-vital-text">
                  Pollution sensitivity
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SENSITIVITY_OPTIONS.map(({ value, label }) => (
                    <label
                      key={value}
                      className={`cursor-pointer rounded-md border px-4 py-2 text-sm transition-colors ${
                        sensitivity === value
                          ? "border-vital-primary bg-vital-primary/10 text-vital-primary"
                          : "border-vital-border text-vital-muted hover:text-vital-text"
                      }`}
                    >
                      <input
                        type="radio"
                        value={value}
                        {...register("sensitivity")}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {errors.sensitivity && <p className="mt-1 text-sm text-vital-danger">{errors.sensitivity.message}</p>}
              </fieldset>
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
                title="Daily routine"
                subtitle="Helps our route agent estimate your exposure."
              />
              <fieldset>
                <legend className="text-sm font-medium text-vital-text">
                  Commute mode
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {COMMUTE_OPTIONS.map(({ value, label }) => (
                    <label
                      key={value}
                      className={`cursor-pointer rounded-md border px-3 py-2.5 text-center text-sm transition-colors ${
                        commuteMode === value
                          ? "border-vital-primary bg-vital-primary/10 text-vital-primary"
                          : "border-vital-border text-vital-muted hover:text-vital-text"
                      }`}
                    >
                      <input
                        type="radio"
                        value={value}
                        {...register("commuteMode")}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {errors.commuteMode && <p className="mt-1 text-sm text-vital-danger">{errors.commuteMode.message}</p>}
              </fieldset>
              
              <fieldset>
                <legend className="text-sm font-medium text-vital-text">
                  Daily outdoor time
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {OUTDOOR_OPTIONS.map(({ value, label }) => (
                    <label
                      key={value}
                      className={`cursor-pointer rounded-md border px-3 py-2.5 text-center text-sm transition-colors ${
                        outdoorTime === value
                          ? "border-vital-primary bg-vital-primary/10 text-vital-primary"
                          : "border-vital-border text-vital-muted hover:text-vital-text"
                      }`}
                    >
                      <input
                        type="radio"
                        value={value}
                        {...register("outdoorTime")}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {errors.outdoorTime && <p className="mt-1 text-sm text-vital-danger">{errors.outdoorTime.message}</p>}
              </fieldset>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            type="button"
            className="btn-ghost text-sm disabled:opacity-40"
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
              className="btn-primary text-sm disabled:opacity-50"
              disabled={submitting}
            >
              Next
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button
              type="submit"
              className="btn-primary text-sm disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  Complete profile
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </motion.div>
  );
}
