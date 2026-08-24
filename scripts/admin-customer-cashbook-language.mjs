import fs from "node:fs";

function apply(path, before, after, label) {
  let source = fs.readFileSync(path, "utf8");
  if (source.includes(after)) return;
  if (!source.includes(before)) {
    console.warn(`[admin-language] skipped ${label}: target not found in ${path}`);
    return;
  }
  source = source.replace(before, after);
  fs.writeFileSync(path, source);
  console.log(`[admin-language] applied ${label}`);
}

const bookingFns = "src/lib/booking.functions.ts";
apply(
  bookingFns,
  `export const updateBookingNote = createServerFn({ method: "POST" })`,
  `export const updateBookingGuestName = createServerFn({ method: "POST" })\n  .middleware([requireSupabaseAuth])\n  .inputValidator((d) => z.object({ id: z.string().uuid(), guest_name: z.string().trim().min(1).max(120) }).parse(d))\n  .handler(async ({ data, context }) => {\n    await ensureAdmin(context.supabase, context.userId);\n    const { error } = await context.supabase.from("bookings").update({ guest_name: data.guest_name.trim() }).eq("id", data.id);\n    if (error) throw new Error(error.message);\n    return { ok: true };\n  });\n\nexport const updateBookingNote = createServerFn({ method: "POST" })`,
  "editable customer name server function",
);

const bookingAdmin = "src/routes/_authenticated/admin.buchung.$id.tsx";
apply(bookingAdmin, `  updateBookingNote,\n  updateBookingSchedule,`, `  updateBookingNote,\n  updateBookingGuestName,\n  updateBookingSchedule,`, "name updater import");
apply(bookingAdmin, `  const saveNote = useServerFn(updateBookingNote);\n  const saveSchedule = useServerFn(updateBookingSchedule);`, `  const saveNote = useServerFn(updateBookingNote);\n  const saveGuestName = useServerFn(updateBookingGuestName);\n  const saveSchedule = useServerFn(updateBookingSchedule);`, "name updater binding");
apply(bookingAdmin, `  const [note, setNote] = useState("");\n  const [noteSaved, setNoteSaved] = useState(false);`, `  const [note, setNote] = useState("");\n  const [noteSaved, setNoteSaved] = useState(false);\n  const [guestName, setGuestName] = useState("");\n  const [guestNameSaved, setGuestNameSaved] = useState(false);`, "name state");
apply(bookingAdmin, `      const b = detailQ.data.booking as {\n  admin_note: string | null;`, `      const b = detailQ.data.booking as {\n  guest_name: string;\n  admin_note: string | null;`, "name detail type");
apply(bookingAdmin, `      setNote(b.admin_note ?? "");\n      setConfirmationNote(b.confirmation_note ?? "");`, `      setGuestName(b.guest_name ?? "");\n      setNote(b.admin_note ?? "");\n      setConfirmationNote(b.confirmation_note ?? "");`, "name initialization");
apply(bookingAdmin, `  const noteMut = useMutation({`, `  const guestNameMut = useMutation({\n    mutationFn: () => saveGuestName({ data: { id, guest_name: guestName.trim() } }),\n    onSuccess: () => {\n      setGuestNameSaved(true);\n      setTimeout(() => setGuestNameSaved(false), 2500);\n      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });\n      qc.invalidateQueries({ queryKey: ["admin-bookings"] });\n      qc.invalidateQueries({ queryKey: ["cashbook"] });\n      router.invalidate();\n    },\n  });\n\n  const noteMut = useMutation({`, "name mutation");
apply(
  bookingAdmin,
  `              <div className="text-vanilla font-medium mb-1">\n                {booking.guest_name}\n              </div>\n              <a`,
  `              <div className="space-y-2 mb-3">\n                <label className="block text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45">Kundenname / vollständiger Name</label>\n                <div className="flex gap-2">\n                  <input value={guestName} onChange={(event) => setGuestName(event.target.value)} maxLength={120} className="luxe-input flex-1" placeholder="Name oder Pseudonym" />\n                  <button type="button" onClick={() => guestNameMut.mutate()} disabled={!guestName.trim() || guestNameMut.isPending} className="btn-outline-gold !py-2 !px-3 !text-[0.6rem] disabled:opacity-40">\n                    {guestNameMut.isPending ? "Speichere…" : guestNameSaved ? "✓" : "Speichern"}\n                  </button>\n                </div>\n                {guestNameMut.error instanceof Error && <p className="text-xs text-bordeaux">{guestNameMut.error.message}</p>}\n              </div>\n              <a`,
  "editable customer name UI",
);

