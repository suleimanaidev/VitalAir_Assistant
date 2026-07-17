"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
  defaultProfile,
  useVitalAirStore,
  type CommuteMode,
  type HealthProfile,
  type OutdoorTime,
  type Sensitivity,
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

interface ProfileEditorProps {
  onSaved?: () => void;
}

export default function ProfileEditor({ onSaved }: ProfileEditorProps) {
  const { data: session } = useSession();
  const stored = useVitalAirStore((s) => s.healthProfile);
  const setHealthProfile = useVitalAirStore((s) => s.setHealthProfile);
  const setProfileComplete = useVitalAirStore((s) => s.setProfileComplete);

  const initial = stored ?? {
    ...defaultProfile,
    name: session?.user?.name ?? defaultProfile.name,
  };

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: initial.name,
      age: initial.age,
      conditions: initial.conditions.length ? initial.conditions : ["none"],
      sensitivity: initial.sensitivity,
      commuteMode: initial.commuteMode,
      outdoorTime: initial.outdoorTime
    }
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const conditions = watch("conditions");
  const sensitivity = watch("sensitivity");
  const commuteMode = watch("commuteMode");
  const outdoorTime = watch("outdoorTime");

  useEffect(() => {
    if (!stored) return;
    setValue("name", stored.name);
    setValue("age", stored.age);
    setValue("conditions", stored.conditions.length ? stored.conditions : ["none"]);
    setValue("sensitivity", stored.sensitivity);
    setValue("commuteMode", stored.commuteMode);
    setValue("outdoorTime", stored.outdoorTime);
  }, [stored, setValue]);

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
      setMessage("Health profile updated. Route advice will use your latest settings.");
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="vital-card space-y-8 p-6 sm:p-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-vital-text">About you</h2>
        <div>
          <label className="block text-sm font-medium text-vital-text">Full name</label>
          <input
            type="text"
            className={inputClass}
            disabled={saving}
            {...register("name")}
          />
          {errors.name && <p className="mt-1 text-sm text-vital-danger">{errors.name.message}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-vital-text">Age</label>
          <input
            type="number"
            className={inputClass}
            disabled={saving}
            {...register("age")}
          />
          {errors.age && <p className="mt-1 text-sm text-vital-danger">{errors.age.message}</p>}
        </div>
        
        <p className="text-sm text-vital-muted">
          City: <span className="text-vital-text">{APP_CITY}</span> (Lahore-only)
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-vital-text">Health conditions</h2>
        <p className="text-sm text-vital-muted">
          Used for personalized smog and route advice.
        </p>
        <div className="flex flex-wrap gap-2">
          {HEALTH_CONDITIONS.map(({ id, label }) => {
            const active = (conditions || []).includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleCondition(id)}
                disabled={saving}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-vital-primary bg-vital-primary/15 text-vital-primary"
                    : "border-vital-border text-vital-muted hover:border-vital-primary/50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {errors.conditions && <p className="mt-1 text-sm text-vital-danger">{errors.conditions.message}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-vital-text">Air sensitivity</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {SENSITIVITY_OPTIONS.map(({ value, label }) => (
            <label
              key={value}
              className={`cursor-pointer rounded-lg border px-3 py-2.5 text-sm text-center ${
                sensitivity === value
                  ? "border-vital-primary bg-vital-primary/15 text-vital-primary"
                  : "border-vital-border text-vital-muted hover:text-vital-text"
              }`}
            >
              <input
                type="radio"
                value={value}
                {...register("sensitivity")}
                disabled={saving}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
        {errors.sensitivity && <p className="mt-1 text-sm text-vital-danger">{errors.sensitivity.message}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-vital-text">Commute & outdoors</h2>
        <p className="text-sm font-medium text-vital-muted">Usual commute</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {COMMUTE_OPTIONS.map(({ value, label }) => (
            <label
              key={value}
              className={`cursor-pointer rounded-lg border px-3 py-2.5 text-sm text-center ${
                commuteMode === value
                  ? "border-vital-primary bg-vital-primary/15 text-vital-primary"
                  : "border-vital-border text-vital-muted hover:text-vital-text"
              }`}
            >
              <input
                type="radio"
                value={value}
                {...register("commuteMode")}
                disabled={saving}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
        {errors.commuteMode && <p className="mt-1 text-sm text-vital-danger">{errors.commuteMode.message}</p>}

        <p className="mt-4 text-sm font-medium text-vital-muted">
          Daily outdoor time
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {OUTDOOR_OPTIONS.map(({ value, label }) => (
            <label
              key={value}
              className={`cursor-pointer rounded-lg border px-3 py-2.5 text-sm text-center ${
                outdoorTime === value
                  ? "border-vital-primary bg-vital-primary/15 text-vital-primary"
                  : "border-vital-border text-vital-muted hover:text-vital-text"
              }`}
            >
              <input
                type="radio"
                value={value}
                {...register("outdoorTime")}
                disabled={saving}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
        {errors.outdoorTime && <p className="mt-1 text-sm text-vital-danger">{errors.outdoorTime.message}</p>}
      </section>

      {error && (
        <p className="text-sm text-vital-danger" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-vital-primary" role="status">
          {message}
        </p>
      )}

      <button
        type="submit"
        className="btn-primary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
        disabled={saving}
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Saving…
          </>
        ) : (
          <>
            <Save className="h-4 w-4" aria-hidden />
            Save health profile
          </>
        )}
      </button>
    </form>
  );
}
