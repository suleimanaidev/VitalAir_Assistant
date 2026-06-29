import { Suspense } from "react";
import AuthPageLayout from "@/components/auth/AuthPageLayout";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

function ResetFallback() {
  return <div className="py-12 text-center text-vital-muted">Loading…</div>;
}

export default function ResetPasswordPage() {
  return (
    <AuthPageLayout
      backHref="/login"
      backLabel="Back to sign in"
      image="air"
      panelSubtitle="Naya strong password set karein — phir dashboard par AQI aur safe routes check karein."
    >
      <Suspense fallback={<ResetFallback />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthPageLayout>
  );
}
