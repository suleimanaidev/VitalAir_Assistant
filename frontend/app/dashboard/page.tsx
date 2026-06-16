import ProfileSetupGuard from "@/components/auth/ProfileSetupGuard";
import DashboardView from "@/components/DashboardView";

export default function DashboardPage() {
  return (
    <ProfileSetupGuard>
      <DashboardView />
    </ProfileSetupGuard>
  );
}
