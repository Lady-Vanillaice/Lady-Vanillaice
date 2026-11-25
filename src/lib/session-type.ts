/**
 * Session-Art pro Buchung (Single oder Duo mit Kollegin).
 * Wird als eigene Zeile „Session-Art: …“ in der Admin-Notiz gespeichert,
 * damit mehrere Gäste im selben Tages-Zeitfenster unterschiedliche Arten haben können.
 */
const LINE_RE = /(?:^|\n)Session-Art:\s*([^\n]+)/;
const LINE_RE_GLOBAL = /(?:^|\n)Session-Art:[^\n]*/g;

export type SessionType = { isDuo: boolean; partner: string | null };

export function parseSessionType(note: string | null | undefined): SessionType | null {
  const m = (note ?? "").match(LINE_RE);
  if (!m?.[1]) return null;
  const value = m[1].trim();
  if (/^single/i.test(value)) return { isDuo: false, partner: null };
  const duo = value.match(/^duo(?:\s+mit\s+(.+))?$/i);
  if (duo) return { isDuo: true, partner: duo[1]?.trim() || null };
  return null;
}

export function setSessionTypeInNote(note: string | null | undefined, type: SessionType) {
  const clean = (note ?? "").replace(LINE_RE_GLOBAL, "").replace(/^\n+/, "").trim();
  const line = type.isDuo ? `Session-Art: Duo${type.partner ? ` mit ${type.partner}` : ""}` : "Session-Art: Single";
  return [clean || null, line].filter(Boolean).join("\n\n");
}
