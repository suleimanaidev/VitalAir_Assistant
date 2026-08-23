"use client";

import Link from "next/link";
import { Heart, MapPin, ShieldCheck, Wind } from "lucide-react";
import { APP_CITY } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-vital-border bg-vital-card/90 pt-16 pb-12 text-vital-text backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 pb-12 border-b border-vital-border/60">
          
          {/* Column 1: Brand & Tagline */}
          <div className="space-y-4 max-w-md">
            <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-xl text-vital-text">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-vital-primary/15 text-vital-primary">
                <Wind className="h-5 w-5" aria-hidden />
              </span>
              <span>
                Vital<span className="text-vital-primary">Air</span>
              </span>
            </Link>

            <p className="text-sm leading-relaxed text-vital-muted">
              AI-powered environmental health, medical RAG precautions, anti-pollution nutrition, and clean route navigation.
            </p>
          </div>

          {/* Column 2: Navigation Links */}
          <div className="sm:ml-auto">
            <h3 className="text-sm font-bold uppercase tracking-wider text-vital-text mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2.5 text-sm text-vital-muted">
              <li>
                <Link href="/dashboard" className="hover:text-vital-primary transition-colors">
                  AI Agent Dashboard
                </Link>
              </li>
              <li>
                <Link href="/chat" className="hover:text-vital-primary transition-colors">
                  Health AI RAG Chat
                </Link>
              </li>
              <li>
                <Link href="/history" className="hover:text-vital-primary transition-colors">
                  Exposure History &amp; Trends
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-vital-primary transition-colors">
                  My Health Profile
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-8 flex items-center justify-center sm:justify-between gap-4 text-xs text-vital-muted">
          <p>© 2026 VitalAir Assistant. Crafted with <Heart className="inline h-3.5 w-3.5 text-vital-primary fill-vital-primary/20" /> for {APP_CITY}, Pakistan.</p>
        </div>
      </div>
    </footer>
  );
}
