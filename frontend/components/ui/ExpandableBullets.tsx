"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toBulletLines } from "@/lib/formatAdvice";

interface ExpandableBulletsProps {
  text?: string;
  items?: string[];
  emojis?: string[];
  emojiFor?: (line: string, index: number) => string;
  maxVisible?: number;
  emptyMessage?: string;
}

export default function ExpandableBullets({
  text,
  items,
  emojis = ["•"],
  emojiFor,
  maxVisible = 4,
  emptyMessage = "No advice yet.",
}: ExpandableBulletsProps) {
  const [expanded, setExpanded] = useState(false);

  const lines = items?.length
    ? items
    : text
      ? toBulletLines(text, 12)
      : [];

  if (lines.length === 0) {
    return <p className="text-sm text-vital-muted">{emptyMessage}</p>;
  }

  const visible = expanded ? lines : lines.slice(0, maxVisible);
  const hasMore = lines.length > maxVisible;

  return (
    <div>
      <ul className="space-y-2.5 text-sm leading-relaxed text-vital-muted">
        {visible.map((line, i) => (
          <li key={`${i}-${line.slice(0, 24)}`} className="flex gap-2">
            <span className="shrink-0" aria-hidden>
              {emojiFor ? emojiFor(line, i) : emojis[i % emojis.length]}
            </span>
            <span>{line.replace(/^[\s•\-*]+/, "")}</span>
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-vital-primary hover:underline"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Read more ({lines.length - maxVisible} more){" "}
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
