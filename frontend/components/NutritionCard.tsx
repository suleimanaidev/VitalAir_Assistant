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
  emptyMessage = "Analyze an area or route — personalized nutrition recommendations will appear here.",
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
        {localized.map((rawItem, i) => {
          // Extract bracketed tag [Nashta (Breakfast) • Monsoon] if present
          let tag: string | null = null;
          let content = rawItem;

          const tagMatch = rawItem.match(/^\[(.*?)\]\s*(.*)$/);
          if (tagMatch) {
            tag = tagMatch[1].replace(/[\u{1F300}-\u{1F9FF}]/gu, "").trim();
            content = tagMatch[2];
          }

          // Strip any remaining emojis from content
          content = content.replace(/[\u{1F300}-\u{1F9FF}]/gu, "").trim();

          // Split by dash "—" if available
          let title = content;
          let description = "";

          if (content.includes("—")) {
            const dashParts = content.split("—");
            title = dashParts[0].trim();
            description = dashParts.slice(1).join("—").trim();
          } else {
            const parts = content.split(" ");
            title = parts.slice(0, 2).join(" ");
            description = parts.slice(2).join(" ");
          }

          return (
            <div
              key={i}
              className="group flex flex-col gap-2 rounded-xl border border-vital-border bg-vital-card/60 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-vital-primary/40 hover:bg-vital-card hover:shadow-glow-primary"
            >
              {tag && (
                <div className="flex items-center gap-1.5">
                  <span className="rounded-md border border-vital-primary/30 bg-vital-primary/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-vital-primary">
                    {tag}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-vital-text">
                  {title}
                </p>
              </div>
              {description && (
                <p className="text-[13.5px] leading-relaxed text-vital-muted group-hover:text-vital-text">
                  {description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
