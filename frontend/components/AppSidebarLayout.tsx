"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  History,
  LayoutDashboard,
  LogIn,
  LogOut,
  Map,
  Menu,
  MessageCircle,
  UserCircle,
  Wind,
  X,
} from "lucide-react";
import { useVitalAirStore } from "@/store/useVitalAirStore";
import { authLink } from "@/lib/authLinks";

const APP_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Health AI Chat", icon: MessageCircle },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "Health profile", icon: UserCircle },
  { href: "/route", label: "Map", icon: Map },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppSidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuthenticated = status === "authenticated";

  useEffect(() => {
    if (!isAuthenticated) return;
    for (const link of APP_LINKS) {
      router.prefetch(link.href);
    }
  }, [isAuthenticated, router]);

  const handleSignOut = () => {
    useVitalAirStore.getState().clearHealthProfile();
    void signOut({ callbackUrl: "/login" });
  };

  const SidebarContent = () => (
    <>
      <Link
        href={isAuthenticated ? "/dashboard" : "/"}
        className="flex items-center gap-3 px-4 py-3 text-vital-text transition-colors hover:text-vital-primary"
        onClick={() => setMobileOpen(false)}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-vital-primary/15 text-vital-primary">
          <Wind className="h-5 w-5" aria-hidden />
        </span>
        <span className="text-xl font-semibold tracking-tight">
          Vital<span className="text-vital-primary">Air</span>
        </span>
      </Link>

      <div className="mt-6 px-3">
        <p className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-vital-muted">
          App
        </p>
        <nav className="mt-3 space-y-1" aria-label="Application navigation">
          {APP_LINKS.map((link) => {
            const Icon = link.icon;
            const active = isActive(pathname, link.href);
            const href = isAuthenticated ? link.href : authLink(link.href, false);

            return (
              <Link
                key={link.href}
                href={href}
                prefetch
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all ${
                  active
                    ? "border border-vital-primary/40 bg-vital-primary/15 text-vital-primary shadow-[0_0_24px_rgba(0,200,150,0.12)]"
                    : "text-vital-muted hover:bg-vital-bg hover:text-vital-text"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-vital-border p-4">
        {isAuthenticated ? (
          <>
            <div className="mb-3 rounded-xl bg-vital-bg/70 px-3 py-2">
              <p className="truncate text-sm font-medium text-vital-text">
                {session?.user?.name ?? "VitalAir user"}
              </p>
              <p className="truncate text-xs text-vital-muted">
                {session?.user?.email}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-vital-border px-3 py-2.5 text-sm font-medium text-vital-muted transition-colors hover:border-vital-primary/50 hover:text-vital-text"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </>
        ) : (
          <Link
            href="/login?callbackUrl=%2Fdashboard"
            onClick={() => setMobileOpen(false)}
            className="btn-primary w-full text-sm"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            Sign in
          </Link>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-vital-bg">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-vital-border bg-vital-card/95 p-3 shadow-2xl shadow-black/20 lg:flex">
        <SidebarContent />
      </aside>

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-vital-border bg-vital-bg/90 px-4 backdrop-blur-md lg:hidden">
        <Link
          href={isAuthenticated ? "/dashboard" : "/"}
          className="flex items-center gap-2 font-semibold text-vital-text"
        >
          <Wind className="h-5 w-5 text-vital-primary" aria-hidden />
          Vital<span className="text-vital-primary">Air</span>
        </Link>
        <button
          type="button"
          className="rounded-lg border border-vital-border p-2 text-vital-muted hover:text-vital-text"
          onClick={() => setMobileOpen(true)}
          aria-label="Open app navigation"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-80 max-w-[85vw] flex-col border-r border-vital-border bg-vital-card p-3 shadow-2xl">
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg p-2 text-vital-muted hover:bg-vital-bg hover:text-vital-text"
              onClick={() => setMobileOpen(false)}
              aria-label="Close app navigation"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="lg:pl-72">{children}</div>
    </div>
  );
}
