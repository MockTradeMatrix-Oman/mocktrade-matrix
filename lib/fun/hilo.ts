/**
 * HiLo, the MockTrade Matrix mascot.
 *
 * HiLo is deliberately rule-based. Every line below is chosen from real
 * learner state passed in by the server: quests actually ready to claim,
 * modules actually finished, a real league rank, a real boss window. There
 * is no language model and no invented progress. Keeping the module pure
 * means the same function can render on the server or in a client card.
 */
export type HiloMood = "happy" | "hyped" | "focused" | "proud" | "sleepy" | "concerned";

export type HiloInput = {
  name: string;
  hour: number;
  streak: number;
  freezeUnused: number;
  questsClaimable: number;
  questsDone: number;
  modulesDone: number;
  modulesTotal: number;
  nextModuleTitle: string | null;
  lightningBest: number;
  lightningRuns: number;
  hasTraded: boolean;
  certificateReady: boolean;
  certificates: number;
  premium: boolean;
  league: { tierLabel: string; rank: number | null; size: number; daysLeft: number } | null;
  boss: { name: string; daysLeft: number; passed: boolean; premium: boolean } | null;
};

export type HiloCard = {
  mood: HiloMood;
  headline: string;
  message: string;
  tip: string;
  cta: { label: string; href: string } | null;
  chips: string[];
};

const TIPS = [
  "Position size is a risk decision, not an afterthought.",
  "A stop-loss is only useful if you place it before you need it.",
  "Diversification works because you cannot predict which holding wins.",
  "Fees are certain. Returns are not. Count the fees first.",
  "If you cannot explain a trade in one sentence, it is probably too complicated.",
  "Cash is a position. Holding it is a decision, not a failure.",
  "Read the balance sheet before the headline.",
  "The market can stay irrational longer than a leveraged account can stay solvent.",
  "Small losses are tuition. Large losses are eviction.",
  "Compounding rewards time in the market, not timing the market.",
];

function firstName(name: string) {
  const clean = name.trim().split(/\s+/)[0];
  return clean || "there";
}

function tipFor(dayKey: string) {
  let h = 2166136261;
  for (let i = 0; i < dayKey.length; i += 1) {
    h ^= dayKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return TIPS[(h >>> 0) % TIPS.length];
}

export function hiloFor(input: HiloInput, dayKey: string): HiloCard {
  const name = firstName(input.name);
  const tip = tipFor(dayKey);
  const chips: string[] = [];
  if (input.streak > 0) chips.push(`${input.streak}-day streak`);
  if (input.freezeUnused > 0) {
    chips.push(`${input.freezeUnused} freeze${input.freezeUnused === 1 ? "" : "s"} held`);
  }
  if (input.league?.rank && input.league.size > 1) {
    chips.push(`${input.league.tierLabel} #${input.league.rank}`);
  }

  if (input.questsClaimable > 0) {
    return {
      mood: "hyped",
      headline: `${name}, your quests are ready.`,
      message:
        input.questsClaimable === 1
          ? "One daily quest is finished and its reward is sitting unclaimed."
          : `${input.questsClaimable} daily quests are finished and their rewards are unclaimed.`,
      tip,
      cta: { label: "Claim rewards", href: "/quests" },
      chips,
    };
  }

  if (input.certificateReady) {
    return {
      mood: "proud",
      headline: "The final gate is open.",
      message: `Every module is complete. The final assessment is the last step before your certificate.`,
      tip: "The paper is 50 questions with a 90-minute limit. Read each prompt twice.",
      cta: { label: "Open final assessment", href: "/exam" },
      chips,
    };
  }

  if (input.certificates > 0) {
    return {
      mood: "proud",
      headline: "Certified and still sharp.",
      message: `You already hold the Completion Merit Certificate. Keep the streak alive and defend your league spot.`,
      tip,
      cta: { label: "View certificate", href: "/certificate" },
      chips,
    };
  }

  if (input.boss && input.boss.premium && !input.boss.passed && input.boss.daysLeft <= 3) {
    return {
      mood: "focused",
      headline: `${input.boss.name} closes soon.`,
      message: `${input.boss.daysLeft === 0 ? "The window closes today." : `${input.boss.daysLeft} day${input.boss.daysLeft === 1 ? "" : "s"} left.`} Hard questions, ${input.boss.name.includes("Rate") ? "fast moves" : "no warm-up"}.`,
      tip: "A boss rewards calm reading more than speed. You have eight minutes.",
      cta: { label: "Face the boss", href: "/bosses" },
      chips,
    };
  }

  if (input.modulesDone === 0) {
    return {
      mood: "happy",
      headline: "First lesson first.",
      message: "Pick the foundation module, finish the video, then pass the quiz. That is the whole loop.",
      tip,
      cta: { label: "Start learning", href: "/learn" },
      chips,
    };
  }

  if (input.modulesDone >= input.modulesTotal && input.modulesTotal > 0 && !input.certificateReady) {
    return {
      mood: "proud",
      headline: "Curriculum cleared.",
      message: "All eight modules are complete. The certificate is issued through the final assessment.",
      tip,
      cta: { label: "Check eligibility", href: "/certificate" },
      chips,
    };
  }

  if (input.streak >= 7) {
    return {
      mood: "proud",
      headline: `${input.streak} days. No gaps.`,
      message: `Your streak is doing the hard part for you — showing up. ${input.nextModuleTitle ? `Next up: ${input.nextModuleTitle}.` : "Keep the habit moving."}`,
      tip,
      cta: { label: "Continue learning", href: "/learn" },
      chips,
    };
  }

  if (input.league?.rank && input.league.size >= 5 && input.league.rank <= 5) {
    return {
      mood: "hyped",
      headline: `Top five in ${input.league.tierLabel}.`,
      message: `You are #${input.league.rank} of ${input.league.size} this week. Promotion is within reach.`,
      tip,
      cta: { label: "See your league", href: "/leagues" },
      chips,
    };
  }

  if (input.lightningRuns > 0) {
    return {
      mood: "focused",
      headline: input.lightningBest > 0 ? `Personal best: ${input.lightningBest}/12.` : "Beat your first round.",
      message: "Sixty seconds, twelve questions. It is the fastest way to find the gaps you did not know you had.",
      tip,
      cta: { label: "Run a Lightning Round", href: "/lightning" },
      chips,
    };
  }

  if (!input.hasTraded) {
    return {
      mood: "concerned",
      headline: "The simulator is still untouched.",
      message: "Learning sticks when you use it. Place one small sandbox trade and watch the position update.",
      tip,
      cta: { label: "Open the terminal", href: "/trade" },
      chips,
    };
  }

  if (input.hour < 6) {
    return {
      mood: "sleepy",
      headline: "Late session, " + name + "?",
      message: "The market will still be here after sleep. Rest is part of a durable process.",
      tip,
      cta: { label: "Review your portfolio", href: "/portfolio" },
      chips,
    };
  }

  return {
    mood: "happy",
    headline: `${name}, keep the loop tight.`,
    message: `${
      input.nextModuleTitle ? `Next lesson: ${input.nextModuleTitle}. ` : ""
    }${input.questsDone > 0 ? `${input.questsDone} quest${input.questsDone === 1 ? "" : "s"} claimed today. ` : ""}One lesson, one quiz, one small trade — that is enough.`,
    tip,
    cta: { label: "Continue learning", href: "/learn" },
    chips,
  };
}
