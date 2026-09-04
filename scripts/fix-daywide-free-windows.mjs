import fs from "node:fs";

const bookingPath = "src/lib/public-booking.functions.ts";
let source = fs.readFileSync(bookingPath, "utf8");

// Public booking server functions run with the publishable Supabase key. New
// opaque sb_publishable_* keys must be sent via the apikey header, not as a
// Bearer JWT. Keep this helper in sync with src/integrations/supabase/client.ts.
const oldPublicClient = `function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}`;
const newPublicClient = `function publicClient() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase-Konfiguration fehlt.");
  }

  const supabaseFetch: typeof fetch = (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (
      (supabaseKey.startsWith("sb_publishable_") || supabaseKey.startsWith("sb_secret_")) &&
      headers.get("Authorization") === \`Bearer \${supabaseKey}\`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };

  return createClient<Database>(supabaseUrl, supabaseKey, {
    global: { fetch: supabaseFetch },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}`;

if (source.includes(oldPublicClient)) {
  source = source.replace(oldPublicClient, newPublicClient);
}
if (!source.includes('headers.set("apikey", supabaseKey)')) {
  throw new Error("Public Supabase booking client patch could not be applied");
}

// Load appointments by their real requested time, not only by currently-open
// availability slot ids. This includes bookings whose original slot is hidden,
// held, booked, moved or otherwise no longer part of the open-slot list.
// IMPORTANT: this repository has more than one `.in("slot_id", slotIds)` query.
// Patch only the query inside listUpcomingSlots, and only if it has not already
// been converted. The script is run more than once during a normal npm build.
const slotQueryNeedle =
  '      .in("slot_id", slotIds)\n      .in("status", ["pending", "waiting_deposit", "confirmed"])';
const rangeQueryReplacement =
  '      .gte("requested_start", rangeStart.toISOString())\n      .lt("requested_start", rangeEnd.toISOString())\n      .in("status", ["pending", "waiting_deposit", "confirmed"])';

if (!source.includes(rangeQueryReplacement)) {
  const upcomingStart = source.indexOf("export const listUpcomingSlots");
  if (upcomingStart < 0) {
    throw new Error("listUpcomingSlots patch target was not found");
  }
  const upcomingSection = source.slice(upcomingStart);
  const relativeQueryIndex = upcomingSection.indexOf(slotQueryNeedle);
  if (relativeQueryIndex < 0) {
    throw new Error("Day-wide booking query patch target was not found inside listUpcomingSlots");
  }
  const slotQueryIndex = upcomingStart + relativeQueryIndex;
  source =
    source.slice(0, slotQueryIndex) +
    rangeQueryReplacement +
    source.slice(slotQueryIndex + slotQueryNeedle.length);
}

// Defensive fallback for the public proposal flow: older/stale deployment
// artifacts may still contain a query that references rangeStart/rangeEnd.
// Alias those names to the proposal day's real Berlin bounds so the action
// cannot crash with "rangeStart is not defined" even if an old patch survives.
const proposalBoundsNeedle =
  '    const { dayStart, dayEnd } = getBerlinCalendarDayBounds(slot.starts_at);';
const proposalBoundsReplacement = `${proposalBoundsNeedle}\n    const rangeStart = dayStart;\n    const rangeEnd = dayEnd;`;
const proposalFnStart = source.indexOf("export const proposeBookingTime");
if (proposalFnStart >= 0) {
  const beforeProposal = source.slice(0, proposalFnStart);
  const proposalAndAfter = source.slice(proposalFnStart);
  if (
    proposalAndAfter.includes(proposalBoundsNeedle) &&
    !proposalAndAfter.includes("const rangeStart = dayStart;")
  ) {
    source = beforeProposal + proposalAndAfter.replace(proposalBoundsNeedle, proposalBoundsReplacement);
  }
}

const oldBusy = '    const busy = bookingsBySlot.get(slot.id) ?? [];';
const newBusy = `    const berlinDayKey = (value: string) => new Intl.DateTimeFormat("sv-SE", {\n      timeZone: "Europe/Berlin",\n      year: "numeric",\n      month: "2-digit",\n      day: "2-digit",\n    }).format(new Date(value));\n    const slotDayKey = berlinDayKey(slot.starts_at);\n    // bookingsBySlot now contains every appointment in the requested date range.\n    // Flatten all source-slot buckets and keep only appointments on this Berlin day.\n    const busy = [...bookingsBySlot.values()]\n      .flat()\n      .filter((range) => berlinDayKey(range.starts_at) === slotDayKey);`;
if (source.includes(oldBusy)) {
  source = source.replace(oldBusy, newBusy);
}

if (!source.includes('gte("requested_start", rangeStart.toISOString())')) {
  throw new Error("Day-wide booking query patch could not be applied");
}
if (!source.includes("const busy = [...bookingsBySlot.values()]")) {
  throw new Error("Day-wide booking lookup patch could not be applied");
}
// Safety check: proposeBookingTime must still use slotIds/daySlots. The
// defensive range aliases are allowed, but its query itself must not be
// rewritten to rangeStart/rangeEnd by this patch.
const proposalStart = source.indexOf("export const proposeBookingTime");
const submitStart = source.indexOf("export const submitBooking", proposalStart);
const proposalSection = proposalStart >= 0 && submitStart > proposalStart
  ? source.slice(proposalStart, submitStart)
  : "";
if (!proposalSection.includes('.in("slot_id", slotIds)')) {
  throw new Error("Booking proposal query was accidentally modified");
}
if (!proposalSection.includes("const rangeStart = dayStart;") || !proposalSection.includes("const rangeEnd = dayEnd;")) {
  throw new Error("Booking proposal defensive range aliases are missing");
}
// fix-duo-single-calendar runs before this script and already creates the real
// free_windows plus the day-level windows array used by the public card.
if (!source.includes("free_windows: freeWindows")) {
  throw new Error("Real free-window calculation from duo patch is missing");
}
if (!source.includes("const freeDayWindows = daySlots.flatMap")) {
  throw new Error("Day free-window aggregation from duo patch is missing");
}
fs.writeFileSync(bookingPath, source);

const calendarPath = "src/routes/kalender.tsx";
let calendar = fs.readFileSync(calendarPath, "utf8");
const rawWindowLine = `{formatMunichTime(window.starts_at)} – {formatMunichTime(window.ends_at)}{lang === "en" ? "" : " Uhr"}`;
const alwaysLabeledWindowLine = `{formatMunichTime(window.starts_at)} – {formatMunichTime(window.ends_at)}{lang === "en" ? "" : " Uhr"}{" — "}{window.is_duo ? tr("Duo verfügbar", "Duo available") : tr("Nur Einzel verfügbar", "Single only available")}`;
const duoOnlyWindowLine = `{formatMunichTime(window.starts_at)} – {formatMunichTime(window.ends_at)}{lang === "en" ? "" : " Uhr"}{slot.is_duo ? <> {"— "}{window.is_duo ? tr("Duo verfügbar", "Duo available") : tr("Nur Einzel verfügbar", "Single only available")}</> : null}`;

if (calendar.includes(alwaysLabeledWindowLine)) {
  calendar = calendar.replace(alwaysLabeledWindowLine, duoOnlyWindowLine);
} else if (calendar.includes(rawWindowLine)) {
  calendar = calendar.replace(rawWindowLine, duoOnlyWindowLine);
}

if (!calendar.includes("slot.is_duo ? <>")) {
  throw new Error("Duo-only public free-window label patch could not be applied");
}
fs.writeFileSync(calendarPath, calendar);
