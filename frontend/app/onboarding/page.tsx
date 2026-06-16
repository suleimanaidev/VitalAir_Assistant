import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import OnboardingGuard from "@/components/auth/OnboardingGuard";
import OnboardingForm from "@/components/OnboardingForm";
import OnboardingIntro from "@/components/onboarding/OnboardingIntro";

function OnboardingFallback() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-28 text-center text-vital-muted">
      Loading…
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <main className="min-h-screen pb-16">
      <Navbar />
      <div className="mx-auto max-w-lg px-4 pt-24 sm:px-6">
        <Suspense fallback={<OnboardingFallback />}>
          <OnboardingGuard>
            <OnboardingIntro />
          </OnboardingGuard>
        </Suspense>
        <Suspense fallback={null}>
          <OnboardingGuard>
            <OnboardingForm />
          </OnboardingGuard>
        </Suspense>
      </div>
    </main>
  );
}
