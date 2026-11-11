/**
 * Plan copy shared by the landing teaser and the public pricing page.
 * Every line here describes something that exists in this build. The expert
 * session is shown separately with a "Shipping next" label until a real
 * speaker and date are on the calendar.
 */

export const PREMIUM_MONTH_CREDITS = 500;
export const PREMIUM_TERM_DAYS = 30;

export const FREE_FEATURES = [
  "31 instruments across 5 asset classes",
  "₹1,00,000 / $10,000 simulated capital",
  "8 learning modules with credit unlocks",
  "24 quiz questions and crash drills",
  "Arena battles and leaderboards",
  "Friends, chat and staked quests",
  "Full portfolio report with CSV, HTML and print",
  "4 languages and INR / USD switching",
];

export const PREMIUM_FEATURES = [
  "Everything in Free",
  "All 8 learning modules unlocked, no credit cost",
  "Final exam once every module is complete",
  "Verifiable Completion Merit Certificate",
  "Complete analytics: return, risk, execution and learning",
  "Detailed report with a personalised improvement plan",
];

export const PREMIUM_SHIPPING = "Monthly expert session with a guest practitioner";

export const INSTITUTION_FEATURES = [
  "Everything in Premium for the educator account",
  "Classrooms and cohort join codes",
  "Educator analytics dashboard",
  "Team competitions",
  "Support desk",
  "Roster and results export",
];

export const PLAN_COMPARE: Array<[string, string, string, string]> = [
  ["Learning modules", "Credit unlocks", "All unlocked", "All unlocked"],
  ["Final exam & certificate", "—", "Included", "Included"],
  ["Analytics", "Portfolio report", "Complete analytics", "Complete analytics"],
  ["Monthly expert session", "—", "Shipping next", "Shipping next"],
  ["Classrooms & cohort codes", "—", "—", "Included"],
  ["Educator analytics", "—", "—", "Included"],
  ["Team competitions", "—", "—", "Included"],
  ["Support desk", "—", "—", "Included"],
  ["4 languages + INR / USD", "Included", "Included", "Included"],
  ["Zero real money at risk", "Always", "Always", "Always"],
];
