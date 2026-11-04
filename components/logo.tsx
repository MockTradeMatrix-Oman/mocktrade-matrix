export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <defs>
        <linearGradient id="mtm-logo" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4cf0b4" />
          <stop offset="1" stopColor="#14a874" />
        </linearGradient>
        <linearGradient id="mtm-logo-line" x1="8" y1="28" x2="32" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#04140d" />
          <stop offset="1" stopColor="#0a3527" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="url(#mtm-logo)" />
      <rect x="1" y="1" width="38" height="38" rx="11" stroke="rgba(255,255,255,.25)" strokeWidth="1" />
      <path d="M9 26.5L15.5 20L20.5 24L30 12.5" stroke="url(#mtm-logo-line)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="30" cy="12.5" r="2.4" fill="#04140d" />
      <path d="M9 31.5H31" stroke="#04140d" strokeOpacity=".28" strokeWidth="1.6" strokeLinecap="round" />
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
