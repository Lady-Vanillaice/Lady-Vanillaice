import { useEffect, useState } from "react";
import { useT } from "@/i18n";

const KEY = "lvi-age-confirmed";

export function AgeGate() {
  const [show, setShow] = useState(false);
  const t = useT();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(KEY)) setShow(true);
  }, []);

  if (!show) return null;

  const confirm = () => {
    window.localStorage.setItem(KEY, "1");
    setShow(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-anthracite/95 backdrop-blur-md flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-anthracite border border-champagne/30 p-10 text-center">
        <div className="eyebrow mb-4">{t<string>("ageGate.hint")}</div>
        <h2 className="font-display text-3xl text-vanilla mb-4">{t<string>("ageGate.welcome")}</h2>
        <p className="text-sm text-vanilla/70 leading-relaxed mb-8">
          {t<string>("ageGate.body")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={confirm} className="btn-gold">{t<string>("ageGate.enter")}</button>
          <a href="https://www.google.com" className="btn-outline-gold">{t<string>("ageGate.leave")}</a>
        </div>
      </div>
    </div>
  );
}
