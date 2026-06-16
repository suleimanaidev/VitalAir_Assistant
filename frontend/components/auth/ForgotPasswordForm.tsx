"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Loader2, Mail, Wind } from "lucide-react";
import { normalizeEmail, requestPasswordReset } from "@/lib/authApi";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setResetUrl(null);
    setIsLoading(true);

    const normalizedEmail = normalizeEmail(email);

    try {
      if (!normalizedEmail.includes("@")) {
        setError("Please enter a valid email address.");
        return;
      }

      const result = await requestPasswordReset(normalizedEmail);
      setMessage(result.message);
      setResetUrl(result.reset_url ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send reset link."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-vital-primary/15 text-vital-primary">
          <Wind className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="section-title">Forgot password</h1>
        <p className="section-subtitle mt-2">
          Enter your email and we&apos;ll help you reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="vital-card space-y-4 p-6">
        <label className="block text-sm font-medium text-vital-text">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            className="mt-1.5 w-full rounded-lg border border-vital-border bg-vital-bg px-3 py-2.5 text-vital-text placeholder:text-vital-muted focus:border-vital-primary focus:outline-none focus:ring-1 focus:ring-vital-primary"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </label>

        {error && (
          <p
            className="rounded-md border border-vital-danger/30 bg-vital-danger/10 px-3 py-2 text-sm text-vital-danger"
            role="alert"
          >
            {error}
          </p>
        )}

        {message && (
          <div
            className="rounded-md border border-vital-primary/30 bg-vital-primary/10 px-3 py-2 text-sm text-vital-text"
            role="status"
          >
            <p>{message}</p>
            {resetUrl && (
              <Link
                href={
                  resetUrl.startsWith("/")
                    ? resetUrl
                    : `${new URL(resetUrl).pathname}${new URL(resetUrl).search}`
                }
                className="mt-2 inline-block font-medium text-vital-primary hover:underline"
              >
                Reset your password →
              </Link>
            )}
          </div>
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
              Sending…
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" aria-hidden />
              Send reset link
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-vital-muted">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-vital-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
