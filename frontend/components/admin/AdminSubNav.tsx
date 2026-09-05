"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, RefreshCw } from "lucide-react";

const LINKS: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/system", label: "System" },
];

export default function AdminSubNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-vital-border pb-4">
      <nav className="flex flex-wrap gap-2" aria-label="Admin sections">
        {LINKS.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-vital-primary/15 text-vital-primary font-semibold"
                  : "text-vital-muted hover:bg-vital-bg hover:text-vital-text"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 shadow-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>Real-Time Live Data</span>
      </div>
    </div>
  );
}
