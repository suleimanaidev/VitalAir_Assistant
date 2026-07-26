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
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center lg:p-16 lg:px-20">
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

        {/* Floating back button at top left of brand panel */}
        <div className="absolute left-16 top-10">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </Link>
        </div>

        {/* Centered Content Wrapper */}
        <div className="relative flex flex-col gap-6 max-w-md w-full my-auto">
          {/* Logo & Brand title */}
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur">
              <Wind className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-3xl font-bold tracking-tight text-white">
              Vital<span className="text-vital-primary">Air</span>
            </span>
          </div>

          {/* Subtitle / Tagline */}
          <p className="text-lg leading-relaxed text-white/80">
            {panelSubtitle}
          </p>

          {/* Simplified Single Visual Preview Card */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 shadow-xl my-2">
            <Image
              src={image === "nutrition" ? "/images/auth_foods.png" : "/images/auth_health.png"}
              alt="VitalAir preview panel"
              width={600}
              height={300}
              priority
              className="h-44 w-full object-cover transition-transform duration-700 group-hover:scale-105 xl:h-52"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#021712]/95 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-5">
              <p className="text-sm font-semibold tracking-wide text-white drop-shadow-md">
                {image === "nutrition" ? "Seasonal anti-pollution nutrition advice" : "Real-time air quality & health alerts"}
              </p>
            </div>
          </div>

          {/* Features check bullets */}
          <ul className="space-y-4">
            {features.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-vital-primary"
                  aria-hidden
                />
                <div>
                  <p className="font-semibold text-white">{f.title}</p>
                  <p className="text-sm text-white/70">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Divider and Footer */}
          <p className="border-t border-white/10 pt-5 text-xs text-white/50">
            Free OSRM routing · WHO-based guidance · Your data stays private.
          </p>
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
