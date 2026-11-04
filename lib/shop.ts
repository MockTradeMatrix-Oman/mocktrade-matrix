/**
 * Credit shop catalogue.
 *
 * Credits are the learning currency. They can be spent here to top up the
 * simulated brokerage balance (and, for bigger packs, the isolated crypto
 * sandbox). Amounts are always derived from the user's starting capital on the
 * server — the client only ever sends a pack id.
 */

export type ShopPack = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  credits: number;
  /** Fraction of the user's starting capital added to main cash. */
  cashPct: number;
  /** Fraction of the user's starting capital added to the crypto sandbox. */
  cryptoPct: number;
  tone: "green" | "violet" | "amber" | "red";
  highlight?: boolean;
};

export const SHOP_PACKS: ShopPack[] = [
  {
    id: "spark",
    name: "Spark",
    tagline: "A quick top-up",
    description: "Add a little dry powder for your next practice trade.",
    credits: 20,
    cashPct: 0.1,
    cryptoPct: 0,
    tone: "green",
  },
  {
    id: "boost",
    name: "Boost",
    tagline: "Most popular",
    description: "More room to build a diversified practice portfolio.",
    credits: 50,
    cashPct: 0.3,
    cryptoPct: 0.05,
    tone: "violet",
    highlight: true,
  },
  {
    id: "surge",
    name: "Surge",
    tagline: "Serious size",
    description: "A larger book plus a starter allocation for the crypto sandbox.",
    credits: 100,
    cashPct: 0.75,
    cryptoPct: 0.15,
    tone: "amber",
  },
  {
    id: "vault",
    name: "Vault",
    tagline: "Maximum capital",
    description: "The biggest simulated balance, with a meaningful sandbox sleeve.",
    credits: 180,
    cashPct: 1.5,
    cryptoPct: 0.4,
    tone: "red",
  },
];

export function packById(id: string) {
  return SHOP_PACKS.find((p) => p.id === id) ?? null;
}

/** Server-side amount calculation. Always rounded to whole local-currency units. */
export function packAmounts(pack: ShopPack, startCapital: number) {
  const base = Math.max(0, Number(startCapital) || 0);
  return {
    cash: Math.round(base * pack.cashPct),
    crypto: Math.round(base * pack.cryptoPct),
  };
}
