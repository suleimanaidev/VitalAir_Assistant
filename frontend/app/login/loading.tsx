export default function LoginLoading() {
  return (
    <main className="relative min-h-screen bg-grid-pattern pb-12">
      <div className="mx-auto flex max-w-md animate-pulse flex-col px-4 pt-24">
        <div className="mb-6 h-9 w-56 rounded bg-vital-border/40" />
        <div className="mb-4 h-4 w-full rounded bg-vital-border/30" />
        <div className="vital-card space-y-4 p-6">
          <div className="h-10 rounded-lg bg-vital-border/30" />
          <div className="h-10 rounded-lg bg-vital-border/30" />
          <div className="h-11 rounded-lg bg-vital-primary/20" />
        </div>
      </div>
    </main>
  );
}
