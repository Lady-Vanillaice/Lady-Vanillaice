/**
 * Ablauf eines Termins mit genauen Zeiten, z. B.
 *   14:00–15:00 Session | 15:00–16:00 Liegezeit unbeaufsichtigt | 16:00–17:00 Session
 * Gespeichert als eigene Zeile „Ablauf: …“ in der Admin-Notiz der Buchung.
 * Unbeaufsichtigte Liegezeit bleibt im öffentlichen Kalender frei buchbar,
 * beaufsichtigte Liegezeit blockiert wie eine normale Session.
 */
export type PlanKind = "session" | "liegezeit" | "kollegin" | "duo";

export type PlanPhase = {
  kind: PlanKind;
  from: string; // HH:MM
  to: string; // HH:MM
  supervised?: boolean; // nur bei Liegezeit
  colleague?: string; // bei „Kollegin übernimmt“ und Duo-Session
};

const PLAN_LINE_RE = /(?:^|\n)Ablauf:[^\n]*/g;
const PLAN_CAPTURE_RE = /(?:^|\n)Ablauf:\s*([^\n]+)/;
const PHASE_RE = /^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})\s+(Session|Liegezeit|Kollegin übernimmt|Duo-Session)(?:\s+(beaufsichtigt|unbeaufsichtigt))?(?:\s+mit\s+(.+))?$/i;

const pad = (hm: string) => {
  const [h, m] = hm.split(":");
  return `${h.padStart(2, "0")}:${m}`;
};

export function isValidTime(hm: string) {
  return /^\d{1,2}:\d{2}$/.test(hm) && Number(hm.split(":")[0]) < 24 && Number(hm.split(":")[1]) < 60;
}

export function phaseLabel(p: PlanPhase) {
  if (p.kind === "session") return "Session";
  if (p.kind === "kollegin") return "Kollegin übernimmt";
  if (p.kind === "duo") return "Duo-Session";
  return p.supervised ? "Liegezeit beaufsichtigt" : "Liegezeit unbeaufsichtigt";
}

export function serializePlan(phases: PlanPhase[]) {
  return `Ablauf: ${phases
    .map((p) => {
      const colleague = (p.kind === "kollegin" || p.kind === "duo") && p.colleague?.trim()
        ? ` mit ${p.colleague.trim().replace(/[|\n]/g, " ")}`
        : "";
      return `${pad(p.from)}–${pad(p.to)} ${phaseLabel(p)}${colleague}`;
    })
    .join(" | ")}`;
}

/** Anzeige inkl. Kollegin, z. B. „Kollegin übernimmt: Milla“ oder „Duo-Session mit Milla“. */
export function phaseDisplay(p: PlanPhase) {
  const name = p.colleague?.trim();
  if (p.kind === "kollegin") return name ? `Kollegin übernimmt: ${name}` : "Kollegin übernimmt";
  if (p.kind === "duo") return name ? `Duo-Session mit ${name}` : "Duo-Session";
  return phaseLabel(p);
}

export function parsePlan(note: string | null | undefined): PlanPhase[] | null {
  const match = (note ?? "").match(PLAN_CAPTURE_RE);
  if (!match?.[1]) return null;
  const phases: PlanPhase[] = [];
  for (const part of match[1].split("|")) {
    const m = part.trim().match(PHASE_RE);
    if (!m) continue;
    const word = m[3].toLowerCase();
    const kind: PlanKind = word === "session" ? "session" : word.startsWith("kollegin") ? "kollegin" : word.startsWith("duo") ? "duo" : "liegezeit";
    phases.push({
      kind,
      from: pad(m[1]),
      to: pad(m[2]),
      supervised: kind === "liegezeit" ? m[4]?.toLowerCase() === "beaufsichtigt" : undefined,
      colleague: (kind === "kollegin" || kind === "duo") && m[5] ? m[5].trim() : undefined,
    });
  }
  return phases.length ? phases : null;
}

/** Setzt, ersetzt oder entfernt (bei null/leer) die Ablauf-Zeile in der Notiz. */
export function setPlanInNote(note: string | null | undefined, phases: PlanPhase[] | null) {
  const clean = (note ?? "").replace(PLAN_LINE_RE, "").replace(/^\n+/, "").trim();
  if (!phases?.length) return clean;
  return [clean || null, serializePlan(phases)].filter(Boolean).join("\n\n");
}

function toMinutes(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Wandelt den Ablauf in fortlaufende Minuten ab Mitternacht des Starttags um.
 * Liegt eine Uhrzeit vor der vorherigen, geht es über Mitternacht weiter.
 */
export function planToOffsets(phases: PlanPhase[]) {
  const result: Array<PlanPhase & { start: number; end: number }> = [];
  let dayOffset = 0;
  let last = -1;
  for (const p of phases) {
    let start = toMinutes(p.from) + dayOffset;
    if (start < last) {
      dayOffset += 1440;
      start += 1440;
    }
    let end = toMinutes(p.to) + dayOffset;
    if (end <= start) {
      dayOffset += 1440;
      end += 1440;
    }
    result.push({ ...p, start, end });
    last = end;
  }
  return result;
}

export function planTotalMinutes(phases: PlanPhase[]) {
  const offsets = planToOffsets(phases);
  if (!offsets.length) return 0;
  return offsets[offsets.length - 1].end - offsets[0].start;
}

function berlinOffsetMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - date.getTime()) / 60_000);
}

