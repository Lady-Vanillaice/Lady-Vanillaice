import { useLang } from "@/i18n";

export function LegalGermanOnlyNotice() {
  const { lang } = useLang();
  if (lang !== "en") return null;
  return (
    <div className="container-luxe max-w-3xl pt-8">
      <p className="text-xs text-vanilla/60 border border-champagne/25 bg-champagne/[0.04] p-4 leading-relaxed">
        This legal page is only available in German — the German version is the legally binding text.
      </p>
    </div>
  );
}
