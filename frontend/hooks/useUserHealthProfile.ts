"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  fetchMyProfile,
  healthProfileFromApi,
} from "@/lib/profileApi";
import { useVitalAirStore } from "@/store/useVitalAirStore";

/** Load the signed-in user's health profile from MongoDB into Zustand. */
export function useUserHealthProfile() {
  const { data: session, status } = useSession();
  const setHealthProfile = useVitalAirStore((s) => s.setHealthProfile);
  const setProfileCompleteStore = useVitalAirStore((s) => s.setProfileComplete);
  const setUserId = useVitalAirStore((s) => s.setUserId);
  const healthProfile = useVitalAirStore((s) => s.healthProfile);
  
  const storeProfileComplete = useVitalAirStore((s) => s.profileComplete);
  const storeUserId = useVitalAirStore((s) => s.userId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localProfileComplete, setLocalProfileComplete] = useState<boolean | null>(null);

  const isCached = storeProfileComplete !== null && storeUserId === session?.user?.id;
  const profileComplete = isCached ? storeProfileComplete : localProfileComplete;

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      setLocalProfileComplete(null);
      setLoading(false);
      return;
    }

    const store = useVitalAirStore.getState();
    if (store.profileComplete !== null && store.userId === session.user.id) {
      setLocalProfileComplete(store.profileComplete);
      setLoading(false);
      return;
    }

    setUserId(session.user.id);

    if (!session.backendToken) {
      setError("Session expired. Please sign in again.");
      setLocalProfileComplete(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchMyProfile()
      .then((data) => {
        if (cancelled) return;
        setLocalProfileComplete(data.profile_complete);
        setProfileCompleteStore(data.profile_complete);
        if (data.profile_complete) {
          setHealthProfile(healthProfileFromApi(data.profile));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Could not load profile";
        if (msg.toLowerCase().includes("unauthorized") || msg.includes("401")) {
          useVitalAirStore.getState().clearHealthProfile();
          void signOut({ callbackUrl: "/login" });
          return;
        }
        setLocalProfileComplete(false);
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    status,
    session?.user?.id,
    session?.backendToken,
    setHealthProfile,
    setProfileCompleteStore,
    setUserId,
  ]);

  return {
    loading: (status === "loading" && !isCached) || loading,
    error,
    profileComplete,
    isAuthenticated: status === "authenticated",
    healthProfile,
    session,
  };
}
