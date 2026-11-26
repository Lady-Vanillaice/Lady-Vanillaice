import { createServerFn } from "@tanstack/react-start";
import { parseSessionType } from "@/lib/session-type";
import { formatEuro, parseLatexSurcharge } from "@/lib/latex-surcharge";
import { realLocation } from "./slot-location";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type DepositExemptionReason = "regular_customer" | "trust" | "exception" | "colleague_guarantees" | "spontaneous";
const STUDIO_RENT_LABEL = "Studiomiete";

export type CashBookEntry = {
  id: string;
  source: "manual" | "booking";
  entry_type: "income" | "expense";
  expense_category: string | null;
  expense_amount: number;
  payment_method: string | null;
  booking_id: string | null;
  termin_datum: string;
  termin_start: string | null;
  termin_ende: string | null;
  studio: string;
  studio_address: string | null;
  kunde: string;
  art: string;
  dauer: string | null;
  anzahlung: number;
  anzahlung_vorgemerkt: number;
  anzahlung_method: string | null;
  anzahlung_datum: string | null;
  deposit_exemption_reason: DepositExemptionReason | null;
  deposit_guarantor: string | null;
  bar: number;
  restbetrag_vorgemerkt: number;
  restzahlung_method: string | null;
  bar_datum: string | null;
  durchgefuehrt_datum: string | null;
  gesamt: number;
  status: "open" | "completed" | "cancelled" | "rescheduling";
  /** Status der zugehörigen Buchung (z. B. confirmed, rescheduling, declined). */
  booking_status?: string | null;
  notiz: string | null;
  created_at: string;
  payment_kind: "booking" | "manual";
  payment_date: string | null;
};

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

const dateOnly = (value: string | null | undefined) => value ? String(value).slice(0, 10) : null;

type ManualPaymentMeta = {
  deposit_date?: string | null;
  deposit_exemption_reason?: DepositExemptionReason | null;
  onsite_method?: string | null;
  onsite_date?: string | null;
};
const CASHBOOK_META_RE = /\n?\[\[LVI_PAYMENT:([^\]]+)\]\]/;
function unpackCashbookNote(value: string | null | undefined) {
  const raw = value ?? "";
  const match = raw.match(CASHBOOK_META_RE);
  let meta: ManualPaymentMeta = {};
  if (match?.[1]) {
    try { meta = JSON.parse(decodeURIComponent(match[1])) as ManualPaymentMeta; } catch { meta = {}; }
  }
  return { note: raw.replace(CASHBOOK_META_RE, "").trim() || null, meta };
}
function packCashbookNote(note: string | null | undefined, meta: ManualPaymentMeta) {
  const clean = (note ?? "").replace(CASHBOOK_META_RE, "").trim();
  const marker = `[[LVI_PAYMENT:${encodeURIComponent(JSON.stringify(meta))}]]`;
  return [clean || null, marker].filter(Boolean).join("\n");
}

function durationLabel(minutes: number | null | undefined, fallback: string | null | undefined) {
  if (minutes && minutes > 0) {
    const hours = minutes / 60;
    const hourLabel = Number.isInteger(hours)
      ? `${hours.toLocaleString("de-DE")} Std.`
      : `${hours.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std.`;
    return `${minutes} Min. (${hourLabel})`;
  }
  return fallback?.trim() || null;
}

