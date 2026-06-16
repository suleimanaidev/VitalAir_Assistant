"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import ProfileEditor from "@/components/profile/ProfileEditor";
import HealthDocumentsPanel from "@/components/profile/HealthDocumentsPanel";
import { useUserHealthProfile } from "@/hooks/useUserHealthProfile";

export default function ProfilePage() {
  const { loading, error } = useUserHealthProfile();

  return (
    <main className="min-h-screen pb-16">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 pt-24 sm:px-6">
        <header className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-vital-primary">
            <UserCircle className="h-6 w-6" aria-hidden />
            <span className="text-sm font-medium uppercase tracking-wide">
              Your account
            </span>
          </div>
          <h1 className="section-title">Health profile</h1>
          <p className="section-subtitle mt-2">
            Personal details used for AQI alerts, diet tips, and route analysis.
            Only you can see and update this profile.
          </p>
        </header>

        {loading && (
          <p className="mb-4 text-sm text-vital-muted">Loading your profile…</p>
        )}
        {error && (
          <p className="mb-4 rounded-md border border-vital-danger/30 bg-vital-danger/10 px-3 py-2 text-sm text-vital-danger" role="alert">
            {error}. You can still fill the form below and save.
          </p>
        )}

        <ProfileEditor />

        <div className="mt-10">
          <HealthDocumentsPanel />
        </div>

        <p className="mt-8 text-center text-sm text-vital-muted">
          <Link href="/dashboard" className="text-vital-primary hover:underline">
            ← Back to dashboard
          </Link>
        </p>
      </div>
    </main>
  );
}
