"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface AdviceBulletListProps {
  items: string[];
  emojiFor?: (line: string, index: number) => string;
  maxVisible?: number;
  emptyMessage?: string;
  /** Larger text for health/diet guidance */
  variant?: "default" | "guidance" | "simple";
}

export default function AdviceBulletList({
  items,
  emojiFor,
  maxVisible = 5,
  emptyMessage = "No advice yet.",
  variant = "default",
}: AdviceBulletListProps) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return <p className="text-base text-vital-muted">{emptyMessage}</p>;
  }

  const visible = expanded ? items : items.slice(0, maxVisible);
  const hasMore = items.length > maxVisible;
  const isGuidance = variant === "guidance";
  const isSimple = variant === "simple";

  return (
    <div>
      <ul className={isGuidance ? "space-y-3" : isSimple ? "space-y-2" : "space-y-2.5"}>
        {visible.map((line, i) => {
          const clean = line.replace(/^[\s•\-*]+/, "");
          const emoji = isSimple ? null : emojiFor ? emojiFor(clean, i) : "•";
          return (
            <li
              key={`${i}-${clean.slice(0, 28)}`}
              className={
                isGuidance
                  ? "flex gap-3 rounded-lg border border-vital-border/60 bg-vital-bg/70 px-3.5 py-3"
                  : isSimple
                    ? "flex gap-2 rounded-lg bg-vital-bg/50 px-3 py-2.5"
                    : "flex gap-2"
              }
            >
              {emoji && (
                <span
                  className={`shrink-0 ${isGuidance ? "text-xl leading-none" : "text-base"}`}
                  aria-hidden
                >
                  {emoji}
                </span>
              )}
              <span
                className={
                  isGuidance || isSimple
                    ? "text-[15px] font-normal leading-relaxed text-vital-text sm:text-base"
                    : "text-sm leading-relaxed text-vital-muted"
                }
              >
                {clean}
              </span>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-vital-primary hover:bg-vital-primary/10"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? (
            <>
              Kam dikhayein <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Aur {items.length - maxVisible} tips ({items.length} total){" "}
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
