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
  minimal?: boolean;
  panelTitle?: string;
  panelSubtitle?: string;
  features?: AuthFeature[];
  image?: "nutrition" | "air";
}

const DEFAULT_FEATURES: AuthFeature[] = [
  { title: "Real-time Lahore AQI", text: "Har ilaqay ki live air quality updates" },
  { title: "Personal Health Advisory", text: "Asthma aur respiratory safety guidance" },
  { title: "Anti-Smog Diet", text: "Seasonal immunity booster food tips" },
  { title: "Low-Pollution Routes", text: "Commute ke liye kam exposure wale raste" },
  { title: "Medical Report OCR", text: "Prescriptions aur lab reports ka RAG analysis" },
];

export default function AuthPageLayout({
  children,
  backHref = "/",
  backLabel = "Back to home",
  panelSubtitle = "Lahore ki hawa, aap ki sehat, aur safe commute — sab ek jagah.",
  features = DEFAULT_FEATURES,
}: AuthPageLayoutProps) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand side-panel */}
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-10 lg:px-12 bg-gradient-to-br from-[var(--auth-gradient-from)] via-[var(--auth-gradient-via)] to-[var(--auth-gradient-to)] transition-colors duration-300">
        {/* Ambient Radial Background Glows */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-vital-primary/20 blur-3xl dark:bg-vital-primary/25 dark:blur-[120px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-vital-primary/15 blur-3xl dark:bg-vital-primary/20 dark:blur-[100px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.05] dark:opacity-[0.1]"
          aria-hidden
        />

        {/* Floating back button at top left */}
        <div className="absolute left-10 top-8 z-10">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-vital-muted transition-colors hover:text-vital-primary dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </Link>
        </div>

        {/* Centered Glassmorphic Content Card */}
        <div className="relative z-10 flex flex-col gap-5 max-w-md w-full my-auto rounded-2xl border border-brand-border/70 bg-white/80 p-7 backdrop-blur-xl shadow-xl shadow-brand/10 dark:border-vital-primary/30 dark:bg-[#0D1815]/75 dark:shadow-2xl dark:shadow-vital-primary/15 transition-all">
          {/* Logo & Brand title */}
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-vital-primary/15 text-vital-primary ring-1 ring-vital-primary/30 shadow-sm">
              <Wind className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-2xl font-bold tracking-tight text-vital-text dark:text-white">
              Vital<span className="text-vital-primary">Air</span>
            </span>
          </div>

          {/* Subtitle / Tagline */}
          <p className="text-sm text-vital-muted dark:text-emerald-100/80 leading-relaxed font-normal">
            {panelSubtitle}
          </p>

          {/* Clean Bullet Points List */}
          <div className="space-y-3 pt-1 border-t border-brand-border/40 dark:border-white/10">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3 text-xs">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-vital-primary" />
                <span className="text-vital-muted dark:text-slate-300">
                  <strong className="text-vital-text dark:text-white font-semibold">{f.title}</strong> — {f.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <section className="relative flex min-h-screen flex-col overflow-hidden bg-vital-bg text-vital-text transition-colors duration-300">
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
