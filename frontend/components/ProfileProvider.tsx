"use client";

import { useUserHealthProfile } from "@/hooks/useUserHealthProfile";

/** Single profile fetch for the whole app — avoids duplicate /api/profile/me calls. */
export default function ProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useUserHealthProfile();
  return children;
}
