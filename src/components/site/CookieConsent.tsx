import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const STORAGE_KEY = "lvi-cookie-consent-v1";
type ConsentChoice = "necessary" | "accepted";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(!window.localStorage.getItem(STORAGE_KEY));
    } catch {
      setVisible(true);
    }
  }, []);

  function save(choice: ConsentChoice) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ choice, savedAt: new Date().toISOString() }),
      );
    } catch {
      // The banner may still be dismissed when storage is unavailable.
    }
    window.dispatchEvent(
      new CustomEvent("lvi-cookie-consent", { detail: { choice } }),
    );
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside
      aria-label="Cookie- und Datenschutzhinweis"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl border border-champagne/35 bg-anthracite/95 p-4 shadow-2xl backdrop-blur-md sm:inset-x-6 sm:bottom-6 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <div className="eyebrow mb-2 text-champagne">Datenschutz & Cookies</div>
          <p className="text-sm leading-relaxed text-vanilla/75">
            Diese Website verwendet notwendige Speicherungen für Funktionen wie
            Anmeldung, Sicherheit und deine Auswahl. Aktuell werden keine
            zusätzlichen Analyse- oder Werbetracker aktiviert.
          </p>
          <Link
            to="/datenschutz"
            className="mt-2 inline-block text-xs text-champagne underline decoration-champagne/50 underline-offset-4 hover:text-vanilla"
          >
            Datenschutzerklärung ansehen
          </Link>
        </div>

        <div className="flex flex-col gap-2 sm:min-w-52">
          <button
            type="button"
            onClick={() => save("necessary")}
            className="btn-outline-gold !px-4 !py-2.5 !text-[0.65rem]"
          >
            Nur notwendige
          </button>
          <button
            type="button"
            onClick={() => save("accepted")}
            className="btn-gold !px-4 !py-2.5 !text-[0.65rem]"
          >
            Akzeptieren
          </button>
        </div>
      </div>
    </aside>
  );
}
