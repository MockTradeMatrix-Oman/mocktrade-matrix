"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_LANG, LANG_STORAGE_KEY, Lang, dirFor, isLang, translate } from "@/lib/i18n";

type LangCtx = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
};

const LangContext = createContext<LangCtx>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key: string) => key,
});

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const date = new Date();
  date.setTime(date.getTime() + 365 * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${date.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"]);
const ATTRS = ["placeholder", "aria-label", "title"];

function shouldSkip(node: Node): boolean {
  let el = node.parentElement;
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.hasAttribute("data-no-i18n") || el.getAttribute("translate") === "no") return true;
    if (el.isContentEditable) return true;
    el = el.parentElement;
  }
  return false;
}

type TextRecord = { src: string; out: string };

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [mounted, setMounted] = useState(false);
  const textRecords = useRef<WeakMap<Text, TextRecord>>(new WeakMap());
  const attrRecords = useRef<Map<Element, Record<string, TextRecord>>>(new Map());
  const rescanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    const cookieLang = getCookie(LANG_STORAGE_KEY);
    const lsLang = window.localStorage.getItem(LANG_STORAGE_KEY);
    const candidate = cookieLang || lsLang;
    setLangState(isLang(candidate) ? candidate : DEFAULT_LANG);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {}
    setCookie(LANG_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = dirFor(lang);
    document.documentElement.setAttribute("data-lang", lang);
  }, [lang, mounted]);

  useEffect(() => {
    if (!mounted) return;

    const translateText = (node: Text) => {
      if (shouldSkip(node)) return;
      const current = node.nodeValue ?? "";
      if (!current.trim()) return;

      const record = textRecords.current.get(node);
      let src = current;
      if (record) {
        if (current === record.out || current === record.src) src = record.src;
        else src = current; // React replaced the content: treat it as fresh source
      }

      const start = src.search(/\S/);
      if (start < 0) return;
      let end = src.length;
      while (end > start && /\s/.test(src[end - 1])) end--;
      const lead = src.slice(0, start);
      const core = src.slice(start, end);
      const trail = src.slice(end);
      const key = normalize(core);
      if (!key) return;
      const translated = translate(key, lang);
      const next = lead + (translated === key ? core : translated) + trail;

      if (next !== current) node.nodeValue = next;
      if (translated === key) textRecords.current.delete(node);
      else textRecords.current.set(node, { src, out: next });
    };

    const translateAttrs = (el: Element) => {
      if (shouldSkip(el)) return;
      let stored = attrRecords.current.get(el);
      if (!stored) {
        const fresh: Record<string, TextRecord> = {};
        for (const attr of ATTRS) {
          const value = el.getAttribute(attr);
          if (value != null && value.trim()) fresh[attr] = { src: value, out: value };
        }
        if (!Object.keys(fresh).length) return;
        attrRecords.current.set(el, fresh);
        stored = fresh;
      }
      for (const attr of ATTRS) {
        const record = stored[attr];
        if (!record) continue;
        const current = el.getAttribute(attr) ?? "";
        if (current !== record.out && current !== record.src) {
          record.src = current;
          record.out = current;
        }
        const key = normalize(record.src);
        const translated = key ? translate(key, lang) : record.src;
        const next = translated === key ? record.src : translated;
        if (next !== current) el.setAttribute(attr, next);
        record.out = next;
      }
    };

    const scanElement = (el: Element) => {
      translateAttrs(el);
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let cur: Node | null;
      while ((cur = walker.nextNode())) translateText(cur as Text);
      el.querySelectorAll("[placeholder],[aria-label],[title]").forEach(translateAttrs);
    };

    const scanAll = () => {
      document.querySelectorAll("[placeholder],[aria-label],[title]").forEach(translateAttrs);
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let cur: Node | null;
      while ((cur = walker.nextNode())) translateText(cur as Text);
    };

    scanAll();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData" && mutation.target.nodeType === Node.TEXT_NODE) {
          translateText(mutation.target as Text);
          continue;
        }
        if (mutation.type === "attributes" && mutation.target.nodeType === Node.ELEMENT_NODE) {
          translateAttrs(mutation.target as Element);
          continue;
        }
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType === Node.TEXT_NODE) translateText(node as Text);
          else if (node.nodeType === Node.ELEMENT_NODE) scanElement(node as Element);
        }
      }
      if (rescanTimer.current) clearTimeout(rescanTimer.current);
      rescanTimer.current = setTimeout(scanAll, 220);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });

    return () => {
      observer.disconnect();
      if (rescanTimer.current) clearTimeout(rescanTimer.current);
    };
  }, [lang, mounted]);

  const setLang = (next: Lang) => {
    if (isLang(next)) setLangState(next);
  };

  const t = useMemo(() => (key: string) => translate(key, lang), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
