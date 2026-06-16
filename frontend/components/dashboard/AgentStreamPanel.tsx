"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { AlertCircle, Bot, CheckCircle, Loader2 } from "lucide-react";
import { streamTask } from "@/lib/sse";
import { useVitalAirStore, type AgentLog } from "@/store/useVitalAirStore";

const AGENT_ORDER = [
  "Air Quality Monitor",
  "Digital Pulmonologist",
  "Environmental Nutritionist",
  "Smart Route Navigator",
] as const;

const AGENT_ICONS: Record<string, string> = {
  "Air Quality Monitor": "🌫️",
  "Digital Pulmonologist": "🫁",
  "Environmental Nutritionist": "🥦",
  "Smart Route Navigator": "🗺️",
};

type DisplayStatus = AgentLog["status"] | "pending";

function mergeAgentSlots(logs: AgentLog[]): (AgentLog & { displayStatus: DisplayStatus })[] {
  const byName = new Map(logs.map((l) => [l.agent, l]));

  return AGENT_ORDER.map((name, idx) => {
    const existing = byName.get(name);
    if (existing) {
      return { ...existing, displayStatus: existing.status };
    }

    const priorAgents = AGENT_ORDER.slice(0, idx);
    const allPriorDone = priorAgents.every(
      (n) => byName.get(n)?.status === "done"
    );
    const anyPriorActive = priorAgents.some(
      (n) => byName.get(n)?.status === "thinking"
    );

    if (!allPriorDone || anyPriorActive) {
      return {
        agent: name,
        status: "thinking" as const,
        displayStatus: "pending" as const,
        message: "Waiting…",
        timestamp: "",
      };
    }

    return {
      agent: name,
      status: "thinking" as const,
      displayStatus: "pending" as const,
      message: "Waiting…",
      timestamp: "",
    };
  });
}

export default function AgentStreamPanel() {
  const { data: session } = useSession();
  const taskId = useVitalAirStore((s) => s.taskId);
  const agentLogs = useVitalAirStore((s) => s.agentLogs);
  const streamStatus = useVitalAirStore((s) => s.streamStatus);
  const streamedRef = useRef<string | null>(null);

  const isActive =
    streamStatus === "streaming" || (taskId && streamStatus !== "idle");

  useEffect(() => {
    if (!taskId) return;
    if (streamedRef.current === taskId) return;
    streamedRef.current = taskId;

    const token = session?.backendToken;
    void streamTask(taskId, token).catch(() => {
      useVitalAirStore.getState().setStreamStatus("error");
    });
  }, [taskId, session?.backendToken]);

  useEffect(() => {
    if (!taskId) streamedRef.current = null;
  }, [taskId]);

  return (
    <aside className="vital-card flex h-full flex-col p-5">
      <header className="flex items-center gap-2 border-b border-vital-border/50 pb-3">
        <Bot className="h-5 w-5 text-vital-primary" aria-hidden />
        <h2 className="font-semibold">Agent status</h2>
        {streamStatus === "streaming" && (
          <Loader2
            className="ml-auto h-4 w-4 animate-spin text-vital-primary"
            aria-label="Agents working"
          />
        )}
        {streamStatus === "complete" && (
          <span className="ml-auto text-xs font-medium text-vital-primary">
            Done
          </span>
        )}
      </header>

      {(taskId || agentLogs.length > 0) && (
        <ol className="mt-4 space-y-3">
          {mergeAgentSlots(agentLogs).map((log) => (
            <li
              key={log.agent}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-opacity ${
                log.displayStatus === "pending"
                  ? "border-vital-border/20 bg-vital-bg/20 opacity-60"
                  : "border-vital-border/40 bg-vital-bg/40"
              }`}
            >
              <span className="text-lg leading-none" aria-hidden>
                {AGENT_ICONS[log.agent] ?? "🔧"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-vital-text">
                  {log.agent}
                </p>
                <p className="mt-0.5 text-xs text-vital-muted">
                  {log.displayStatus === "done"
                    ? "Completed"
                    : log.displayStatus === "error"
                      ? log.message
                      : log.displayStatus === "pending"
                        ? "Waiting…"
                        : log.message || "Working…"}
                </p>
              </div>
              {log.displayStatus === "thinking" && isActive && (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-400" />
              )}
              {log.displayStatus === "done" && (
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-vital-primary" />
              )}
              {log.displayStatus === "error" && (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-vital-danger" />
              )}
            </li>
          ))}
        </ol>
      )}

      {streamStatus === "idle" && !taskId && (
        <p className="mt-3 text-center text-xs text-vital-muted">
          Four AI agents activate when you analyze a route.
        </p>
      )}
    </aside>
  );
}
