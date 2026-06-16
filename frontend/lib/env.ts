/** Client-safe env (no Node.js fs). Server routes use @/lib/env.server */

const trim = (v: string | undefined, fallback: string) =>
  v?.trim() || fallback;

export const env = {
  apiUrl: trim(process.env.NEXT_PUBLIC_API_URL, "http://localhost:8000"),
  backendUrl: trim(
    process.env.BACKEND_URL,
    trim(process.env.NEXT_PUBLIC_API_URL, "http://localhost:8000")
  ),
  nextAuthSecret: trim(
    process.env.NEXTAUTH_SECRET || process.env.VITALAIR_JWT_SECRET,
    "vitalair-dev-nextauth-secret"
  ),
  nextAuthUrl: trim(process.env.NEXTAUTH_URL, "http://localhost:3000"),
} as const;
