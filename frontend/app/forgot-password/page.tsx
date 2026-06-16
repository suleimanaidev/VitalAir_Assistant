import Link from "next/link";
import { ArrowLeft, Wind } from "lucide-react";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="relative min-h-screen bg-grid-pattern pb-12">
      <header className="mx-auto flex max-w-md items-center justify-between px-4 pt-6 sm:max-w-lg">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-vital-muted transition-colors hover:text-vital-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to sign in
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
      <div className="mx-auto max-w-md px-4 pt-8 sm:max-w-lg">
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
