"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function ProfileSetupBanner() {
  return (
    <div
      className="sticky top-16 z-40 border-b border-vital-primary/30 bg-vital-bg/95 px-4 py-2.5 backdrop-blur-sm"
      role="status"
    >
      <p className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-vital-text">
        <AlertCircle className="h-4 w-4 shrink-0 text-vital-primary" aria-hidden />
        <span>Complete your one-time health profile for personalized advice.</span>
        <Link
          href="/onboarding?setup=1"
          className="font-medium text-vital-primary underline-offset-2 hover:underline"
        >
          Finish setup
        </Link>
        <span className="text-vital-muted">or</span>
        <Link
          href="/profile"
          className="font-medium text-vital-primary underline-offset-2 hover:underline"
        >
          Health profile
        </Link>
      </p>
    </div>
  );
}
