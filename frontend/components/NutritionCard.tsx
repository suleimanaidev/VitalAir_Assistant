"use client";

import { Apple } from "lucide-react";
import ExpandableBullets from "@/components/ui/ExpandableBullets";
import { emojiForDietItem } from "@/lib/formatAdvice";

export interface NutritionCardProps {
  items?: string[];
  emptyMessage?: string;
}

export default function NutritionCard({
  items = [],
  emptyMessage = "Run route analysis for personalized nutrition tips.",
}: NutritionCardProps) {
  return (
    <article className="vital-card flex h-full flex-col p-5">
      <header className="flex items-center gap-2">
        <Apple className="h-5 w-5 text-vital-primary" aria-hidden />
        <h2 className="font-semibold">Nutrition tips</h2>
      </header>
      <div className="mt-4 flex-1">
        <ExpandableBullets
          items={items}
          emojiFor={emojiForDietItem}
          maxVisible={4}
          emptyMessage={emptyMessage}
        />
      </div>
    </article>
  );
}
