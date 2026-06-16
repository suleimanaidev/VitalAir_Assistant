import "server-only";

import { existsSync, readFileSync } from "fs";
import { join } from "path";

let fileEnv: Record<string, string> | null = null;

/** Read vitalAir/.env when process.env is empty (Turbopack dev). */
function readRootEnvFile(): Record<string, string> {
  if (fileEnv) return fileEnv;

  for (const filePath of [
    join(process.cwd(), "..", ".env"),
    join(process.cwd(), ".env"),
  ]) {
    if (!existsSync(filePath)) continue;

    const vars: Record<string, string> = {};
    for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
    fileEnv = vars;
    return vars;
  }

  fileEnv = {};
  return fileEnv;
}

function fromEnv(name: string, fallback = ""): string {
  return process.env[name]?.trim() || readRootEnvFile()[name]?.trim() || fallback;
}

export const serverEnv = {
  get waqiApiKey() {
    return fromEnv("WAQI_API_KEY");
  },
  get apiUrl() {
    return fromEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
  },
  get backendUrl() {
    return fromEnv("BACKEND_URL", fromEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000"));
  },
} as const;

export function requireWaqiKey(): string {
  const key = serverEnv.waqiApiKey;
  if (!key) {
    throw new Error("WAQI_API_KEY missing in root .env (vitalAir/.env)");
  }
  return key;
}
