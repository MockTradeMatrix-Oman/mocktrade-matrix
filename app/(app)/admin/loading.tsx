export default function AdminLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="skeleton h-2.5 w-36" />
          <div className="skeleton h-8 w-64 max-w-[70vw]" />
          <div className="skeleton h-2.5 w-80 max-w-[80vw]" />
        </div>
        <div className="skeleton h-9 w-32 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>

      <div className="skeleton h-52 rounded-2xl" />
      <div className="skeleton h-72 rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>

      <div className="flex items-center justify-center gap-2 text-[11px] text-muted">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/15 border-t-[#b3a8ff]" />
        Opening the admin console…
      </div>
    </div>
  );
}
