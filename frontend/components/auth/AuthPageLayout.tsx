import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Wind } from "lucide-react";

export interface AuthFeature {
  title: string;
  text: string;
}

interface AuthPageLayoutProps {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  /** Kept for backwards compatibility — layout is always split-screen now. */
  minimal?: boolean;
  panelTitle?: string;
  panelSubtitle?: string;
  features?: AuthFeature[];
  /** Which side image to show on the brand panel. */
  image?: "nutrition" | "air";
}

const DEFAULT_FEATURES: AuthFeature[] = [
  { title: "Live air quality", text: "Real WAQI AQI for any Lahore area" },
  { title: "Personal health guidance", text: "Asthma, age & season aware advice" },
  { title: "Anti-pollution nutrition", text: "Apples, greens, and fresh seasonal foods" },
  { title: "Safer commute routes", text: "Lower-pollution path to your destination" },
];

export default function AuthPageLayout({
  children,
  backHref = "/",
  backLabel = "Back to home",
  panelTitle = "VitalAir",
  panelSubtitle = "Lahore ki hawa, aap ki sehat, aur safe commute — sab ek jagah.",
  features = DEFAULT_FEATURES,
  image = "nutrition",
}: AuthPageLayoutProps) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-10 lg:px-12">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#04241d] via-[#06402f] to-[#021712]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.07]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-vital-primary/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-vital-primary/10 blur-3xl"
          aria-hidden
        />

        {/* Floating back button at top left */}
        <div className="absolute left-10 top-8">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </Link>
        </div>

        {/* Centered Compact Content Wrapper — Matches Login Card Size */}
        <div className="relative flex flex-col gap-4 max-w-md w-full my-auto rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-2xl">
          {/* Logo & Brand title */}
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-vital-primary/20 text-vital-primary">
              <Wind className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-2xl font-bold tracking-tight text-white">
              Vital<span className="text-vital-primary">Air</span>
            </span>
          </div>

          {/* Subtitle / Tagline */}
          <p className="text-sm text-white/80 leading-relaxed">
            {panelSubtitle}
          </p>

          {/* Clean Bullet Points List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-2.5 text-xs text-white/90">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-vital-primary" />
              <span><strong className="text-white">Real-time Lahore AQI</strong> — Har ilaqay ki live air quality updates</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-white/90">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-vital-primary" />
              <span><strong className="text-white">Personal Health Advisory</strong> — Asthma aur respiratory safety guidance</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-white/90">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-vital-primary" />
              <span><strong className="text-white">Anti-Smog Diet</strong> — Seasonal immunity booster food tips</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-white/90">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-vital-primary" />
              <span><strong className="text-white">Low-Pollution Routes</strong> — Commute ke liye kam exposure wale raste</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-white/90">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-vital-primary" />
              <span><strong className="text-white">Medical Report OCR</strong> — Prescriptions aur lab reports ka RAG analysis</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <section className="relative flex min-h-screen flex-col overflow-hidden bg-vital-bg">
        <div
          className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-vital-primary/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-vital-primary/5 blur-3xl"
          aria-hidden
        />
        {/* Mobile top bar with logo + back link */}
        <header className="relative flex items-center justify-between px-5 pt-6 lg:hidden">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-vital-muted transition-colors hover:text-vital-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-vital-text hover:text-vital-primary"
            aria-label="VitalAir home"
          >
            <Wind className="h-5 w-5 text-vital-primary" aria-hidden />
            <span className="font-semibold">
              Vital<span className="text-vital-primary">Air</span>
            </span>
          </Link>
        </header>

        <div className="relative flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </section>
    </main>
  );
}
