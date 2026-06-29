"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2, LogIn, UserPlus, Eye, EyeOff, Mail, Lock, User, Wind } from "lucide-react";
import {
  registerUser,
  loginUser,
  normalizeEmail,
  AuthApiError,
  type AuthResult,
} from "@/lib/authApi";
import { env } from "@/lib/env";
import { APP_CITY } from "@/lib/constants";
import { useVitalAirStore } from "@/store/useVitalAirStore";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const urlError = searchParams.get("error");
  const setUserId = useVitalAirStore((s) => s.setUserId);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const submitLockRef = useRef(false);

  useEffect(() => {
    router.prefetch("/login");
    router.prefetch("/dashboard");
    router.prefetch("/onboarding");
    // Warm NextAuth CSRF so sign-in skips an extra round-trip
    void fetch("/api/auth/csrf", { cache: "no-store" }).catch(() => {});
  }, [router]);

  useEffect(() => {
    if (searchParams.get("mode") === "register") {
      setMode("register");
    }
    if (searchParams.get("reset") === "success") {
      setSuccessMessage("Password updated. You can sign in now.");
      setMode("login");
    }
  }, [searchParams]);

  useEffect(() => {
    if (urlError === "Configuration") {
      setError(
        "Auth setup issue: ensure root .env has NEXTAUTH_SECRET and NEXTAUTH_URL matches your browser URL (e.g. http://localhost:3000). Restart frontend after editing .env."
      );
    }
  }, [urlError]);

  useEffect(() => {
    fetch(`${env.apiUrl.replace(/\/$/, "")}/api/health/live`, {
      signal: AbortSignal.timeout(5000),
    })
      .then((r) => setBackendOk(r.ok))
      .catch(() => setBackendOk(false));
  }, []);

  const finishSession = async (auth: AuthResult) => {
    const result = await signIn("credentials", {
      email: auth.email,
      password,
      accessToken: auth.access_token,
      userId: auth.user_id,
      name: auth.name,
      redirect: false,
    });

    if (result?.error) {
      if (result.error === "Configuration") {
        throw new Error(
          "Server auth misconfigured. Check NEXTAUTH_SECRET in root .env and restart npm run dev:frontend."
        );
      }
      if (result.error === "CredentialsSignin") {
        throw new Error("Invalid email or password.");
      }
      throw new Error(result.error);
    }

    if (result?.ok !== true) {
      throw new Error("Sign in failed. Please try again.");
    }

    setUserId(auth.user_id);

    const safeCallback =
      callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
        ? callbackUrl
        : "/dashboard";

    window.location.assign(safeCallback);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitLockRef.current || isLoading) return;

    submitLockRef.current = true;
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const normalizedEmail = normalizeEmail(email);
    let succeeded = false;

    try {
      if (!normalizedEmail.includes("@")) {
        setError("Please enter a valid email address.");
        return;
      }

      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }

      if (backendOk === false) {
        setError(
          "Backend is offline. Run: npm run dev:backend (port 8000), then try again."
        );
        return;
      }

      if (mode === "register") {
        if (!name.trim()) {
          setError("Please enter your name.");
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        const registered = await registerUser(
          normalizedEmail,
          password,
          confirmPassword,
          name.trim()
        );
        await finishSession(registered);
      } else {
        const auth = await loginUser(normalizedEmail, password);
        await finishSession(auth);
      }
      succeeded = true;
    } catch (err) {
      if (
        err instanceof AuthApiError &&
        err.code === "ALREADY_REGISTERED"
      ) {
        setSuccessMessage(err.message);
        setMode("login");
        return;
      }

      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      if (!succeeded) {
        submitLockRef.current = false;
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6">
        <span className="mb-4 hidden h-12 w-12 items-center justify-center rounded-2xl bg-vital-primary/15 text-vital-primary lg:flex">
          <Wind className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold text-vital-text sm:text-3xl">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-base text-vital-muted">
          {mode === "login"
            ? `Sign in to continue — ${APP_CITY} smog safety & health.`
            : `Join VitalAir — ${APP_CITY} air, health & safer routes.`}
        </p>
      </div>

      <div className="mb-5 flex rounded-xl border border-vital-border bg-vital-card p-1">
        <button
          type="button"
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
            mode === "login"
              ? "bg-vital-primary text-vital-bg shadow-[0_4px_18px_rgba(0,200,150,0.35)]"
              : "text-vital-muted hover:text-vital-text"
          }`}
          onClick={() => {
            setMode("login");
            setError(null);
            setSuccessMessage(null);
            setConfirmPassword("");
          }}
          disabled={isLoading}
        >
          <LogIn className="h-4 w-4" />
          Sign in
        </button>
        <button
          type="button"
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
            mode === "register"
              ? "bg-vital-primary text-vital-bg shadow-[0_4px_18px_rgba(0,200,150,0.35)]"
              : "text-vital-muted hover:text-vital-text"
          }`}
          onClick={() => {
            setMode("register");
            setError(null);
            setSuccessMessage(null);
          }}
          disabled={isLoading}
        >
          <UserPlus className="h-4 w-4" />
          Register
        </button>
      </div>

      {backendOk === false && (
        <p className="mb-4 rounded-md border border-vital-danger/40 bg-vital-danger/10 px-3 py-2 text-sm text-vital-danger">
          Backend not reachable at {env.apiUrl}. Start it with{" "}
          <code className="text-vital-text">npm run dev:backend</code>
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="vital-card space-y-4 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur"
      >
        {mode === "register" && (
          <label className="block text-sm font-medium text-vital-text">
            Full name
            <div className="relative mt-1.5">
              <User
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vital-muted"
                aria-hidden
              />
              <input
                required
                className="w-full rounded-lg border border-vital-border bg-vital-bg py-2.5 pl-10 pr-3 text-vital-text placeholder:text-vital-muted focus:border-vital-primary focus:outline-none focus:ring-1 focus:ring-vital-primary"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </label>
        )}
        <label className="block text-sm font-medium text-vital-text">
          Email
          <div className="relative mt-1.5">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vital-muted"
              aria-hidden
            />
            <input
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-vital-border bg-vital-bg py-2.5 pl-10 pr-3 text-vital-text placeholder:text-vital-muted focus:border-vital-primary focus:outline-none focus:ring-1 focus:ring-vital-primary"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </label>
        <label className="block text-sm font-medium text-vital-text">
          <span className="flex items-center justify-between gap-2">
            Password
            {mode === "login" && (
              <Link
                href="/forgot-password"
                className="text-xs font-normal text-vital-primary hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </span>
          <div className="relative mt-1.5">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vital-muted"
              aria-hidden
            />
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              className="w-full rounded-lg border border-vital-border bg-vital-bg py-2.5 pl-10 pr-10 text-vital-text placeholder:text-vital-muted focus:border-vital-primary focus:outline-none focus:ring-1 focus:ring-vital-primary"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-vital-muted transition-colors hover:text-vital-text"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
        </label>

        {mode === "register" && (
          <label className="block text-sm font-medium text-vital-text">
            Confirm password
            <div className="relative mt-1.5">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vital-muted"
                aria-hidden
              />
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-vital-border bg-vital-bg py-2.5 pl-10 pr-10 text-vital-text placeholder:text-vital-muted focus:border-vital-primary focus:outline-none focus:ring-1 focus:ring-vital-primary"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-vital-muted transition-colors hover:text-vital-text"
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          </label>
        )}

        {successMessage && (
          <p
            className="rounded-md border border-vital-primary/30 bg-vital-primary/10 px-3 py-2 text-sm text-vital-text"
            role="status"
          >
            {successMessage}
          </p>
        )}

        {error && (
          <p
            className="rounded-md border border-vital-danger/30 bg-vital-danger/10 px-3 py-2 text-sm text-vital-danger"
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary inline-flex w-full items-center justify-center gap-2 py-3"
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {mode === "login" ? "Signing in…" : "Creating account…"}
            </>
          ) : mode === "login" ? (
            <>
              <LogIn className="h-4 w-4" aria-hidden />
              Sign in to VitalAir
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" aria-hidden />
              Create account
            </>
          )}
        </button>
      </form>
    </div>
  );
}
