import { Suspense } from "react";

import AuthPageLayout from "@/components/auth/AuthPageLayout";
import LoginForm from "@/components/auth/LoginForm";

function LoginFallback() {
  return <div className="py-12 text-center text-vital-muted">Loading…</div>;
}

export default function LoginPage() {
  return (
    <AuthPageLayout
      backHref="/"
      backLabel="Back to home"
      image="nutrition"
      panelSubtitle="Lahore ki hawa, aap ki sehat, aur safe commute — sab ek jagah."
    >
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </AuthPageLayout>
  );
}
