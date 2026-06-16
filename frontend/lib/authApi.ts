import { parseApiError } from "@/lib/apiError";
import { env } from "@/lib/env";

const API_BASE = env.backendUrl.replace(/\/$/, "");

export interface AuthResult {
  access_token: string;
  user_id: string;
  email: string;
  name: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class AuthApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "AuthApiError";
    this.code = code;
  }
}

async function authRequest(
  path: string,
  body: Record<string, string>
): Promise<AuthResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Cannot reach VitalAir server. Start the backend on port 8000 and try again."
    );
  }

  const data = (await res.json().catch(() => ({}))) as unknown;

  if (!res.ok) {
    throw new Error(parseApiError(data, `Request failed (${res.status})`));
  }

  return data as AuthResult;
}

export async function registerUser(
  email: string,
  password: string,
  confirmPassword: string,
  name: string
): Promise<AuthResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: normalizeEmail(email),
        password,
        confirm_password: confirmPassword,
        name: name.trim() || "User",
      }),
    });
  } catch {
    throw new Error(
      "Cannot reach VitalAir server. Start the backend on port 8000 and try again."
    );
  }

  const data = (await res.json().catch(() => ({}))) as unknown;

  if (!res.ok) {
    const message = parseApiError(data, `Request failed (${res.status})`);
    if (res.status === 400 && /already registered/i.test(message)) {
      throw new AuthApiError(
        "You are already registered. Please sign in instead.",
        "ALREADY_REGISTERED"
      );
    }
    throw new Error(message);
  }

  return data as AuthResult;
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResult> {
  return authRequest("/api/auth/login", {
    email: normalizeEmail(email),
    password,
  });
}

export interface ForgotPasswordResult {
  message: string;
  reset_url?: string | null;
}

export async function requestPasswordReset(
  email: string
): Promise<ForgotPasswordResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizeEmail(email) }),
    });
  } catch {
    throw new Error(
      "Cannot reach VitalAir server. Start the backend on port 8000 and try again."
    );
  }

  const data = (await res.json().catch(() => ({}))) as unknown;

  if (!res.ok) {
    throw new Error(parseApiError(data, `Request failed (${res.status})`));
  }

  return data as ForgotPasswordResult;
}

export async function resetPassword(
  token: string,
  password: string,
  confirmPassword: string
): Promise<{ message: string }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        password,
        confirm_password: confirmPassword,
      }),
    });
  } catch {
    throw new Error(
      "Cannot reach VitalAir server. Start the backend on port 8000 and try again."
    );
  }

  const data = (await res.json().catch(() => ({}))) as unknown;

  if (!res.ok) {
    throw new Error(parseApiError(data, `Request failed (${res.status})`));
  }

  return data as { message: string };
}
