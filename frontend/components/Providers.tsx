"use client";

import { SessionProvider } from "next-auth/react";
import ProfileProvider from "@/components/ProfileProvider";
import ProfileCompleteRedirect from "@/components/auth/ProfileCompleteRedirect";
import SessionValidator from "@/components/auth/SessionValidator";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <SessionValidator />
      <ProfileProvider>
        <ProfileCompleteRedirect />
        {children}
      </ProfileProvider>
    </SessionProvider>
  );
}