export const listCashBookEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const db = context.supabase as any;
    const [manualRes, bookingRes] = await Promise.all([
      db.from("cash_book_entries").select("id, studio, datum, kunde, anzahlung, anzahlung_method, bar, gesamt, notiz, created_at"),
      db.from("bookings")
        .select("id, guest_name, duration, duration_minutes, status, anzahlung, anzahlung_method, anzahlung_paid, anzahlung_paid_at, deposit_exemption_reason, deposit_guarantor, bar, completed_at, cash_received_at, fully_paid, admin_note, created_at, requested_start, studio_override, studio_address_override, availability_slots(starts_at, ends_at, location, location_address, is_duo, is_content_shoot)")
        .in("status", ["pending", "waiting_deposit", "open", "confirmed", "cancelled", "rescheduling"]),
    ]);
    if (manualRes.error) throw new Error(manualRes.error.message);
    if (bookingRes.error) throw new Error(bookingRes.error.message);

    const manual: CashBookEntry[] = (manualRes.data ?? []).map((e: any) => {
      const isStudioRent = e.kunde === STUDIO_RENT_LABEL;
      const parsedNote = unpackCashbookNote(e.notiz);
      const meta = parsedNote.meta;
      const depositDate = !isStudioRent ? dateOnly(meta.deposit_date) ?? (Number(e.anzahlung) > 0 ? dateOnly(e.datum) : null) : null;
      const onsiteDate = !isStudioRent ? dateOnly(meta.onsite_date) ?? (Number(e.bar) > 0 ? dateOnly(e.datum) : null) : null;
      return {
        id: e.id, source: "manual", entry_type: isStudioRent ? "expense" : "income",
        expense_category: isStudioRent ? "studio_rent" : null,
        expense_amount: isStudioRent ? Number(e.bar) : 0,
        payment_method: isStudioRent ? e.anzahlung_method ?? null : null,
        booking_id: null, termin_datum: e.datum, termin_start: null, termin_ende: null,
        studio: e.studio, studio_address: null, kunde: e.kunde,
        art: isStudioRent ? STUDIO_RENT_LABEL : e.studio === "Custom Content" ? "Custom Content" : "Manuell",
        dauer: parsedNote.note || null,
        anzahlung: isStudioRent || !depositDate ? 0 : Number(e.anzahlung),
        anzahlung_vorgemerkt: isStudioRent ? 0 : Number(e.anzahlung),
        anzahlung_method: isStudioRent ? null : e.anzahlung_method ?? null,
        anzahlung_datum: depositDate,
        deposit_exemption_reason: isStudioRent ? null : meta.deposit_exemption_reason ?? null,
        deposit_guarantor: null,
        bar: isStudioRent || !onsiteDate ? 0 : Number(e.bar),
        restbetrag_vorgemerkt: isStudioRent ? 0 : Number(e.bar),
        restzahlung_method: isStudioRent ? null : meta.onsite_method ?? (Number(e.bar) > 0 ? "Bar" : null),
        bar_datum: onsiteDate,
        durchgefuehrt_datum: onsiteDate,
        gesamt: isStudioRent ? 0 : (depositDate ? Number(e.anzahlung) : 0) + (onsiteDate ? Number(e.bar) : 0),
        status: "completed",
        notiz: parsedNote.note, created_at: e.created_at,
        payment_kind: "manual", payment_date: onsiteDate ?? depositDate ?? e.datum,
      };
    });

    const bookings: CashBookEntry[] = (bookingRes.data ?? []).map((b: any) => {
      const slot = (Array.isArray(b.availability_slots) ? b.availability_slots[0] : b.availability_slots) as {
        starts_at?: string; ends_at?: string; location?: string; location_address?: string | null; is_duo?: boolean; is_content_shoot?: boolean;
      } | null;
      const appointmentStart = b.requested_start ?? slot?.starts_at ?? null;
      const appointmentEnd = appointmentStart && Number(b.duration_minutes ?? 0) > 0
        ? new Date(new Date(appointmentStart).getTime() + Number(b.duration_minutes) * 60_000).toISOString()
        : slot?.ends_at ?? null;
      const termin = dateOnly(appointmentStart) ?? dateOnly(b.created_at)!;
      const plannedDeposit = Number(b.anzahlung ?? 0);
      const plannedCash = Number(b.bar ?? 0);
      // Older bookings can have a confirmed paid flag without a payment timestamp.
      // Use the original booking record date only as a legacy fallback, never the session date.
      const depositDate = dateOnly(b.anzahlung_paid_at) ??
        (b.anzahlung_paid === true && plannedDeposit > 0 ? dateOnly(b.created_at) : null);
      const cashDate = dateOnly(b.cash_received_at) ?? (b.fully_paid ? dateOnly(b.completed_at) : null);
      const onsiteMethodFromNote = typeof b.admin_note === "string" ? b.admin_note.match(/(?:^|\n)Vor Ort Zahlungsmethode:\s*([^\n]+)/)?.[1]?.trim() ?? null : null;
      const exemptionFromNote = typeof b.admin_note === "string" && /(?:^|\n)Anzahlungsregel: Spontaner Termin(?:\n|$)/.test(b.admin_note) ? "spontaneous" : b.deposit_exemption_reason ?? null;
      const status: CashBookEntry["status"] = b.status === "cancelled" ? "cancelled" : b.status === "rescheduling" || /(?:^|\n)\s*(?:status\s*:\s*)?(?:umplanen|umplanung|rescheduling)(?:\s|$)/i.test(b.admin_note ?? "") ? "rescheduling" : b.fully_paid || b.completed_at ? "completed" : "open";
      const art = slot?.is_duo ? (slot?.is_content_shoot ? "Duo + Content" : "Duo") : (slot?.is_content_shoot ? "Single + Content" : "Single");
      const common = {
        source: "booking" as const, entry_type: "income" as const, expense_category: null,
        expense_amount: 0, payment_method: null, booking_id: b.id, termin_datum: termin,
        termin_start: appointmentStart, termin_ende: appointmentEnd,
        studio: b.studio_override?.trim() || realLocation(slot?.location) || "—",
        studio_address: b.studio_address_override?.trim() || slot?.location_address || null,
        kunde: b.guest_name, art, dauer: durationLabel(b.duration_minutes, b.duration),
        anzahlung_vorgemerkt: plannedDeposit,
        anzahlung_method: b.anzahlung_method ?? null, anzahlung_datum: depositDate,
        deposit_exemption_reason: exemptionFromNote, deposit_guarantor: b.deposit_guarantor ?? null,
        restbetrag_vorgemerkt: plannedCash, restzahlung_method: onsiteMethodFromNote ?? (b.deposit_exemption_reason || plannedDeposit === 0 ? b.anzahlung_method ?? null : plannedCash > 0 ? "Bar" : null),
        bar_datum: cashDate, durchgefuehrt_datum: dateOnly(b.completed_at),
        status, booking_status: b.status ?? null, notiz: b.admin_note ?? null, created_at: b.created_at,
      };
      const sessionType = parseSessionType(b.admin_note);
      if (sessionType && /^(Duo|Single)/.test(common.art)) common.art = common.art.replace(/^(Duo|Single)/, sessionType.isDuo ? "Duo" : "Single");
      const latexSurcharge = parseLatexSurcharge(b.admin_note);
      if (latexSurcharge) common.art = `${common.art} + Latex ${formatEuro(latexSurcharge)}`;
      // For the cash book, the dated payment is the source of truth.
      // A rescheduling workflow may leave/reset the legacy boolean flag even
      // though the deposit was actually received. If a payment date exists,
      // the deposit belongs to that payment month regardless of appointment status.
      const receivedDeposit = depositDate && plannedDeposit > 0 ? plannedDeposit : 0;
      const receivedCash = cashDate ? plannedCash : 0;
      return {
        ...common, id: `booking:${b.id}`, payment_kind: "booking", payment_date: cashDate ?? depositDate,
        anzahlung: receivedDeposit, bar: receivedCash, gesamt: receivedDeposit + receivedCash,
      };
    });

    // A rescheduling request can coexist with an older confirmed/open booking row.
    // Reconcile the displayed status with the request, but never manufacture or
    // duplicate a payment. The actual booking row remains the payment source.
    const reschedulingByName = new Map<string, typeof bookings>();
    for (const entry of bookings) {
      if (entry.status !== "rescheduling") continue;
      const key = entry.kunde.trim().toLocaleLowerCase("de");
      reschedulingByName.set(key, [...(reschedulingByName.get(key) ?? []), entry]);
    }
    for (const entry of bookings) {
      if (entry.status !== "open") continue;
      const matches = reschedulingByName.get(entry.kunde.trim().toLocaleLowerCase("de")) ?? [];
      // Only reconcile a uniquely matching request with the same deposit
      // amount and payment date; unrelated bookings for repeat clients stay intact.
      if (matches.length !== 1) continue;
      const request = matches[0];
      if (entry.anzahlung <= 0 || entry.anzahlung !== request.anzahlung ||
          !entry.anzahlung_datum || entry.anzahlung_datum !== request.anzahlung_datum) continue;
      entry.status = "rescheduling";
    }
    for (const entry of manual) { if (entry.studio === "Telefon-Session") entry.art = "Telefon-Session"; if (entry.studio === "Camsession") entry.art = "Camsession"; if (entry.studio === "Langzeiterziehung") entry.art = "Langzeiterziehung"; }
    return [...manual, ...bookings].sort((a, b) => {
      const ad = a.payment_date || a.termin_start || a.termin_datum;
      const bd = b.payment_date || b.termin_start || b.termin_datum;
      return ad < bd ? 1 : ad > bd ? -1 : 0;
    });
  });

const paymentDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum ungültig").nullable().optional();
const paymentMethod = z.string().max(100).nullable().optional();
const entrySchema = z.object({
  studio: z.string().min(1, "Studio fehlt").max(200),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum ungültig"),
  kunde: z.string().min(1, "Kunde fehlt").max(200),
  anzahlung: z.number().min(0).max(1_000_000),
  anzahlung_method: paymentMethod,
  anzahlung_datum: paymentDate,
  deposit_exemption_reason: z.enum(["regular_customer", "trust", "exception", "colleague_guarantees", "spontaneous"]).nullable().optional(),
  bar: z.number().min(0).max(1_000_000),
  restzahlung_method: paymentMethod,
  restzahlung_datum: paymentDate,
  notiz: z.string().max(2000).optional().nullable(),
});

function validatePhoneEntry<T extends z.infer<typeof entrySchema>>(entry: T): T {
  if (entry.studio === "Telefon-Session" && (
    ![50, 75, 100].includes(entry.anzahlung) || entry.bar !== 0 || entry.deposit_exemption_reason ||
    !entry.kunde.trim() || !entry.anzahlung_method?.trim() || !entry.anzahlung_datum ||
    !Number.isFinite(Date.parse(entry.anzahlung_datum)) || new Date(entry.anzahlung_datum).toISOString().slice(0, 10) !== entry.anzahlung_datum
  )) throw new Error("Telefon-Session: Name, Zahlungsart, gültiges Zahlungsdatum und 50, 75 oder 100 € erforderlich.");
  return entry;
}