/** Berliner Ortszeit (Datum + Minuten ab Mitternacht) → Zeitstempel in ms. */
export function berlinMinutesToMs(dateKey: string, minutes: number) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, minutes);
  const offset = berlinOffsetMinutes(new Date(guess));
  return guess - offset * 60_000;
}

export function berlinDateKey(value: string | Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(value));
}

/** Abschnitte, in denen meine Zeit frei buchbar bleibt. */
export function isFreePhase(p: PlanPhase) {
  return (p.kind === "liegezeit" && !p.supervised) || p.kind === "kollegin";
}

/** Absolute Zeiten (ms) aller Abschnitte, ausgehend vom Starttag des Termins. */
export function planPhaseTimes(startIso: string, phases: PlanPhase[]) {
  const dateKey = berlinDateKey(startIso);
  return planToOffsets(phases).map((p) => ({ ...p, s: berlinMinutesToMs(dateKey, p.start), e: berlinMinutesToMs(dateKey, p.end) }));
}

/**
 * Für den Terminplan: Beginn des aktuell laufenden bzw. nächsten Teils.
 * Ist ein Teil vorbei, rutscht der Gast zur Uhrzeit seines nächsten Teils.
 */
export function currentPartStart(startIso: string, note: string | null | undefined, now = Date.now()) {
  const plan = parsePlan(note);
  if (!plan) return null;
  const times = planPhaseTimes(startIso, plan);
  const next = times.find((p) => p.e > now);
  return next && next.s > times[0].s ? next : null;
}

/** Blockierende Teile eines Ablaufs (Session, beaufsichtigte Liegezeit, Duo) als absolute Zeiten. */
export function planBlockingRanges(dateKey: string, phases: PlanPhase[]) {
  return planToOffsets(phases)
    .filter((p) => !isFreePhase(p))
    .map((p) => ({ s: berlinMinutesToMs(dateKey, p.start), e: berlinMinutesToMs(dateKey, p.end) }));
}

export type PlanHole = { s: number; e: number; ownerS: number; ownerE: number };

/**
 * Zeiträume unbeaufsichtigter Liegezeit (absolut), die frei buchbar bleiben.
 * ownerS/ownerE = Gesamtzeitraum des Termins, zu dem die Liegezeit gehört.
 */
export function freeHolesForPlan(dateKey: string, phases: PlanPhase[]): PlanHole[] {
  const offsets = planToOffsets(phases);
  if (!offsets.length) return [];
  const ownerS = berlinMinutesToMs(dateKey, offsets[0].start);
  const ownerE = berlinMinutesToMs(dateKey, offsets[offsets.length - 1].end);
  const holes: PlanHole[] = [];
  offsets.forEach((p, i) => {
    // Lücken zwischen zwei Abschnitten (z. B. „später noch eine Session“) bleiben ebenfalls frei.
    const prevEnd = i > 0 ? offsets[i - 1].end : null;
    if (prevEnd != null && p.start > prevEnd) {
      holes.push({ s: berlinMinutesToMs(dateKey, prevEnd), e: berlinMinutesToMs(dateKey, p.start), ownerS, ownerE });
    }
    if (isFreePhase(p)) holes.push({ s: berlinMinutesToMs(dateKey, p.start), e: berlinMinutesToMs(dateKey, p.end), ownerS, ownerE });
  });
  // Direkt aneinanderliegende freie Zeiten zusammenfassen.
  const merged: PlanHole[] = [];
  for (const h of holes.sort((a, b) => a.s - b.s)) {
    const last = merged[merged.length - 1];
    if (last && h.s <= last.e) last.e = Math.max(last.e, h.e);
    else merged.push({ ...h });
  }
  return merged;
}

/**
 * Schneidet unbeaufsichtigte Liegezeit aus dem belegten Zeitraum des eigenen
 * Termins heraus (nur aus genau diesem Zeitraum, nie aus anderen Buchungen).
 * `pad` = Puffer, der in den belegten Zeiträumen bereits enthalten ist.
 */
export function subtractHoles(
  ranges: Array<{ s: number; e: number }>,
  holes: PlanHole[],
  pad = 0,
) {
  const TOLERANCE = 60_000;
  let result = ranges.map((r) => ({ ...r, owner: { s: r.s, e: r.e } }));
  for (const hole of holes) {
    const hs = hole.s + pad;
    const he = hole.e - pad;
    if (he <= hs) continue;
    const next: typeof result = [];
    for (const r of result) {
      const isOwner =
        Math.abs(r.owner.s - (hole.ownerS - pad)) <= TOLERANCE &&
        Math.abs(r.owner.e - (hole.ownerE + pad)) <= TOLERANCE;
      if (!isOwner || he <= r.s || hs >= r.e) {
        next.push(r);
        continue;
      }
      if (r.s < hs) next.push({ s: r.s, e: hs, owner: r.owner });
      if (he < r.e) next.push({ s: he, e: r.e, owner: r.owner });
    }
    result = next;
  }
  return result.map(({ s, e }) => ({ s, e }));
}
