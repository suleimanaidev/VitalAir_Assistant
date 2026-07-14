import ProfileSetupGuard from "@/components/auth/ProfileSetupGuard";
import AppSidebarLayout from "@/components/AppSidebarLayout";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminSubNav from "@/components/admin/AdminSubNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProfileSetupGuard>
      <AppSidebarLayout>
        <AdminGuard>
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <header className="mb-6">
              <h1 className="section-title">Admin panel</h1>
              <p className="section-subtitle">
                Manage users, documents, and system health for VitalAir.
              </p>
            </header>
            <AdminSubNav />
            {children}
          </div>
        </AdminGuard>
      </AppSidebarLayout>
    </ProfileSetupGuard>
  );
}
