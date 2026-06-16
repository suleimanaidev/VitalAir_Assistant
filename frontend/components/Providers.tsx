"use client";

import { SessionProvider } from "next-auth/react";
import ProfileProvider from "@/components/ProfileProvider";
import SessionValidator from "@/components/auth/SessionValidator";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus>
      <SessionValidator />
      <ProfileProvider>{children}</ProfileProvider>
    </SessionProvider>
  );
}
