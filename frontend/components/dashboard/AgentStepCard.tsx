"use client";

import { Loader2, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export type AgentStepStatus = "idle" | "loading" | "done" | "error" | "locked";

export interface AgentStepCardProps {
  step: number;
  icon: string;
  title: string;
  subtitle?: string;
  status: AgentStepStatus;
  onRun?: () => void;
  runLabel?: string;
  disabled?: boolean;
  error?: string | null;
  liveMessage?: string | null;
  children?: ReactNode;
}

const statusRing: Record<AgentStepStatus, string> = {
  idle: "border-vital-border",
  loading: "border-vital-primary/60 shadow-glow",
  done: "border-vital-primary/40",
  error: "border-vital-danger/50",
  locked: "border-vital-border/50 opacity-70",
};

export default function AgentStepCard({
  step,
  icon,
  title,
  subtitle,
  status,
  onRun,
  runLabel = "Run agent",
  disabled = false,
  error,
  liveMessage,
  children,
}: AgentStepCardProps) {
  const showRun =
    onRun && status !== "loading" && status !== "locked" && status !== "done";

  return (
    <article
      className={`vital-card overflow-hidden border-2 transition-colors ${statusRing[status]}`}
    >
      <header className="flex items-start gap-4 border-b border-vital-border/40 bg-vital-bg/40 p-4 sm:p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-vital-primary/15 text-xl">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-vital-muted">
            Step {step}
          </p>
          <h2 className="text-lg font-semibold text-vital-text">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-vital-muted">{subtitle}</p>
          ) : null}
        </div>
        <div className="shrink-0">
          {status === "loading" && (
            <Loader2
              className="h-6 w-6 animate-spin text-vital-primary"
              aria-label="Running"
            />
          )}
          {status === "done" && (
            <span className="rounded-full bg-vital-primary/15 px-2.5 py-1 text-xs font-medium text-vital-primary">
              Ready
            </span>
          )}
          {status === "locked" && (
            <span className="text-xs text-vital-muted">Locked</span>
          )}
        </div>
      </header>

      <div className="p-4 sm:p-5">
        {status === "loading" && liveMessage && (
          <p
            className="mb-3 flex items-center gap-2 rounded-lg border border-vital-primary/25 bg-vital-primary/5 px-3 py-2 text-sm text-vital-text"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-vital-primary" />
            <span>{liveMessage}</span>
          </p>
        )}

        {children}

        {error && (
          <p className="mt-3 text-sm text-vital-danger" role="alert">
            {error}
          </p>
        )}

        {showRun && (
          <button
            type="button"
            className="btn-primary mt-4 inline-flex items-center gap-2"
            onClick={onRun}
            disabled={disabled}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {runLabel}
          </button>
        )}

        {status === "done" && onRun && (
          <button
            type="button"
            className="btn-ghost mt-4 text-sm"
            onClick={onRun}
            disabled={disabled}
          >
            Run again
          </button>
        )}
      </div>
    </article>
  );
}
