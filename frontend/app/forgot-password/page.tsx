import AuthPageLayout from "@/components/auth/AuthPageLayout";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
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
