"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.replace("/login?callbackUrl=%2Fadmin");
      return;
    }
    if (session.user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-vital-primary" aria-label="Loading" />
      </div>
    );
  }

  if (session?.user?.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}
