import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";
import { LanguageDock } from "@/components/language-dock";
import { DEFAULT_LANG, LANG_STORAGE_KEY, dirFor, isLang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "MockTrade Matrix — Learn to lose. Before it costs anything.",
  description:
    "A guardian-verified, AI-powered financial literacy and algorithmic investment simulation ecosystem. Five asset classes, real trading friction, zero real risk.",
  applicationName: "MockTrade Matrix",
};

export const viewport: Viewport = {
  themeColor: "#06080d",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const stored = cookieStore.get(LANG_STORAGE_KEY)?.value;
  const lang = isLang(stored) ? stored : DEFAULT_LANG;

  return (
    <html lang={lang} dir={dirFor(lang)} data-lang={lang} suppressHydrationWarning>
      <body>
        <LanguageProvider>
          {children}
          <LanguageDock />
        </LanguageProvider>
      </body>
    </html>
  );
}
