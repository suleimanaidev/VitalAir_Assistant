/** Instant sidebar shell while app pages compile — matches AppSidebarLayout. */
export default function AppPageSkeleton() {
  return (
    <div className="min-h-screen bg-vital-bg">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-vital-border bg-vital-card/95 lg:block">
        <div className="animate-pulse space-y-4 p-4">
          <div className="h-10 w-40 rounded-lg bg-vital-border/40" />
          <div className="mt-8 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-11 rounded-xl bg-vital-border/30" />
            ))}
          </div>
        </div>
      </aside>
      <header className="sticky top-0 z-40 flex h-16 items-center border-b border-vital-border bg-vital-bg/90 px-4 lg:hidden">
        <div className="h-6 w-28 animate-pulse rounded bg-vital-border/40" />
      </header>
      <div className="animate-pulse px-4 py-8 lg:pl-72 sm:px-6 lg:px-8">
        <div className="mb-6 h-9 w-56 rounded bg-vital-border/40" />
        <div className="mb-4 h-4 w-72 rounded bg-vital-border/30" />
        <div className="vital-card mb-4 h-32 rounded-xl" />
        <div className="space-y-4">
          <div className="vital-card h-48 rounded-xl" />
          <div className="vital-card h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
