"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/system", label: "System" },
];

export default function AdminSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-6 flex flex-wrap gap-2 border-b border-vital-border pb-4"
      aria-label="Admin sections"
    >
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-vital-primary/15 text-vital-primary"
                : "text-vital-muted hover:bg-vital-bg hover:text-vital-text"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
