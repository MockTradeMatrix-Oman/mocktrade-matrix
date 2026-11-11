/**
 * Shared analytics types. Kept free of server-only imports so the client
 * component and the export builder can share the same shapes.
 */

export type MetricBand = "good" | "watch" | "risk" | "none";

export type AnalyticsMetric = {
  key: string;
  label: string;
  value: number | null;
  unit: "money" | "pct" | "x" | "count" | "score" | "text";
  text?: string;
  detail: string;
  band: MetricBand;
};

export type AnalyticsLearning = {
  modulesDone: number;
  totalModules: number;
  avgQuiz: number;
  bestQuiz: number;
  attempts: number;
  crashDone: boolean;
  streak: number;
  xp: number;
  level: number;
  arenaMatches: number;
  arenaWins: number;
  nextModule: { slug: string; title: string } | null;
};

export type AnalyticsReport = {
  generatedAt: number;
  user: { name: string; email: string; region: string; mode: string };
  headline: {
    label: string;
    value: number | null;
    unit: "money" | "pct" | "count";
    sub: string;
    band: MetricBand;
  }[];
  risk: {
    score: number | null;
    band: string;
    coverage: number;
    metrics: AnalyticsMetric[];
  };
  execution: AnalyticsMetric[];
  learning: AnalyticsLearning;
  guidance: string[];
};
