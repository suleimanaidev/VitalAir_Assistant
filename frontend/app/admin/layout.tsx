import Link from "next/link";
import { ArrowLeft, ShieldCheck, Wind } from "lucide-react";
import ProfileSetupGuard from "@/components/auth/ProfileSetupGuard";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminSubNav from "@/components/admin/AdminSubNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProfileSetupGuard>
      <AdminGuard>
        <div className="min-h-screen bg-vital-bg text-vital-text flex flex-col">
          {/* Top Navigation Bar for Admin Panel (No sidebar) */}
          <header className="sticky top-0 z-30 border-b border-vital-border bg-vital-card/90 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <Link
                  href="/admin"
                  className="flex items-center gap-2 font-semibold text-vital-text transition-colors hover:text-vital-primary"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-vital-primary/15 text-vital-primary">
                    <Wind className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-lg font-bold tracking-tight">
                    Vital<span className="text-vital-primary">Air</span>
                  </span>
                </Link>
                <span className="inline-flex items-center gap-1 rounded-md border border-vital-primary/30 bg-vital-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-vital-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Admin Panel
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl border border-vital-border bg-vital-bg/70 px-3.5 py-2 text-sm font-medium text-vital-muted transition-all hover:border-vital-primary/50 hover:bg-vital-primary/10 hover:text-vital-text"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to App</span>
                </Link>
              </div>
            </div>
          </header>

          {/* Admin Main Content */}
          <main className="flex-1">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              <header className="mb-6">
                <h1 className="section-title">Admin Management</h1>
                <p className="section-subtitle">
                  Manage users, medical documents, and system health for VitalAir.
                </p>
              </header>
              <AdminSubNav />
              {children}
            </div>
          </main>
        </div>
      </AdminGuard>
    </ProfileSetupGuard>
  );
}
