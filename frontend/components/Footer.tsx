"use client";

import Link from "next/link";
import { Heart, MapPin, ShieldCheck, Wind } from "lucide-react";
import { APP_CITY } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-vital-border bg-vital-card/90 pt-16 pb-12 text-vital-text backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 pb-12 border-b border-vital-border/60">
          
          {/* Column 1: Brand & Tagline */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-xl text-vital-text">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-vital-primary/15 text-vital-primary">
                <Wind className="h-5 w-5" aria-hidden />
              </span>
              <span>
                Vital<span className="text-vital-primary">Air</span>
              </span>
            </Link>

            <p className="text-sm leading-relaxed text-vital-muted">
              AI-powered environmental health, doctor-aware RAG precautions, anti-pollution nutrition, and clean route navigation for {APP_CITY}, Pakistan.
            </p>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              18 WAQI Monitors Live · {APP_CITY}
            </div>
          </div>

          {/* Column 2: Navigation Links */}
          <div>
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

          {/* Column 3: Coverage Areas */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-vital-text mb-4">
              {APP_CITY} Live Zones
            </h3>
            <ul className="space-y-2 text-xs text-vital-muted">
              <li className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-vital-primary shrink-0" />
                <span>Civil Secretariat &amp; Lower Mall</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-vital-primary shrink-0" />
                <span>Data Darbar &amp; Bhatti Gate</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-vital-primary shrink-0" />
                <span>Gulberg III &amp; Jail Road</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-vital-primary shrink-0" />
                <span>DHA Phase 5 &amp; Ring Road</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-vital-primary shrink-0" />
                <span>Model Town &amp; Johar Town</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Health Standards & Tech */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-vital-text mb-4">
              Standards &amp; Tech
            </h3>
            <ul className="space-y-2.5 text-xs text-vital-muted">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-vital-primary shrink-0" />
                <span>WHO Air Quality Guidelines</span>
              </li>
              <li>PM2.5 Exposure Index (0–500)</li>
              <li>Personal Exposure Score (PES 0–100)</li>
              <li>Free OSRM Low-AQI Route Engine</li>
              <li>Doctor-Aware OCR Document RAG</li>
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
