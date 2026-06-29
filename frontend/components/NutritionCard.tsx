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

  if (embedded) {
    return (
      <div>
        {hasPatientDocs && (
          <p className="mb-3 text-xs text-vital-primary">
            Personalized using your health profile and uploaded documents.
          </p>
        )}
        <AdviceBulletList
          items={localized}
          emojiFor={emojiForDietItem}
          maxVisible={4}
          variant="simple"
          emptyMessage={emptyMessage}
        />
      </div>
    );
  }

  return (
    <article className="vital-card flex h-full flex-col border-2 border-vital-primary/25 p-5 sm:p-6">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-vital-primary">
          Nutrition tips
        </p>
        <p className="mt-1 text-sm text-vital-muted">
          Aap ki health profile aur AQI ke mutabiq khana peena
        </p>
      </header>
      <AdviceBulletList
        items={localized}
        emojiFor={emojiForDietItem}
        maxVisible={4}
        variant="simple"
        emptyMessage={emptyMessage}
      />
    </article>
  );
}
