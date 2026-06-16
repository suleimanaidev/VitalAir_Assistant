"use client";

import { useSearchParams } from "next/navigation";

export default function OnboardingIntro() {
  const searchParams = useSearchParams();
  const isFirstSetup = searchParams.get("setup") === "1";

  return (
    <div className="mb-8 text-center">
      <h1 className="section-title">
        {isFirstSetup ? "Welcome — set up your health profile" : "Health profile"}
      </h1>
      <p className="section-subtitle mx-auto">
        {isFirstSetup
          ? "One-time setup after registration — tell us about your health so we can personalize smog alerts, diet tips, and routes for Lahore."
          : "Update your health details anytime from Profile after this first setup."}
      </p>
    </div>
  );
}
