"use client";

import AdviceBulletList from "@/components/ui/AdviceBulletList";
import { emojiForDietItem, localizeDietPlan } from "@/lib/formatAdvice";

export interface NutritionCardProps {
  items?: string[];
  emptyMessage?: string;
  /** Hide duplicate header when nested inside AgentStepCard */
  embedded?: boolean;
  hasPatientDocs?: boolean;
}

export default function NutritionCard({
  items = [],
  emptyMessage = "Route analyze karein — Punjab/Lahore mein milne wali cheezen yahan suggest hongi.",
  embedded = false,
  hasPatientDocs = false,
}: NutritionCardProps) {
  const localized = localizeDietPlan(items);

    return (
      <div className="mt-4">
        {hasPatientDocs && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-vital-primary/30 bg-vital-primary/10 px-3 py-1.5 text-xs font-medium text-vital-primary shadow-sm">
            <span>🛡️</span> Personalized using your health profile and documents
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {localized.map((item, i) => {
            const emoji = emojiForDietItem(item, i);
            // bold the first few words for emphasis
            const parts = item.split(" ");
            const boldPart = parts.slice(0, 2).join(" ");
            const rest = parts.slice(2).join(" ");

            return (
              <div
                key={i}
                className="group flex flex-col gap-2 rounded-xl border border-vital-border bg-vital-card/60 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-vital-primary/40 hover:bg-vital-card hover:shadow-glow-primary"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vital-bg text-xl shadow-inner transition-transform duration-300 group-hover:scale-110">
                    {emoji}
                  </span>
                  <p className="text-sm font-semibold text-vital-primary">
                    {boldPart}
                  </p>
                </div>
                <p className="text-[13px] leading-relaxed text-vital-muted group-hover:text-vital-text">
                  {rest}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
}
