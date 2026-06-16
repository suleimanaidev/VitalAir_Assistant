"use client";

import { Bot, Circle, Loader2 } from "lucide-react";

const AGENTS = [
  "AQI Monitor",
  "Health Advisor",
  "Nutrition Agent",
  "Route Planner",
] as const;

export interface AgentStatusPanelProps {
  isLoading?: boolean;
}

/** Shows status of each AI agent; animates while analyze runs */
export default function AgentStatusPanel({
  isLoading = false,
}: AgentStatusPanelProps) {
  return (
    <aside className="vital-card p-5">
      <header className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-vital-primary" aria-hidden />
        <h2 className="font-semibold">Agent status</h2>
        {isLoading && (
          <Loader2
            className="ml-auto h-4 w-4 animate-spin text-vital-primary"
            aria-label="Agents working"
          />
        )}
      </header>
      <ul className="mt-4 space-y-3">
        {AGENTS.map((name) => (
          <li
            key={name}
            className={`flex items-center justify-between text-sm transition-opacity ${
              isLoading ? "opacity-90" : ""
            }`}
          >
            <span className="text-vital-text">{name}</span>
            <span className="flex items-center gap-1.5 text-vital-muted">
              {isLoading ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-vital-primary opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-vital-primary" />
                  </span>
                  <span className="text-vital-primary">running</span>
                </>
              ) : (
                <>
                  <Circle
                    className="h-2 w-2 fill-current text-vital-primary"
                    aria-hidden
                  />
                  active
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
