/**
 * Lightweight translation layer.
 *
 * Copy is keyed by its English source text so the same dictionary works for
 * server-rendered markup and client components without touching every file.
 * The provider translates text nodes in place and re-applies on mutations, so
 * newly rendered screens are covered automatically. Unknown copy falls back to
 * English rather than showing a key.
 */
import { hi } from "./i18n-hi";
import { ta } from "./i18n-ta";
import { ar } from "./i18n-ar";
import { questHi, questTa, questAr } from "./i18n-quests";
import { plansHi, plansTa, plansAr } from "./i18n-plans";
import { analyticsHi, analyticsTa, analyticsAr } from "./i18n-analytics";

export const LANGUAGES = [
  { code: "en", label: "English", native: "English", dir: "ltr" },
  { code: "hi", label: "Hindi", native: "हिन्दी", dir: "ltr" },
  { code: "ta", label: "Tamil", native: "தமிழ்", dir: "ltr" },
  { code: "ar", label: "Arabic", native: "العربية", dir: "rtl" },
] as const;

export type Lang = (typeof LANGUAGES)[number]["code"];
export type Dict = Record<string, string>;

export const DEFAULT_LANG: Lang = "en";
export const LANG_STORAGE_KEY = "mtm_lang";

export const dictionaries: Record<Exclude<Lang, "en">, Dict> = {
  hi: { ...hi, ...questHi, ...plansHi, ...analyticsHi },
  ta: { ...ta, ...questTa, ...plansTa, ...analyticsTa },
  ar: { ...ar, ...questAr, ...plansAr, ...analyticsAr },
};

export function normalizeCopy(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function looseCopy(value: string): string {
  return normalizeCopy(value)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-");
}

export function isLang(value: string | null | undefined): value is Lang {
  return value === "en" || value === "hi" || value === "ta" || value === "ar";
}

const looseIndexes: Partial<Record<Exclude<Lang, "en">, Dict>> = {};

function looseIndex(lang: Exclude<Lang, "en">): Dict {
  let index = looseIndexes[lang];
  if (!index) {
    index = {};
    for (const [key, value] of Object.entries(dictionaries[lang])) {
      index[looseCopy(key)] = value;
    }
    looseIndexes[lang] = index;
  }
  return index;
}

export function translate(key: string, lang: Lang): string {
  if (lang === "en") return key;
  const dict = dictionaries[lang];
  const normalized = normalizeCopy(key);
  const direct = dict[normalized];
  if (direct) return direct;
  return looseIndex(lang)[looseCopy(normalized)] ?? key;
}

export function dirFor(lang: Lang): "ltr" | "rtl" {
  return lang === "ar" ? "rtl" : "ltr";
}
