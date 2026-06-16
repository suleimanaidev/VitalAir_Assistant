"use client";

import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { useVitalAirStore } from "@/store/useVitalAirStore";

function isJwtExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: number;
    };
    if (!decoded.exp) return false;
    return decoded.exp * 1000 < Date.now() + 30_000;
  } catch {
    return false;
  }
}

/**
 * Clears stale NextAuth sessions so the navbar never shows a user when not
 * actually signed in (expired/missing backend token or 401 from API).
 */
export default function SessionValidator() {
  const { data: session, status } = useSession();
  const verifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      verifiedRef.current = null;
      useVitalAirStore.getState().clearHealthProfile();
      return;
    }

    const token = session?.backendToken;
    const userId = session?.user?.id;

    if (!token || !userId) {
      verifiedRef.current = null;
      useVitalAirStore.getState().clearHealthProfile();
      void signOut({ callbackUrl: "/" });
      return;
    }

    if (isJwtExpired(token)) {
      verifiedRef.current = null;
      useVitalAirStore.getState().clearHealthProfile();
      void signOut({ callbackUrl: "/" });
      return;
    }

    const verifyKey = `${userId}:${token.slice(-12)}`;
    if (verifiedRef.current === verifyKey) return;
    verifiedRef.current = verifyKey;

    void fetch("/api/profile/me", { cache: "no-store", credentials: "same-origin" })
      .then((res) => {
        if (res.status === 401) {
          verifiedRef.current = null;
          useVitalAirStore.getState().clearHealthProfile();
          void signOut({ callbackUrl: "/" });
        }
      })
      .catch(() => {
        /* network blip — keep session; profile hook will retry */
      });
  }, [status, session?.backendToken, session?.user?.id]);

  return null;
}
