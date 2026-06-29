import ProfileSetupGuard from "@/components/auth/ProfileSetupGuard";
import AppSidebarLayout from "@/components/AppSidebarLayout";
import DashboardView from "@/components/DashboardView";

export default function DashboardPage() {
  return (
    <ProfileSetupGuard>
      <AppSidebarLayout>
        <DashboardView />
      </AppSidebarLayout>
    </ProfileSetupGuard>
  );
}
