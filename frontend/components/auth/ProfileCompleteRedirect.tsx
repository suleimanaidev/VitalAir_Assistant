"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUserHealthProfile } from "@/hooks/useUserHealthProfile";
import { useVitalAirStore } from "@/store/useVitalAirStore";

/** After login, send incomplete profiles to onboarding without blocking sign-in. */
export default function ProfileCompleteRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, profileComplete, isAuthenticated } = useUserHealthProfile();
  const profileCompleteStore = useVitalAirStore((s) => s.profileComplete);
  const isComplete = profileCompleteStore ?? profileComplete;

  useEffect(() => {
    if (loading || !isAuthenticated || pathname !== "/dashboard") return;
    if (isComplete === false) {
      router.replace("/onboarding?setup=1");
    }
  }, [loading, isAuthenticated, isComplete, pathname, router]);

  return null;
}
