"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import AdminPasswordModal, { isAdminUnlocked } from "@/components/admin/AdminPasswordModal";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.replace("/login?callbackUrl=%2Fadmin");
      return;
    }
    const isAlreadyUnlocked = isAdminUnlocked() || session?.user?.role === "admin";
    setUnlocked(isAlreadyUnlocked);
    setShowModal(!isAlreadyUnlocked);
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-vital-primary" aria-label="Loading" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <AdminPasswordModal
          isOpen={showModal}
          onClose={() => router.push("/dashboard")}
          onSuccess={() => {
            setUnlocked(true);
            setShowModal(false);
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
