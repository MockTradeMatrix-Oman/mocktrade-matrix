/**
 * Brand mark: an ascending market line that doubles as a letter M.
 *
 * Drawn on a 40×40 grid with round caps so it stays legible down to 24 px.
 * The right peak sits higher and carries a node — growth, and a data point.
 */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <defs>
        <linearGradient id="mtm-logo" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4cf0b4" />
          <stop offset="1" stopColor="#0e9668" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#mtm-logo)" />
      <rect
        x="0.6"
        y="0.6"
        width="38.8"
        height="38.8"
        rx="11.4"
        stroke="rgba(255,255,255,.28)"
        strokeWidth="1.2"
      />
      <path
        d="M9 29.5V15L20 23.5L31 11.5V29.5"
        stroke="#04140d"
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="31" cy="11.5" r="2.3" fill="#04140d" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo size={compact ? 30 : 34} />
      <div className="leading-none">
        <div className={`font-semibold tracking-tight ${compact ? "text-[14px]" : "text-[15px]"}`}>
          MockTrade <span className="text-[#2fe3a0]">Matrix</span>
        </div>
        <div className="mt-1 text-[8.5px] font-semibold uppercase tracking-[0.24em] text-muted">Simulate · Learn · Earn</div>
      </div>
    </div>
  );
}