export const createCashBookEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => validatePhoneEntry(entrySchema.parse(data)))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase.from("cash_book_entries").insert({
      studio: data.studio, datum: data.datum, kunde: data.kunde,
      anzahlung: data.deposit_exemption_reason ? 0 : data.anzahlung,
      anzahlung_method: data.deposit_exemption_reason ? null : data.anzahlung_method?.trim() || null,
      bar: data.bar,
      notiz: packCashbookNote(data.notiz, { deposit_date: data.deposit_exemption_reason ? null : data.anzahlung_datum ?? null, deposit_exemption_reason: data.deposit_exemption_reason ?? null, onsite_method: data.bar > 0 ? data.restzahlung_method?.trim() || null : null, onsite_date: data.bar > 0 ? data.restzahlung_datum ?? null : null }),
      created_by: context.userId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateCashBookEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => validatePhoneEntry(entrySchema.extend({ id: z.string().uuid() }).parse(data)))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("cash_book_entries").update({
      studio: data.studio.trim(),
      datum: data.datum,
      kunde: data.kunde.trim(),
      anzahlung: data.deposit_exemption_reason ? 0 : data.anzahlung,
      anzahlung_method: data.deposit_exemption_reason ? null : data.anzahlung_method?.trim() || null,
      bar: data.bar,
      notiz: packCashbookNote(data.notiz, { deposit_date: data.deposit_exemption_reason ? null : data.anzahlung_datum ?? null, deposit_exemption_reason: data.deposit_exemption_reason ?? null, onsite_method: data.bar > 0 ? data.restzahlung_method?.trim() || null : null, onsite_date: data.bar > 0 ? data.restzahlung_datum ?? null : null }),
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const expenseSchema = z.object({
  studio: z.string().min(1, "Studio fehlt").max(200),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum ungültig"),
  betrag: z.number().positive("Betrag muss größer als 0 sein").max(1_000_000),
  zahlungsart: z.string().min(1, "Zahlungsart fehlt").max(100),
  notiz: z.string().max(2000).optional().nullable(),
});

export const createStudioRentExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => expenseSchema.parse(data))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase.from("cash_book_entries").insert({
      studio: data.studio.trim(), datum: data.datum, kunde: STUDIO_RENT_LABEL,
      anzahlung: 0, anzahlung_method: data.zahlungsart.trim(), bar: data.betrag,
      notiz: data.notiz?.trim() || null, created_by: context.userId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return row;
  });


const CASHBOOK_GIFTS_BUCKET = "private-cashbook-gifts";
const giftSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  received_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payment_method: z.string().trim().min(1).max(100),
  amount: z.number().positive().max(1_000_000),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  purchase_item: z.string().trim().max(300).nullable().optional(),
  purchase_amount: z.number().min(0).max(1_000_000).optional(),
  note: z.string().max(2000).nullable().optional(),
  photo_data_url: z.string().max(7_000_000).nullable().optional(),
});
async function cashbookGiftAdminDb(context: { supabase: any; userId: string }) {
  await ensureAdmin(context.supabase, context.userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
async function privateGiftBucket(db: any, create = false) {
  const bucketName = CASHBOOK_GIFTS_BUCKET;
  let result = await db.storage.getBucket(bucketName);
  const missing = result.error && (String(result.error.statusCode) === "404" || result.error.code === "NoSuchBucket" || result.error.message === "Bucket not found");
  if (missing) {
    if (!create) return null;
    const made = await db.storage.createBucket(bucketName, { public: false });
    if (made.error && !["400", "409"].includes(String(made.error.statusCode))) throw new Error("Der private Geschenkespeicher konnte nicht angelegt werden.");
    result = await db.storage.getBucket(bucketName);
  }
  if (result.error || !result.data || result.data.public !== false) throw new Error("Der geschützte Geschenkespeicher ist nicht verfügbar.");
  return db.storage.from(bucketName);
}
export const listCashbookGifts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await cashbookGiftAdminDb(context);
    const bucket = await privateGiftBucket(db);
    if (!bucket) return [];
    const { data: files, error } = await bucket.list("", { limit: 1000, sortBy: { column: "name", order: "desc" } });
    if (error) throw new Error("Geschenke konnten nicht geladen werden.");
    const jsonFiles = (files ?? []).filter((file: any) => /^[a-f\d-]{36}\.json$/i.test(file.name));
    return await Promise.all(jsonFiles.map(async (file: any) => {
      const { data, error: downloadError } = await bucket.download(file.name);
      if (downloadError || !data) throw new Error("Ein Geschenk-Eintrag konnte nicht geladen werden.");
      const gift = giftSchema.omit({ photo_data_url: true }).parse(JSON.parse(await data.text()));
      let photo_url: string | null = null;
      if (gift.id) {
        const photo = await bucket.createSignedUrl(`${gift.id}.photo`, 3600);
        if (!photo.error) photo_url = photo.data.signedUrl;
      }
      return { ...gift, photo_url };
    }));
  });
