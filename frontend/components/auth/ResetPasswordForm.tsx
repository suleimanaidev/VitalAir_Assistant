"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Wind } from "lucide-react";
import { resetPassword } from "@/lib/authApi";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid reset link. Request a new one from the forgot password page.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(token, password, confirmPassword);
      router.replace("/login?reset=success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
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
        <h1 className="section-title">Reset password</h1>
        <p className="section-subtitle mt-2">Choose a new password for your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="vital-card space-y-4 p-6">
        <label className="block text-sm font-medium text-vital-text">
          New password
          <div className="relative mt-1.5">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-vital-border bg-vital-bg py-2.5 pl-3 pr-10 text-vital-text placeholder:text-vital-muted focus:border-vital-primary focus:outline-none focus:ring-1 focus:ring-vital-primary"
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

        <label className="block text-sm font-medium text-vital-text">
          Confirm password
          <div className="relative mt-1.5">
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-vital-border bg-vital-bg py-2.5 pl-3 pr-10 text-vital-text placeholder:text-vital-muted focus:border-vital-primary focus:outline-none focus:ring-1 focus:ring-vital-primary"
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
              Updating…
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" aria-hidden />
              Update password
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-vital-muted">
        <Link href="/forgot-password" className="text-vital-primary hover:underline">
          Request a new reset link
        </Link>
      </p>
    </div>
  );
}
