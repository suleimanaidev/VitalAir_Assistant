import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

import AuthPageLayout from "@/components/auth/AuthPageLayout";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <AuthPageLayout
      backHref="/login"
      backLabel="Back to sign in"
      image="air"
      panelSubtitle="Password bhool gaye? Email se secure reset link lein — aap ka health data mehfooz rehta hai."
    >
      <ForgotPasswordForm />
    </AuthPageLayout>
  );
}
