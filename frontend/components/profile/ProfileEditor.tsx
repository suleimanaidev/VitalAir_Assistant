"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useSession } from "next-auth/react";
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
  defaultProfile,
  useVitalAirStore,
  type CommuteMode,
  type HealthProfile,
  type OutdoorTime,
  type Sensitivity,
} from "@/store/useVitalAirStore";

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

  const [name, setName] = useState(initial.name);
  const [age, setAge] = useState(String(initial.age));
  const [conditions, setConditions] = useState<string[]>(
    initial.conditions.length ? initial.conditions : ["none"]
  );
  const [sensitivity, setSensitivity] = useState<Sensitivity>(
    initial.sensitivity
  );
  const [commuteMode, setCommuteMode] = useState<CommuteMode>(
    initial.commuteMode
  );
  const [outdoorTime, setOutdoorTime] = useState<OutdoorTime>(
    initial.outdoorTime
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stored) return;
    setName(stored.name);
    setAge(String(stored.age));
    setConditions(
      stored.conditions.length ? stored.conditions : ["none"]
    );
    setSensitivity(stored.sensitivity);
    setCommuteMode(stored.commuteMode);
    setOutdoorTime(stored.outdoorTime);
  }, [stored]);

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

  const buildProfile = (): HealthProfile => ({
    name: name.trim(),
    age: Number(age),
    city: APP_CITY,
    conditions: conditions.includes("none") ? [] : conditions,
    sensitivity,
    commuteMode,
    outdoorTime,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    const ageNum = Number(age);
    if (ageNum < 1 || ageNum > 120) {
      setError("Age must be between 1 and 120.");
      return;
    }
    if (conditions.length === 0) {
      setError("Select at least one health condition (or None).");
      return;
    }

    if (!session?.user?.id) {
      setError("You must be signed in to save your profile.");
      return;
    }

    const profile = buildProfile();
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
    <form onSubmit={(e) => void handleSubmit(e)} className="vital-card space-y-8 p-6 sm:p-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-vital-text">About you</h2>
        <label className="block text-sm font-medium text-vital-text">
          Full name
          <input
            required
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
          />
        </label>
        <label className="block text-sm font-medium text-vital-text">
          Age
          <input
            type="number"
            required
            min={1}
            max={120}
            className={inputClass}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            disabled={saving}
          />
        </label>
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
            const active = conditions.includes(id);
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
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-vital-text">Air sensitivity</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {SENSITIVITY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              disabled={saving}
              onClick={() => setSensitivity(value)}
              className={`rounded-lg border px-3 py-2.5 text-sm ${
                sensitivity === value
                  ? "border-vital-primary bg-vital-primary/15 text-vital-primary"
                  : "border-vital-border text-vital-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-vital-text">Commute & outdoors</h2>
        <p className="text-sm font-medium text-vital-muted">Usual commute</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {COMMUTE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              disabled={saving}
              onClick={() => setCommuteMode(value)}
              className={`rounded-lg border px-3 py-2.5 text-sm ${
                commuteMode === value
                  ? "border-vital-primary bg-vital-primary/15 text-vital-primary"
                  : "border-vital-border text-vital-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm font-medium text-vital-muted">
          Daily outdoor time
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {OUTDOOR_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              disabled={saving}
              onClick={() => setOutdoorTime(value)}
              className={`rounded-lg border px-3 py-2.5 text-sm ${
                outdoorTime === value
                  ? "border-vital-primary bg-vital-primary/15 text-vital-primary"
                  : "border-vital-border text-vital-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
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

