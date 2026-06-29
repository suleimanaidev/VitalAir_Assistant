"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { normalizeEmail, requestPasswordReset, resetPasswordPath } from "@/lib/authApi";

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
        setError("Valid email address likhein.");
        return;
      }

      const result = await requestPasswordReset(normalizedEmail);
      setMessage(result.message);
      setResetUrl(result.reset_url ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Reset link nahi bhej sakay."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-vital-text sm:text-3xl">
          Password bhool gaye?
        </h1>
        <p className="mt-2 text-base text-vital-muted">
          Email likhein — reset link yahan show hoga (dev mode).
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
            className="rounded-md border border-vital-primary/30 bg-vital-primary/10 px-3 py-3 text-sm text-vital-text"
            role="status"
          >
            <p className="leading-relaxed">{message}</p>
            {resetUrl ? (
              <Link
                href={resetPasswordPath(resetUrl)}
                className="mt-3 inline-flex items-center gap-1 font-semibold text-vital-primary hover:underline"
              >
                Naya password set karein →
              </Link>
            ) : (
              <p className="mt-3 text-xs text-vital-muted">
                Account nahi hai?{" "}
                <Link
                  href="/login?mode=register"
                  className="font-semibold text-vital-primary hover:underline"
                >
                  Register tab se account banayein
                </Link>
              </p>
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
              Bhej rahe hain…
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" aria-hidden />
              Reset link bhejein
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
          Sign in par wapas
        </Link>
      </p>
    </div>
  );
}
