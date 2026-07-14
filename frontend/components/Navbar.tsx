"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  LayoutDashboard,
  LogIn,
  Map,
  History,
  Menu,
  MessageCircle,
  Shield,
  UserCircle,
  Wind,
  X,
} from "lucide-react";
import { useVitalAirStore } from "@/store/useVitalAirStore";
import { authLink } from "@/lib/authLinks";

const LANDING_SECTIONS = [
  { id: "features", label: "Features" },
  { id: "agents", label: "AI Agents" },
  { id: "how-it-works", label: "How It Works" },
] as const;

const APP_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Health AI Chat", icon: MessageCircle },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "Health profile", icon: UserCircle },
  { href: "/route", label: "Map", icon: Map },
] as const;

function sectionHref(pathname: string, id: string) {
  return pathname === "/" ? `#${id}` : `/#${id}`;
}

function authHref(path: string, isAuthenticated: boolean) {
  return authLink(path, isAuthenticated);
}

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const isLoadingSession = status === "loading";
  const isAdmin = session?.user?.role === "admin";

  const appNavLinks = useMemo(
    () =>
      isAdmin
        ? [...APP_LINKS, { href: "/admin", label: "Admin", icon: Shield }]
        : [...APP_LINKS],
    [isAdmin]
  );

  const isHome = pathname === "/";
  const isLoginPage = pathname === "/login";

  /** Guest on marketing home — landing sections only */
  const showLandingNav = isHome && !isAuthenticated && !isLoadingSession;

  /** Signed-in user — app pages only */
  const showAppNav = isAuthenticated;

  /** Login / register screen — minimal chrome */
  const showAuthMinimal = isLoginPage && !isAuthenticated;

  /** Public map etc. before login */
  const showGuestAppLinks =
    !isAuthenticated && !isHome && !isLoginPage && !isLoadingSession;

  const scrollToSection = (id: string) => {
    setMobileOpen(false);
    if (!isHome) return;
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const closeMobile = () => setMobileOpen(false);

  const handleSignOut = () => {
    useVitalAirStore.getState().clearHealthProfile();
    void signOut({ callbackUrl: "/login" });
  };

  const logoHref = isAuthenticated ? "/dashboard" : "/";

  const navLinkClass = (active: boolean) =>
    `text-sm transition-colors hover:text-vital-text ${
      active ? "font-medium text-vital-primary" : "text-vital-muted"
    }`;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-vital-border/60 bg-vital-bg/85 backdrop-blur-md">
      <nav
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        <Link
          href={logoHref}
          className="flex shrink-0 items-center gap-2 text-vital-text transition-colors hover:text-vital-primary"
          onClick={closeMobile}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-vital-primary/15 text-vital-primary">
            <Wind className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Vital<span className="text-vital-primary">Air</span>
          </span>
        </Link>

        {/* Desktop center nav */}
        <ul className="hidden flex-1 items-center justify-center gap-8 md:flex">
          {showLandingNav &&
            LANDING_SECTIONS.map((link) => (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  className={navLinkClass(false)}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(link.id);
                  }}
                >
                  {link.label}
                </a>
              </li>
            ))}

          {showAppNav &&
            appNavLinks.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`inline-flex items-center gap-1.5 ${navLinkClass(pathname === link.href)}`}
                  >
                    <Icon className="h-4 w-4 opacity-80" aria-hidden />
                    {link.label}
                  </Link>
                </li>
              );
            })}

          {showGuestAppLinks &&
            APP_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={authHref(link.href, false)}
                  className={navLinkClass(pathname === link.href)}
                >
                  {link.label}
                </Link>
              </li>
            ))}

          {showAuthMinimal && (
            <li>
              <Link
                href="/"
                className={`inline-flex items-center gap-1.5 ${navLinkClass(false)}`}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back to home
              </Link>
            </li>
          )}
        </ul>

        {/* Desktop actions */}
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          {showLandingNav && (
            <>
              <Link href="/login?callbackUrl=%2Fdashboard" className="btn-ghost text-sm py-2 px-4">
                Sign in
              </Link>
              <Link
                href={authLink("/onboarding", false, "register")}
                className="btn-primary text-sm py-2 px-4"
              >
                Get started
              </Link>
            </>
          )}

          {showAppNav && (
            <>
              <span
                className="max-w-[160px] truncate text-sm text-vital-muted"
                title={session?.user?.email ?? undefined}
              >
                {session?.user?.name ?? session?.user?.email}
              </span>
              <button
                type="button"
                className="btn-ghost text-sm py-2 px-4"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </>
          )}

          {showAuthMinimal && (
            <Link href="/" className="btn-ghost text-sm py-2 px-4">
              Home
            </Link>
          )}

          {showGuestAppLinks && (
            <Link href="/login" className="btn-primary text-sm py-2 px-4">
              <LogIn className="mr-1.5 inline h-4 w-4" aria-hidden />
              Sign in
            </Link>
          )}
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-vital-muted hover:bg-vital-card hover:text-vital-text md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-vital-border bg-vital-card md:hidden"
          >
            <ul className="flex flex-col gap-1 px-4 py-4">
              {showLandingNav &&
                LANDING_SECTIONS.map((link) => (
                  <li key={link.id}>
                    <a
                      href={`#${link.id}`}
                      className="block rounded-md px-3 py-2.5 text-vital-muted hover:bg-vital-bg hover:text-vital-text"
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(link.id);
                      }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}

              {showAppNav &&
                appNavLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`flex items-center gap-2 rounded-md px-3 py-2.5 hover:bg-vital-bg ${
                          pathname === link.href
                            ? "font-medium text-vital-primary"
                            : "text-vital-muted"
                        }`}
                        onClick={closeMobile}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                        {link.label}
                      </Link>
                    </li>
                  );
                })}

              {showGuestAppLinks &&
                APP_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={authHref(link.href, false)}
                      className="block rounded-md px-3 py-2.5 text-vital-muted hover:bg-vital-bg"
                      onClick={closeMobile}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}

              {showAuthMinimal && (
                <li>
                  <Link
                    href="/"
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-vital-muted hover:bg-vital-bg"
                    onClick={closeMobile}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to home
                  </Link>
                </li>
              )}

              <li className="mt-3 flex flex-col gap-2 border-t border-vital-border pt-4">
                {showLandingNav && (
                  <>
                    <Link
                      href="/login?callbackUrl=%2Fdashboard"
                      className="btn-ghost w-full text-center text-sm"
                      onClick={closeMobile}
                    >
                      Sign in
                    </Link>
                    <Link
                      href={authLink("/onboarding", false, "register")}
                      className="btn-primary w-full text-center text-sm"
                      onClick={closeMobile}
                    >
                      Get started
                    </Link>
                  </>
                )}
                {showAppNav && (
                  <button
                    type="button"
                    className="btn-ghost w-full text-center text-sm"
                    onClick={() => {
                      closeMobile();
                      handleSignOut();
                    }}
                  >
                    Sign out
                  </button>
                )}
                {showGuestAppLinks && (
                  <Link
                    href="/login"
                    className="btn-primary w-full text-center text-sm"
                    onClick={closeMobile}
                  >
                    Sign in
                  </Link>
                )}
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

