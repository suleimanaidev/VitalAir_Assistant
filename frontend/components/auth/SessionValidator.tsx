"use client";

import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { useVitalAirStore } from "@/store/useVitalAirStore";

function isJwtExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    ) as { exp?: number };
    if (!decoded.exp) return false;
    return decoded.exp * 1000 < Date.now() + 30_000;
  } catch {
    return false;
  }
}

/** Clears expired or invalid JWT sessions — no extra profile API call (ProfileProvider handles that). */
export default function SessionValidator() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      useVitalAirStore.getState().clearHealthProfile();
      return;
    }

    const token = session?.backendToken;
    const userId = session?.user?.id;

    if (!token || !userId || isJwtExpired(token)) {
      useVitalAirStore.getState().clearHealthProfile();
      void signOut({ callbackUrl: "/" });
    }
  }, [status, session?.backendToken, session?.user?.id]);

  return null;
}
