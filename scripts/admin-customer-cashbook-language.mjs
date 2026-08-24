import fs from "node:fs";

function patchFile(path, patches) {
  let source = fs.readFileSync(path, "utf8");
  for (const patch of patches) {
    if (source.includes(patch.after)) continue;
    if (!source.includes(patch.before)) {
      throw new Error(`${path}: patch target not found: ${patch.label}`);
    }
    source = source.replace(patch.before, patch.after);
  }
  fs.writeFileSync(path, source);
}

patchFile("src/lib/booking.functions.ts", [
  {
    label: "add updateBookingGuestName server function",
    before: `export const updateBookingNote = createServerFn({ method: "POST" })`,
    after: `export const updateBookingGuestName = createServerFn({ method: "POST" })\n  .middleware([requireSupabaseAuth])\n  .inputValidator((d) =>\n    z.object({\n      id: z.string().uuid(),\n      guest_name: z.string().trim().min(1).max(120),\n    }).parse(d),\n  )\n  .handler(async ({ data, context }) => {\n    await ensureAdmin(context.supabase, context.userId);\n    const { error } = await context.supabase\n      .from("bookings")\n      .update({ guest_name: data.guest_name.trim() })\n      .eq("id", data.id);\n    if (error) throw new Error(error.message);\n    return { ok: true };\n  });\n\nexport const updateBookingNote = createServerFn({ method: "POST" })`,
  },
]);

patchFile("src/routes/_authenticated/admin.buchung.$id.tsx", [
  {
    label: "import name updater",
    before: `  updateBookingNote,\n  updateBookingSchedule,`,
    after: `  updateBookingNote,\n  updateBookingGuestName,\n  updateBookingSchedule,`,
  },
  {
    label: "bind name updater",
    before: `  const saveNote = useServerFn(updateBookingNote);\n  const saveSchedule = useServerFn(updateBookingSchedule);`,
    after: `  const saveNote = useServerFn(updateBookingNote);\n  const saveGuestName = useServerFn(updateBookingGuestName);\n  const saveSchedule = useServerFn(updateBookingSchedule);`,
  },
  {
    label: "name state",
    before: `  const [note, setNote] = useState("");\n  const [noteSaved, setNoteSaved] = useState(false);`,
    after: `  const [note, setNote] = useState("");\n  const [noteSaved, setNoteSaved] = useState(false);\n  const [guestName, setGuestName] = useState("");\n  const [guestNameSaved, setGuestNameSaved] = useState(false);`,
  },
  {
    label: "booking detail type name",
    before: `      const b = detailQ.data.booking as {\n  admin_note: string | null;`,
    after: `      const b = detailQ.data.booking as {\n  guest_name: string;\n  admin_note: string | null;`,
  },
  {
    label: "initialize guest name",
    before: `      setNote(b.admin_note ?? "");\n      setConfirmationNote(b.confirmation_note ?? "");`,
    after: `      setGuestName(b.guest_name ?? "");\n      setNote(b.admin_note ?? "");\n      setConfirmationNote(b.confirmation_note ?? "");`,
  },
  {
    label: "guest name mutation",
    before: `  const noteMut = useMutation({`,
    after: `  const guestNameMut = useMutation({\n    mutationFn: () => saveGuestName({ data: { id, guest_name: guestName.trim() } }),\n    onSuccess: () => {\n      setGuestNameSaved(true);\n      setTimeout(() => setGuestNameSaved(false), 2500);\n      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });\n      qc.invalidateQueries({ queryKey: ["admin-bookings"] });\n      qc.invalidateQueries({ queryKey: ["cashbook"] });\n      router.invalidate();\n    },\n  });\n\n  const noteMut = useMutation({`,
  },
  {
    label: "editable guest name UI",
    before: `              <div className="text-vanilla font-medium mb-1">\n                {booking.guest_name}\n              </div>\n              <a`,
    after: `              <div className="space-y-2 mb-3">\n                <label className="block text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45">Kundenname / vollständiger Name</label>\n                <div className="flex gap-2">\n                  <input\n                    value={guestName}\n                    onChange={(event) => setGuestName(event.target.value)}\n                    maxLength={120}\n                    className="luxe-input flex-1"\n                    placeholder="Name oder Pseudonym"\n                  />\n                  <button\n                    type="button"\n                    onClick={() => guestNameMut.mutate()}\n                    disabled={!guestName.trim() || guestNameMut.isPending}\n                    className="btn-outline-gold !py-2 !px-3 !text-[0.6rem] disabled:opacity-40"\n                  >\n                    {guestNameMut.isPending ? "Speichere…" : guestNameSaved ? "✓" : "Speichern"}\n                  </button>\n                </div>\n                {guestNameMut.error instanceof Error && (\n                  <p className="text-xs text-bordeaux">{guestNameMut.error.message}</p>\n                )}\n              </div>\n              <a`,
  },
]);