const cashbook = "src/routes/_authenticated/admin.kassenbuch.tsx";
apply(
  cashbook,
  `  const completedIncomeEntries = incomeEntries.filter(e => e.status === "completed" || e.status === "cancelled");`,
  `  const completedIncomeEntries = incomeEntries\n    .filter(e => e.status === "completed" || e.status === "cancelled")\n    .sort((a, b) => {\n      const aKey = \`${'${a.termin_datum}'}T${'${a.termin_start ?? "00:00:00"}'}\`;\n      const bKey = \`${'${b.termin_datum}'}T${'${b.termin_start ?? "00:00:00"}'}\`;\n      return bKey.localeCompare(aKey);\n    });`,
  "past appointments newest first",
);

const publicBooking = "src/lib/public-booking.functions.ts";
apply(publicBooking, `  marketing_consent: z.boolean().optional().default(false),\n});`, `  marketing_consent: z.boolean().optional().default(false),\n  preferred_language: z.enum(["de", "en"]).optional().default("de"),\n});`, "booking language validator");
apply(publicBooking, `      message: string;\n    } = {`, `      message: string;\n      preferred_language?: "de" | "en";\n    } = {`, "booking language type");
apply(publicBooking, `      message: data.message,\n    };`, `      message: data.message,\n      preferred_language: data.preferred_language,\n    };`, "booking language payload");
apply(publicBooking, `      .insert(insertData)\n      .select("id")`, `      .insert(insertData as any)\n      .select("id")`, "booking language typed insert");

const calendar = "src/routes/kalender.tsx";
apply(calendar, `          marketing_consent: vars.marketingConsent,\n        },`, `          marketing_consent: vars.marketingConsent,\n          preferred_language: lang,\n        },`, "calendar language");

const bookingPage = "src/routes/buchung.tsx";
apply(bookingPage, `import { useTr } from "@/i18n";`, `import { useTr, useLang } from "@/i18n";`, "booking page language import");
apply(bookingPage, `  const tr = useTr();\n\n  async function onSubmit`, `  const tr = useTr();\n  const { lang } = useLang();\n\n  async function onSubmit`, "booking page language hook");
apply(bookingPage, `age_confirmed: true, marketing_consent: marketingConsent } });`, `age_confirmed: true, marketing_consent: marketingConsent, preferred_language: lang } });`, "booking page language submit");

const enqueue = "src/lib/email/enqueue.server.ts";
apply(
  enqueue,
  `  // Render\n  const element = React.createElement(template.component, templateData)\n  const html = await render(element)\n  const plainText = await render(element, { plainText: true })\n  const subject =\n    typeof template.subject === 'function'\n      ? template.subject(templateData)\n      : template.subject\n`,
  `  // Render\n  const element = React.createElement(template.component, templateData)\n  let html = await render(element)\n  let plainText = await render(element, { plainText: true })\n  let subject =\n    typeof template.subject === 'function'\n      ? template.subject(templateData)\n      : template.subject\n\n  let preferredLanguage = templateData.preferredLanguage ?? templateData.language\n  if (!preferredLanguage && !isOwnerNotification) {\n    const emailDb = supabaseAdmin as any\n    const { data: latestBooking } = await emailDb.from('bookings').select('preferred_language').eq('guest_email', normalizedEmail).order('created_at', { ascending: false }).limit(1).maybeSingle()\n    preferredLanguage = latestBooking?.preferred_language ?? 'de'\n  }\n\n  if (preferredLanguage === 'en' && !isOwnerNotification) {\n    try {\n      const { translateEmailToEnglish } = await import('@/lib/email/translate.server')\n      const translated = await translateEmailToEnglish({ subject, html, text: plainText })\n      subject = translated.subject\n      html = translated.html\n      plainText = translated.text\n    } catch (translationError) {\n      console.error('English email translation failed', translationError)\n      return { success: false, reason: 'english_translation_failed' }\n    }\n  }\n`,
  "central English customer email translation",
);
