"use client";

import { usePathname } from "next/navigation";
import { useUserHealthProfile } from "@/hooks/useUserHealthProfile";
import { isProfileSetupPath } from "@/lib/profileFlow";
import { useVitalAirStore } from "@/store/useVitalAirStore";
import ProfileSetupBanner from "@/components/auth/ProfileSetupBanner";

/**
 * Never blocks navigation — all app pages stay open.
 * Shows a reminder banner until the one-time health profile is saved.
 */
export default function ProfileSetupGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { loading, profileComplete, isAuthenticated } = useUserHealthProfile();
  const profileCompleteStore = useVitalAirStore((s) => s.profileComplete);
  const isComplete = profileCompleteStore ?? profileComplete;

  const showBanner =
    isAuthenticated &&
    !loading &&
    isComplete === false &&
    !isProfileSetupPath(pathname);

  return (
    <>
      {showBanner && <ProfileSetupBanner />}
      {children}
    </>
  );
}