patchFile("src/routes/_authenticated/admin.kassenbuch.tsx", [
  {
    label: "completed appointments descending date time",
    before: `  const completedIncomeEntries = incomeEntries.filter(e => e.status === "completed");`,
    after: `  const completedIncomeEntries = incomeEntries\n    .filter(e => e.status === "completed")\n    .sort((a, b) => {\n      const aKey = \`${'${a.termin_datum}'}T${'${a.termin_start ?? "00:00:00"}'}\`;\n      const bKey = \`${'${b.termin_datum}'}T${'${b.termin_start ?? "00:00:00"}'}\`;\n      return bKey.localeCompare(aKey);\n    });`,
  },
]);

patchFile("src/lib/public-booking.functions.ts", [
  {
    label: "booking language validator",
    before: `  marketing_consent: z.boolean().optional().default(false),\n});`,
    after: `  marketing_consent: z.boolean().optional().default(false),\n  preferred_language: z.enum(["de", "en"]).optional().default("de"),\n});`,
  },
  {
    label: "booking language insert type",
    before: `      message: string;\n    } = {`,
    after: `      message: string;\n      preferred_language?: "de" | "en";\n    } = {`,
  },
  {
    label: "booking language insert value",
    before: `      message: data.message,\n    };`,
    after: `      message: data.message,\n      preferred_language: data.preferred_language,\n    };`,
  },
  {
    label: "allow new language column before generated types catch up",
    before: `      .insert(insertData)\n      .select("id")`,
    after: `      .insert(insertData as any)\n      .select("id")`,
  },
]);

patchFile("src/routes/kalender.tsx", [
  {
    label: "calendar booking language",
    before: `          marketing_consent: vars.marketingConsent,\n        },`,
    after: `          marketing_consent: vars.marketingConsent,\n          preferred_language: lang,\n        },`,
  },
]);

patchFile("src/routes/buchung.tsx", [
  {
    label: "booking page useLang import",
    before: `import { useTr } from "@/i18n";`,
    after: `import { useTr, useLang } from "@/i18n";`,
  },
  {
    label: "booking page lang hook",
    before: `  const tr = useTr();\n\n  async function onSubmit`,
    after: `  const tr = useTr();\n  const { lang } = useLang();\n\n  async function onSubmit`,
  },
  {
    label: "booking page submit language",
    before: `age_confirmed: true, marketing_consent: marketingConsent } });`,
    after: `age_confirmed: true, marketing_consent: marketingConsent, preferred_language: lang } });`,
  },
]);

patchFile("src/lib/email/enqueue.server.ts", [
  {
    label: "translate English booking emails centrally",
    before: `  // Render\n  const element = React.createElement(template.component, templateData)\n  const html = await render(element)\n  const plainText = await render(element, { plainText: true })\n  const subject =\n    typeof template.subject === 'function'\n      ? template.subject(templateData)\n      : template.subject\n`,
    after: `  // Render\n  const element = React.createElement(template.component, templateData)\n  let html = await render(element)\n  let plainText = await render(element, { plainText: true })\n  let subject =\n    typeof template.subject === 'function'\n      ? template.subject(templateData)\n      : template.subject\n\n  // Customer-facing booking emails follow the language used for the booking.\n  // Callers can pass language/preferredLanguage explicitly; otherwise we resolve\n  // it from the newest booking for this recipient so all existing email flows\n  // (confirmation, reminder, follow-up and personal messages) are covered.\n  let preferredLanguage = templateData.preferredLanguage ?? templateData.language\n  if (!preferredLanguage && !isOwnerNotification) {\n    const emailDb = supabaseAdmin as any\n    const { data: latestBooking } = await emailDb\n      .from('bookings')\n      .select('preferred_language')\n      .eq('guest_email', normalizedEmail)\n      .order('created_at', { ascending: false })\n      .limit(1)\n      .maybeSingle()\n    preferredLanguage = latestBooking?.preferred_language ?? 'de'\n  }\n\n  if (preferredLanguage === 'en' && !isOwnerNotification) {\n    try {\n      const { translateEmailToEnglish } = await import('@/lib/email/translate.server')\n      const translated = await translateEmailToEnglish({ subject, html, text: plainText })\n      subject = translated.subject\n      html = translated.html\n      plainText = translated.text\n    } catch (translationError) {\n      console.error('English email translation failed', translationError)\n      return { success: false, reason: 'english_translation_failed' }\n    }\n  }\n`,
  },
]);
