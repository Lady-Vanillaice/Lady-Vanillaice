import { useEffect, useState, type ReactNode } from "react";

export type AdminTab = { id: string; label: string; badge?: number | string | null };

/**
 * Reiter-Leiste für Admin-Seiten. Merkt sich den zuletzt offenen Reiter
 * (pro Seite) im Browser, damit man nach dem Neuladen wieder dort landet.
 */
export function useAdminTab(storageKey: string, tabs: AdminTab[], fallback: string) {
  const [tab, setTabState] = useState(fallback);
  useEffect(() => {
    try {
      const fromHash = window.location.hash.replace("#", "");
      const saved = fromHash || window.localStorage.getItem(`admin-tab:${storageKey}`);
      if (saved && tabs.some((t) => t.id === saved)) setTabState(saved);
    } catch {
      /* Browser-Speicher nicht verfügbar – Standard-Reiter bleibt */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  const setTab = (next: string) => {
    setTabState(next);
    try {
      window.localStorage.setItem(`admin-tab:${storageKey}`, next);
      window.history.replaceState(null, "", `#${next}`);
    } catch {
      /* ignorieren */
    }
  };
  return [tab, setTab] as const;
}

export function AdminTabBar({
  tabs,
  active,
  onChange,
  sticky = true,
}: {
  tabs: AdminTab[];
  active: string;
  onChange: (id: string) => void;
  sticky?: boolean;
}) {
  return (
    <div className={sticky ? "sticky top-[72px] z-30 -mx-4 mb-6 border-b border-champagne/20 bg-background/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0" : "mb-2 border-b border-champagne/15 pb-2"}>
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                onChange(t.id);
                if (sticky) window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`shrink-0 whitespace-nowrap border px-3.5 py-2 text-[0.65rem] uppercase tracking-[0.18em] transition ${
                isActive
                  ? "border-champagne bg-champagne text-background"
                  : "border-champagne/30 text-vanilla/70 hover:border-champagne/60 hover:text-champagne"
              }`}
            >
              {t.label}
              {t.badge != null && t.badge !== 0 && t.badge !== "" && (
                <span className={`ml-1.5 inline-block min-w-[1.2rem] rounded-full px-1 text-center text-[0.6rem] ${isActive ? "bg-background/20" : "bg-champagne/15 text-champagne"}`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AdminTabPanel({ when, active, children }: { when: string; active: string; children: ReactNode }) {
  if (when !== active) return null;
  return <div role="tabpanel">{children}</div>;
}
