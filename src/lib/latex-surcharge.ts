/**
 * Latex-Aufpreis: wird vom Gast zusätzlich bezahlt, zählt zur Einnahme
 * (steckt im Vor-Ort-Betrag) und wird in der Notiz als eigene Zeile vermerkt,
 * damit er im Kassenbuch als „+ Latex … €“ sichtbar ist.
 */
const LATEX_LINE_RE = /(?:^|\n)Latex-Aufpreis:\s*([\d.,]+)\s*€?[^\n]*/;
const LATEX_LINE_RE_GLOBAL = /(?:^|\n)Latex-Aufpreis:[^\n]*/g;

export function parseEuroInput(value: string | null | undefined): number {
  const n = Number(String(value ?? "").trim().replace(/\s|€/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

export function formatEuro(value: number) {
  return value.toLocaleString("de-DE", { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 }) + " €";
}

export function latexSurchargeLine(amount: number) {
  return `Latex-Aufpreis: ${amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export function parseLatexSurcharge(note: string | null | undefined): number | null {
  const match = (note ?? "").match(LATEX_LINE_RE);
  if (!match?.[1]) return null;
  const raw = match[1].includes(",") ? match[1].replace(/\./g, "").replace(",", ".") : match[1];
  const amount = Number(raw);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

/** Setzt, ändert oder entfernt (bei 0) die Latex-Zeile in einer Notiz. */
export function setLatexSurchargeInNote(note: string | null | undefined, amount: number): string {
  const clean = (note ?? "").replace(LATEX_LINE_RE_GLOBAL, "").replace(/^\n+/, "").trim();
  if (!(amount > 0)) return clean;
  return [clean || null, latexSurchargeLine(amount)].filter(Boolean).join("\n\n");
}
