import "server-only";

import { jwtVerify } from "jose";
import { getBackendJwtSecret } from "@/lib/jwtSecret.server";

export interface VerifiedBackendToken {
  userId: string;
  email?: string;
}

/** Verify backend-issued JWT locally — skips a second login API round-trip. */
export async function verifyBackendToken(
  token: string
): Promise<VerifiedBackendToken | null> {
  const secret = getBackendJwtSecret();
  if (!secret || !token.trim()) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { algorithms: ["HS256"] }
    );
    const userId = payload.sub;
    if (!userId || typeof userId !== "string") return null;
    const email =
      typeof payload.email === "string" ? payload.email : undefined;
    return { userId, email };
  } catch {
    return null;
  }
}
