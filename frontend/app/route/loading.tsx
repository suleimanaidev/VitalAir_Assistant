import Navbar from "@/components/Navbar";

export default function RouteLoading() {
  return (
    <main className="min-h-screen pb-12">
      <Navbar />
      <div className="mx-auto max-w-6xl animate-pulse px-4 pt-24 sm:px-6 lg:px-8">
        <div className="mb-2 h-8 w-56 rounded bg-vital-border/40" />
        <div className="mb-8 h-4 w-72 rounded bg-vital-border/30" />
        <div className="vital-card h-[420px] rounded-xl" />
      </div>
    </main>
  );
}
