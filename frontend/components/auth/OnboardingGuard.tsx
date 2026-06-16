"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserHealthProfile } from "@/hooks/useUserHealthProfile";
import { useVitalAirStore } from "@/store/useVitalAirStore";

/** Redirect users who already completed profile away from first-time onboarding. */
export default function OnboardingGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstSetup = searchParams.get("setup") === "1";
  const { loading, profileComplete, isAuthenticated } = useUserHealthProfile();
  const profileCompleteStore = useVitalAirStore((s) => s.profileComplete);
  const isComplete = profileCompleteStore ?? profileComplete;

  useEffect(() => {
    if (!isFirstSetup || loading || !isAuthenticated) return;
    if (isComplete === true) {
      router.replace("/profile");
    }
  }, [isFirstSetup, loading, isAuthenticated, isComplete, router]);

  return <>{children}</>;
}
