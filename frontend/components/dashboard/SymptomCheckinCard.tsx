"use client";

import { useState } from "react";
import { Check, HeartPulse, Loader2 } from "lucide-react";
import type {
  SymptomCheckinPayload,
  SymptomCheckinResult,
} from "@/lib/api";

interface QuickOption {
  id: string;
  label: string;
  hint: string;
  payload: SymptomCheckinPayload;
  /** "Theek hoon" clears every other selection. */
  exclusive?: boolean;
}

const MAX_SELECTED = 3;

const QUICK_OPTIONS: QuickOption[] = [
  { id: "ok", label: "Theek hoon", hint: "No symptoms", payload: {}, exclusive: true },
  { id: "cough", label: "Halki khaansi", hint: "Cough", payload: { cough: 1 } },
  {
    id: "breath",
    label: "Saans phool rahi",
    hint: "Breathing",
    payload: { breathlessness: 2, chest_tightness: 1 },
  },
  { id: "headache", label: "Sar dard", hint: "Headache", payload: { headache: 1 } },
  { id: "sleep", label: "Neend kharab", hint: "Poor sleep", payload: { sleep_quality: 1 } },
];

function mergePayloads(ids: string[]): SymptomCheckinPayload {
  const merged: SymptomCheckinPayload = {};
  for (const id of ids) {
    const opt = QUICK_OPTIONS.find((o) => o.id === id);
    if (opt) Object.assign(merged, opt.payload);
  }
  return merged;
}

export default function SymptomCheckinCard({
  today,
  loading,
  saving,
  error,
  shouldPrompt,
  onSave,
}: {
  today: SymptomCheckinResult | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  shouldPrompt: boolean;
  onSave: (payload: SymptomCheckinPayload) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (opt: QuickOption) => {
    setSelected((prev) => {
      if (opt.exclusive) {
        return prev.includes(opt.id) ? [] : [opt.id];
      }
      // Remove the exclusive "Theek hoon" when picking a real symptom.
      const withoutExclusive = prev.filter((id) => {
        const o = QUICK_OPTIONS.find((q) => q.id === id);
        return o && !o.exclusive;
      });
      if (withoutExclusive.includes(opt.id)) {
        return withoutExclusive.filter((id) => id !== opt.id);
      }
      if (withoutExclusive.length >= MAX_SELECTED) {
        return withoutExclusive; // limit reached — ignore extra pick
      }
      return [...withoutExclusive, opt.id];
    });
  };

  const handleSave = () => {
    if (!selected.length) return;
    onSave(mergePayloads(selected));
    setSelected([]);
  };

  const realCount = selected.filter((id) => {
    const o = QUICK_OPTIONS.find((q) => q.id === id);
    return o && !o.exclusive;
  }).length;
  const limitReached = realCount >= MAX_SELECTED;

  if (loading) {
    return (
      <section className="vital-card mb-6 flex items-center gap-3 p-4 text-sm text-vital-muted">
        <Loader2 className="h-4 w-4 animate-spin text-vital-primary" aria-hidden />
        Checking today&apos;s health check-in…
      </section>
    );
  }

  if (today && !today.symptoms.skipped) {
    return (
      <section className="vital-card mb-6 border-vital-primary/30 bg-vital-primary/5 p-4">
        <div className="flex items-start gap-3">
          <HeartPulse className="mt-0.5 h-5 w-5 text-vital-primary" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-vital-text">
              Aaj ka health check-in saved
            </p>
            <p className="mt-1 text-sm text-vital-muted">
              {today.summary} Health agent advice ab isko bhi consider karegi.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!shouldPrompt || today?.symptoms.skipped) return null;

  return (
    <section className="vital-card mb-6 border-vital-primary/30 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-vital-primary/15 text-vital-primary">
            <HeartPulse className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-vital-primary">
              10-second check-in
            </p>
            <h2 className="mt-1 text-lg font-bold text-vital-text">
              Aaj health kaisi hai?
            </h2>
            <p className="mt-1 text-sm text-vital-muted">
              Optional — maximum {MAX_SELECTED} symptoms select karein, phir Save dabayein.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="text-left text-sm font-medium text-vital-muted hover:text-vital-text sm:text-right"
          onClick={() => onSave({ skipped: true })}
          disabled={saving}
        >
          Skip today
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_OPTIONS.map((option) => {
          const isSelected = selected.includes(option.id);
          const disableUnselected =
            !isSelected && !option.exclusive && limitReached;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              className={`relative rounded-xl border px-3 py-3 text-left transition-colors disabled:opacity-50 ${
                isSelected
                  ? "border-vital-primary bg-vital-primary/15"
                  : "border-vital-border bg-vital-bg/60 hover:border-vital-primary/50"
              }`}
              onClick={() => toggle(option)}
              disabled={saving || disableUnselected}
            >
              <span className="flex items-center justify-between">
                <span className="block text-sm font-semibold text-vital-text">
                  {option.label}
                </span>
                {isSelected && (
                  <Check className="h-4 w-4 text-vital-primary" aria-hidden />
                )}
              </span>
              <span className="mt-0.5 block text-xs text-vital-muted">
                {option.hint}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          onClick={handleSave}
          disabled={saving || selected.length === 0}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            <>
              <Check className="h-4 w-4" aria-hidden />
              Save check-in
            </>
          )}
        </button>
        {realCount > 0 && (
          <span className="text-xs text-vital-muted">
            {realCount}/{MAX_SELECTED} selected
          </span>
        )}
        {limitReached && (
          <span className="text-xs text-vital-primary">
            Maximum {MAX_SELECTED} reached
          </span>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-vital-danger" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
