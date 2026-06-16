import type { AnalyzeResult } from "@/lib/api";
import { env } from "@/lib/env";
import { useVitalAirStore } from "@/store/useVitalAirStore";
import { mapAnalyzeToResults } from "@/store/useVitalAirStore";

export type AgentLogPayload = {
  agent: string;
  status: "thinking" | "done" | "error";
  message: string;
  timestamp?: string;
};

export type StreamEvent =
  | { type: "connected"; task_id: string }
  | { type: "agent_log"; payload: AgentLogPayload }
  | { type: "result"; payload: AnalyzeResult }
  | { type: "error"; payload: { message: string }; message?: never }
  | { type: "end" }
  /** Legacy in-memory job format */
  | {
      type: "agent";
      agent: string;
      name: string;
      message?: string;
      status: "running" | "done";
    }
  | { type: "complete"; status: string; result: AnalyzeResult }
  | { type: "error"; message: string; payload?: never };

const API_BASE = env.backendUrl.replace(/\/$/, "");

const AGENT_LABELS: Record<string, string> = {
  aqi: "Air Quality Monitor",
  health: "Digital Pulmonologist",
  diet: "Environmental Nutritionist",
  route: "Smart Route Navigator",
};

function handleStreamEvent(event: StreamEvent) {
  const store = useVitalAirStore.getState();

  if (event.type === "agent_log") {
    store.upsertAgentLog({
      agent: event.payload.agent,
      status: event.payload.status,
      message: event.payload.message,
      timestamp: event.payload.timestamp ?? new Date().toISOString(),
    });
    return;
  }

  if (event.type === "result") {
    store.setResults(mapAnalyzeToResults(event.payload));
    store.setStreamStatus("complete");
    return;
  }

  if (event.type === "error") {
    const message =
      ("payload" in event && event.payload?.message) ||
      ("message" in event && event.message) ||
      "Stream error";
    store.upsertAgentLog({
      agent: "System",
      status: "error",
      message,
      timestamp: new Date().toISOString(),
    });
    store.setStreamStatus("error");
    return;
  }

  // Legacy format
  if (event.type === "agent") {
    store.upsertAgentLog({
      agent: AGENT_LABELS[event.agent] ?? event.name,
      status: event.status === "running" ? "thinking" : "done",
      message: event.message ?? (event.status === "done" ? "Completed" : "Working…"),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (event.type === "complete") {
    store.setResults(mapAnalyzeToResults(event.result));
    store.setStreamStatus("complete");
  }
}

async function consumeSseResponse(res: Response): Promise<void> {
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;

      try {
        const json = JSON.parse(line.replace(/^data:\s*/, "")) as StreamEvent;
        if (json.type === "end" || json.type === "connected") continue;
        handleStreamEvent(json);
        if (
          json.type === "result" ||
          json.type === "complete" ||
          json.type === "error"
        ) {
          return;
        }
      } catch {
        /* skip malformed chunk */
      }
    }
  }
}

/** Fetch-based SSE — plan §2.10 GET /api/stream/{task_id} */
export async function streamTask(taskId: string, token?: string): Promise<void> {
  const store = useVitalAirStore.getState();
  store.setStreamStatus("streaming");

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(`${API_BASE}/api/stream/${taskId}`, { headers });

  if (!res.ok) {
    res = await fetch(`${API_BASE}/api/analyze/stream/${taskId}`, { headers });
  }

  if (!res.ok) {
    store.setStreamStatus("error");
    throw new Error(`Stream failed (${res.status})`);
  }

  await consumeSseResponse(res);
}

/** POST /api/analyze → { task_id } (plan §2.10) */
export async function startAnalyzeJob(
  body: unknown,
  token?: string
): Promise<{ task_id: string; job_id?: string }> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail || `Failed to start analysis (${res.status})`);
  }

  const data = (await res.json()) as { task_id: string; job_id?: string };
  return { task_id: data.task_id, job_id: data.job_id ?? data.task_id };
}
