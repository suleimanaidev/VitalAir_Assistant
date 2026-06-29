import type {
  AgentHealthResult,
  AgentNutritionResult,
  AgentRouteResult,
} from "@/lib/api";
import { env } from "@/lib/env";
import type { AgentLogPayload } from "@/lib/sse";

export type AgentStreamKind = "health" | "nutrition" | "route";

type AgentResultMap = {
  health: AgentHealthResult;
  nutrition: AgentNutritionResult;
  route: AgentRouteResult;
};

type StreamEvent =
  | { type: "agent_log"; payload: AgentLogPayload }
  | {
      type: "agent_result";
      payload: { kind: AgentStreamKind; result: unknown };
    }
  | { type: "error"; payload: { message: string } }
  | { type: "end" }
  | { type: "connected"; task_id: string };

const API_BASE = env.backendUrl.replace(/\/$/, "");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface AgentStreamOptions {
  onProgress?: (message: string, agent: string, status: string) => void;
}

async function openStream(
  taskId: string,
  headers: Record<string, string>
): Promise<Response & { body: ReadableStream<Uint8Array> }> {
  let lastStatus = 0;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      let res = await fetch(`${API_BASE}/api/stream/${taskId}`, { headers });
      if (!res.ok) {
        res = await fetch(`${API_BASE}/api/analyze/stream/${taskId}`, {
          headers,
        });
      }

      lastStatus = res.status;
      if (res.ok && res.body) {
        return res as Response & { body: ReadableStream<Uint8Array> };
      }
    } catch {
      /* Retry below. */
    }

    await sleep(600 * (attempt + 1));
  }

  throw new Error(
    lastStatus
      ? `Stream failed (${lastStatus})`
      : "Backend connection interrupted. Please try again."
  );
}

/** Subscribe to GET /api/stream/{task_id} until agent_result or error. */
export async function streamAgentJob<K extends AgentStreamKind>(
  taskId: string,
  kind: K,
  token?: string,
  options?: AgentStreamOptions
): Promise<AgentResultMap[K]> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await openStream(taskId, headers);

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

      let json: StreamEvent;
      try {
        json = JSON.parse(line.replace(/^data:\s*/, "")) as StreamEvent;
      } catch {
        continue;
      }

      if (json.type === "end" || json.type === "connected") continue;

      if (json.type === "agent_log") {
        options?.onProgress?.(
          json.payload.message,
          json.payload.agent,
          json.payload.status
        );
        continue;
      }

      if (json.type === "agent_result" && json.payload.kind === kind) {
        return json.payload.result as AgentResultMap[K];
      }

      if (json.type === "error") {
        throw new Error(json.payload.message || "Agent failed");
      }
    }
  }

  throw new Error("Agent stream ended without a result");
}
