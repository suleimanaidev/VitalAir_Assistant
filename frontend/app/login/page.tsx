import { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

import AuthPageLayout from "@/components/auth/AuthPageLayout";
import LoginForm from "@/components/auth/LoginForm";

function LoginFallback() {
  return <div className="py-12 text-center text-vital-muted">Loading…</div>;
}

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

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
