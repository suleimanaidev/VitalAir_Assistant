import "server-only";

import { parseApiError } from "@/lib/apiError";
import { normalizeEmail, type AuthResult } from "@/lib/authApi";
import { serverEnv } from "@/lib/env.server";

/** Server-side login — reads root .env via serverEnv (NextAuth authorize). */
export async function loginUserServer(
  email: string,
  password: string
): Promise<AuthResult> {
  let res: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    res = await fetch(`${serverEnv.backendUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: normalizeEmail(email),
        password,
      }),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Server took too long to respond. Please try again.");
    }
    throw new Error(
      "Cannot reach VitalAir server. Start the backend on port 8000 and try again."
    );
  } finally {
    clearTimeout(timer);
  }

  const data = (await res.json().catch(() => ({}))) as unknown;

  if (!res.ok) {
    throw new Error(parseApiError(data, "Invalid email or password."));
  }

  return data as AuthResult;
}
