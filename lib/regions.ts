/**
 * World regions for the quiz arena.
 *
 * Two different ideas share the word "region" in this product, so they are kept
 * apart on purpose:
 *
 *   - Market region ("IN" | "US") decides currency, starting capital and which
 *     simulated instruments you can trade. It lives in `users.region`.
 *   - Arena region (this list) is the geographic slice used for the quiz
 *     ladder. It lives in `users.arena_region` and never affects money.
 *
 * Live matchmaking ignores both: queues are global and players are paired by
 * skill rating, so a learner in Oman can meet a learner in Europe. Only the
 * leaderboard is presented region by region.
 */

export type ArenaRegion = {
  id: string;
  label: string;
  group: string;
};

export const ARENA_REGIONS: ArenaRegion[] = [
  // South Asia
  { id: "IN", label: "India", group: "South Asia" },
  { id: "PK", label: "Pakistan", group: "South Asia" },
  { id: "BD", label: "Bangladesh", group: "South Asia" },
  { id: "LK", label: "Sri Lanka", group: "South Asia" },
  { id: "NP", label: "Nepal", group: "South Asia" },

  // North America
  { id: "US", label: "United States", group: "North America" },
  { id: "CA", label: "Canada", group: "North America" },

  // Europe
  { id: "GB", label: "United Kingdom", group: "Europe" },
  { id: "DE", label: "Germany", group: "Europe" },
  { id: "FR", label: "France", group: "Europe" },
  { id: "NL", label: "Netherlands", group: "Europe" },
  { id: "ES", label: "Spain", group: "Europe" },
  { id: "IT", label: "Italy", group: "Europe" },
  { id: "EU", label: "Rest of Europe", group: "Europe" },

  // Middle East
  { id: "OM", label: "Oman", group: "Middle East" },
  { id: "AE", label: "United Arab Emirates", group: "Middle East" },
  { id: "SA", label: "Saudi Arabia", group: "Middle East" },
  { id: "QA", label: "Qatar", group: "Middle East" },
  { id: "KW", label: "Kuwait", group: "Middle East" },
  { id: "BH", label: "Bahrain", group: "Middle East" },
  { id: "IL", label: "Israel", group: "Middle East" },
  { id: "ME", label: "Rest of Middle East", group: "Middle East" },

  // Asia-Pacific
  { id: "SG", label: "Singapore", group: "Asia-Pacific" },
  { id: "MY", label: "Malaysia", group: "Asia-Pacific" },
  { id: "PH", label: "Philippines", group: "Asia-Pacific" },
  { id: "JP", label: "Japan", group: "Asia-Pacific" },
  { id: "KR", label: "South Korea", group: "Asia-Pacific" },
  { id: "CN", label: "China", group: "Asia-Pacific" },
  { id: "AU", label: "Australia", group: "Asia-Pacific" },
  { id: "NZ", label: "New Zealand", group: "Asia-Pacific" },
  { id: "AP", label: "Rest of Asia-Pacific", group: "Asia-Pacific" },

  // Africa
  { id: "ZA", label: "South Africa", group: "Africa" },
  { id: "NG", label: "Nigeria", group: "Africa" },
  { id: "KE", label: "Kenya", group: "Africa" },
  { id: "EG", label: "Egypt", group: "Africa" },
  { id: "AF", label: "Rest of Africa", group: "Africa" },

  // Latin America
  { id: "BR", label: "Brazil", group: "Latin America" },
  { id: "MX", label: "Mexico", group: "Latin America" },
  { id: "AR", label: "Argentina", group: "Latin America" },
  { id: "LA", label: "Rest of Latin America", group: "Latin America" },

  // Anything else
  { id: "OT", label: "Other / not listed", group: "Other" },
];

const BY_ID = new Map(ARENA_REGIONS.map((r) => [r.id, r]));

export const ARENA_REGION_IDS = new Set(ARENA_REGIONS.map((r) => r.id));

export const ARENA_REGION_GROUPS: Array<{ group: string; regions: ArenaRegion[] }> = (() => {
  const out: Array<{ group: string; regions: ArenaRegion[] }> = [];
  for (const region of ARENA_REGIONS) {
    let bucket = out.find((b) => b.group === region.group);
    if (!bucket) {
      bucket = { group: region.group, regions: [] };
      out.push(bucket);
    }
    bucket.regions.push(region);
  }
  return out;
})();

/** Region shown for a stored arena region value, falling back to the market region. */
export function defaultArenaRegion(marketRegion: string | null | undefined): string {
  return marketRegion === "US" ? "US" : "IN";
}

export function arenaRegionLabel(id: string | null | undefined): string {
  if (!id) return "Other";
  return BY_ID.get(id)?.label ?? "Other";
}

export function isArenaRegion(id: unknown): id is string {
  return typeof id === "string" && ARENA_REGION_IDS.has(id);
}

/** Only market regions carry a currency, so the portfolio board stays IN/US. */
export const MARKET_REGIONS = [
  { id: "IN", label: "India", currency: "INR" },
  { id: "US", label: "United States", currency: "USD" },
] as const;
