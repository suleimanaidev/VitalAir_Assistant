"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, MapPin } from "lucide-react";
import ProgressBar from "@/components/ProgressBar";
import {
  COMMUTE_OPTIONS,
  HEALTH_CONDITIONS,
  OUTDOOR_OPTIONS,
  SENSITIVITY_OPTIONS,
  inputClass,
} from "@/lib/healthProfileOptions";
import {
  profilePayloadFromHealth,
  updateMyProfile,
} from "@/lib/profileApi";
import { APP_CITY } from "@/lib/constants";
import {
  useVitalAirStore,
  type CommuteMode,
  type HealthProfile,
  type OutdoorTime,
  type Sensitivity,
  defaultProfile,
} from "@/store/useVitalAirStore";
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

  const [name, setName] = useState(defaultProfile.name);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session?.user?.name]);
  const [age, setAge] = useState(String(defaultProfile.age));
  const [conditions, setConditions] = useState<string[]>([]);
  const [sensitivity, setSensitivity] = useState<Sensitivity>(
    defaultProfile.sensitivity
  );
  const [commuteMode, setCommuteMode] = useState<CommuteMode>(
    defaultProfile.commuteMode
  );
  const [outdoorTime, setOutdoorTime] = useState<OutdoorTime>(
    defaultProfile.outdoorTime
  );

  const toggleCondition = (id: string) => {
    if (id === "none") {
      setConditions(["none"]);
      return;
    }
    setConditions((prev) => {
      const withoutNone = prev.filter((c) => c !== "none");
      return withoutNone.includes(id)
        ? withoutNone.filter((c) => c !== id)
        : [...withoutNone, id];
    });
  };

  const step1Valid =
    name.trim().length > 0 && Number(age) >= 1 && Number(age) <= 120;
  const step2Valid = conditions.length > 0;

  const handleNext = () => {
    if (step < 3) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const buildProfile = (): HealthProfile => ({
    name: name.trim(),
    age: Number(age),
    city: APP_CITY,
    conditions: conditions.includes("none") ? [] : conditions,
    sensitivity,
    commuteMode,
    outdoorTime,
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    const profile = buildProfile();
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

      <form
        className="mt-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 3) void handleSubmit();
          else if ((step === 1 && step1Valid) || (step === 2 && step2Valid))
            handleNext();
        }}
      >
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
              <label className="block text-sm font-medium text-vital-text">
                Name
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Suleiman Ahmed"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-vital-text">
                Age
                <input
                  type="number"
                  min={1}
                  max={120}
                  className={inputClass}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                />
              </label>
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
                        conditions.includes(id)
                          ? "border-vital-primary bg-vital-primary/10"
                          : "border-vital-border hover:border-vital-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#00C896]"
                        checked={conditions.includes(id)}
                        onChange={() => toggleCondition(id)}
                      />
                      <span className="text-sm text-vital-text">{label}</span>
                    </label>
                  ))}
                </div>
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
                        name="sensitivity"
                        className="sr-only"
                        checked={sensitivity === value}
                        onChange={() => setSensitivity(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
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
                        name="commute"
                        className="sr-only"
                        checked={commuteMode === value}
                        onChange={() => setCommuteMode(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
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
                        name="outdoor"
                        className="sr-only"
                        checked={outdoorTime === value}
                        onChange={() => setOutdoorTime(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
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
              type="submit"
              className="btn-primary text-sm disabled:opacity-50"
              disabled={
                submitting ||
                (step === 1 && !step1Valid) ||
                (step === 2 && !step2Valid)
              }
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