export const createCashbookGift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => giftSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const db = await cashbookGiftAdminDb(context);
    const bucket = await privateGiftBucket(db, true);
    if (!bucket) throw new Error("Der Geschenkespeicher ist nicht verfügbar.");
    const id = data.id ?? crypto.randomUUID();
    let hasPhoto = false;
    if (data.photo_data_url) {
      const match = data.photo_data_url.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) throw new Error("Bitte ein JPG-, PNG- oder WebP-Bild auswählen.");
      const photo = Buffer.from(match[2], "base64");
      if (photo.length > 5 * 1024 * 1024) throw new Error("Das Bild darf höchstens 5 MB groß sein.");
      const { error } = await bucket.upload(`${id}.photo`, photo, { contentType: match[1], cacheControl: "0", upsert: true });
      if (error) throw new Error("Das Geschenkfoto konnte nicht gespeichert werden.");
      hasPhoto = true;
    }
    const record = { id, name: data.name, received_date: data.received_date, payment_method: data.payment_method, amount: data.amount, purchase_date: data.purchase_date ?? null, purchase_item: data.purchase_item ?? null, purchase_amount: data.purchase_amount ?? 0, note: data.note ?? null, has_photo: hasPhoto };
    const { error } = await bucket.upload(`${id}.json`, JSON.stringify(record), { contentType: "application/json", cacheControl: "0", upsert: false });
    if (error) throw new Error("Der Geschenkeintrag konnte nicht gespeichert werden.");
    return { ok: true };
  });
export const deleteCashbookGift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = await cashbookGiftAdminDb(context);
    const bucket = await privateGiftBucket(db);
    if (!bucket) return { ok: true };
    const { error } = await bucket.remove([`${data.id}.json`, `${data.id}.photo`]);
    if (error) throw new Error("Der Geschenkeintrag konnte nicht gelöscht werden.");
    return { ok: true };
  });

export const deleteCashBookEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("cash_book_entries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
