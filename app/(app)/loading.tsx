export default function AppLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="skeleton h-2.5 w-28" />
          <div className="skeleton h-7 w-64 max-w-[70vw]" />
          <div className="skeleton h-2.5 w-44" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-8 w-20 rounded-lg" />
          <div className="skeleton h-8 w-28 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="skeleton h-64 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>

      <div className="skeleton h-40 rounded-2xl" />
      <span className="sr-only">Loading your workspace…</span>
    </div>
  );
}
