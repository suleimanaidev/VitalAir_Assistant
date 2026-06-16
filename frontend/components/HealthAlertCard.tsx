"use client";

import { AlertTriangle } from "lucide-react";
import ExpandableBullets from "@/components/ui/ExpandableBullets";
import { emojiForHealthItem } from "@/lib/formatAdvice";

export interface HealthAlertCardProps {
  title?: string;
  message?: string;
  severity?: "info" | "warning" | "critical";
  sourceHint?: string;
}

export default function HealthAlertCard({
  title = "Health advisory",
  message = "",
  severity = "warning",
  sourceHint,
}: HealthAlertCardProps) {
  const styles = {
    info: "border-vital-primary/40 bg-vital-primary/5",
    warning: "border-[#f0c040]/40 bg-[#f0c040]/5",
    critical: "border-vital-danger/40 bg-vital-danger/5",
  };

  const iconStyles = {
    info: "text-vital-primary",
    warning: "text-[#f0c040]",
    critical: "text-vital-danger",
  };

  return (
    <article className={`vital-card flex h-full flex-col border p-5 ${styles[severity]}`}>
      <header className="flex items-center gap-2">
        <AlertTriangle className={`h-5 w-5 ${iconStyles[severity]}`} aria-hidden />
        <h2 className="font-semibold text-vital-text">{title}</h2>
      </header>
      <div className="mt-4 flex-1">
        <ExpandableBullets
          text={message}
          emojiFor={emojiForHealthItem}
          maxVisible={4}
          emptyMessage="Run a route analysis for personalized health guidance."
        />
      </div>
      {sourceHint && (
        <p className="mt-3 border-t border-vital-border/40 pt-3 text-xs text-vital-muted">
          {sourceHint}
        </p>
      )}
    </article>
  );
}
