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
  { title: "Anti-pollution nutrition", text: "Citrus, ginger & green-tea food tips" },
  { title: "Safer commute routes", text: "Lower-pollution path to your destination" },
];

const IMAGES = {
  nutrition: {
    src: "/images/auth-health-nutrition.png",
    alt: "Fresh anti-pollution foods — citrus, greens, ginger and green tea",
  },
  air: {
    src: "/images/auth-clean-air.png",
    alt: "Clean air and healthy lungs over a green city skyline",
  },
} as const;

export default function AuthPageLayout({
  children,
  backHref = "/",
  backLabel = "Back to home",
  panelTitle = "VitalAir",
  panelSubtitle = "Lahore ki hawa, aap ki sehat, aur safe commute — sab ek jagah.",
  features = DEFAULT_FEATURES,
  image = "nutrition",
}: AuthPageLayoutProps) {
  const img = IMAGES[image];

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-10">
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

        <div className="relative">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </Link>

          <div className="mt-12 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur">
              <Wind className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-3xl font-bold tracking-tight text-white">
              Vital<span className="text-vital-primary">Air</span>
            </span>
          </div>

          <p className="mt-4 max-w-sm text-lg leading-relaxed text-white/80">
            {panelSubtitle}
          </p>
        </div>

        <div className="relative my-8 overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
          <Image
            src={img.src}
            alt={img.alt}
            width={1024}
            height={680}
            priority
            className="h-56 w-full object-cover xl:h-72"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#021712]/70 to-transparent"
            aria-hidden
          />
        </div>

        <div className="relative">
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
          <p className="mt-8 border-t border-white/10 pt-5 text-xs text-white/50">
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
