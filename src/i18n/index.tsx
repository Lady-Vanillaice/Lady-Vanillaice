import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { translations, type Lang } from "./translations";

const STORAGE_KEY = "lvi-lang";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: <T = string>(path: string) => T;
};

const LanguageContext = createContext<Ctx | null>(null);

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "de";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "de" || stored === "en") return stored;
  } catch {
    /* ignore */
  }
  const nav = window.navigator?.language?.toLowerCase() ?? "";
  return nav.startsWith("en") ? "en" : "de";
}

function lookup(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // SSR/erster Client-Render: DE, damit Hydration matched.
  const [lang, setLangState] = useState<Lang>("de");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initial = detectInitialLang();
    setLangState(initial);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", lang);
    }
  }, [lang, hydrated]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback(
    <T,>(path: string): T => {
      const primary = lookup(translations[lang], path);
      if (primary !== undefined && primary !== null) return primary as T;
      // Fallback auf Deutsch
      const fallback = lookup(translations.de, path);
      return (fallback ?? path) as T;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}

export function useT() {
  return useLang().t;
}

/**
 * Inline-Helper: gibt je nach aktueller Sprache DE oder EN zurück.
 * Fällt auf DE zurück, wenn EN fehlt.
 * Beispiel: const tr = useTr(); tr("Preise", "Rates")
 */
export function useTr() {
  const { lang } = useLang();
  function tr<T>(de: T, en?: T): T {
    return (lang === "en" && en !== undefined ? en : de);
  }
  return tr;
}

/**
 * Kleiner DE/EN Umschalter fürs Header.
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useLang();
  const btn = (target: Lang, label: string) => {
    const active = lang === target;
    return (
      <button
        key={target}
        type="button"
        onClick={() => setLang(target)}
        aria-pressed={active}
        aria-label={t<string>("common.switchTo") + ": " + label}
        className={`px-1.5 py-1 text-[0.62rem] uppercase tracking-[0.22em] transition-colors ${
          active
            ? "text-champagne"
            : "text-vanilla/50 hover:text-champagne"
        }`}
      >
        {target.toUpperCase()}
      </button>
    );
  };
  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`}>
      {btn("de", "Deutsch")}
      <span className="text-vanilla/25">/</span>
      {btn("en", "English")}
    </div>
  );
}
