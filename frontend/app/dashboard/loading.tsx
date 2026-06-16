import Navbar from "@/components/Navbar";

export default function DashboardLoading() {
  return (
    <main className="min-h-screen pb-16">
      <Navbar />
      <div className="mx-auto max-w-6xl animate-pulse px-4 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8 h-8 w-48 rounded bg-vital-border/40" />
        <div className="vital-card mb-6 h-24 rounded-xl" />
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="vital-card h-52 rounded-xl" />
          <div className="vital-card h-52 rounded-xl" />
          <div className="vital-card h-52 rounded-xl" />
        </div>
      </div>
    </main>
  );
}
