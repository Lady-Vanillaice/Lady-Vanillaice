import fs from "node:fs";

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Patch target missing: ${label}`);
  return source.replace(before, after);
}

const formPath = "src/components/admin/admin-shared.tsx";
let form = fs.readFileSync(formPath, "utf8");

form = replaceOnce(form,
`  guest_contact?: string | null;\n  source?: string | null;`,
`  guest_contact?: string | null;\n  guest_email?: string | null;\n  calendar_day_type?: "single" | "duo";\n  calendar_duo_partner?: string | null;\n  source?: string | null;`,
"manual booking value email and calendar mode");

form = replaceOnce(form,
`  const [contact, setContact] = useState("");\n  const [note, setNote] = useState("");`,
`  const [contact, setContact] = useState("");\n  const [email, setEmail] = useState("");\n  const [calendarDayType, setCalendarDayType] = useState<"single" | "duo">("single");\n  const [calendarDuoPartner, setCalendarDuoPartner] = useState("");\n  const [note, setNote] = useState("");`,
"email and calendar state");

form = replaceOnce(form,
`    setGuestName(name);\n    setContact(phone || customer.email);`,
`    setGuestName(name);\n    setContact(phone);\n    setEmail(customer.email ?? "");`,
"customer contact split");

form = replaceOnce(form,
`    if (bookingType === "duo" && !duoPartner.trim()) {\n      setErr("Bitte die Duo-Partnerin angeben.");\n      return;\n    }`,
`    if (bookingType === "duo" && !duoPartner.trim()) {\n      setErr("Bitte die Duo-Partnerin angeben.");\n      return;\n    }\n\n    if (bookingType === "single" && calendarDayType === "duo" && !calendarDuoPartner.trim()) {\n      setErr("Bitte die Duo-Partnerin für den Duo-Tag angeben.");\n      return;\n    }`,
"validate duo day partner");

form = replaceOnce(form,
`        guest_contact: contact.trim() || null,\n        source: source.trim() || null,`,
`        guest_contact: contact.trim() || null,\n        guest_email: email.trim() || null,\n        calendar_day_type: bookingType === "single" ? calendarDayType : bookingType === "duo" ? "duo" : "single",\n        calendar_duo_partner:\n          bookingType === "duo"\n            ? duoPartner.trim()\n            : bookingType === "single" && calendarDayType === "duo"\n              ? calendarDuoPartner.trim()\n              : null,\n        source: source.trim() || null,`,
"submit email and calendar mode");

form = replaceOnce(form,
`      setContact("");\n      setNote("");`,
`      setContact("");\n      setEmail("");\n      setCalendarDayType("single");\n      setCalendarDuoPartner("");\n      setNote("");`,
"reset email and calendar mode");

form = replaceOnce(form,
`      {bookingType === "duo" && (`,
`      {bookingType === "single" && (\n        <div className="border border-champagne/20 bg-anthracite/20 p-3 space-y-3">\n          <div>\n            <label className="eyebrow block mb-2">Darstellung im Kalender</label>\n            <div className="grid gap-2 sm:grid-cols-2">\n              <button\n                type="button"\n                onClick={() => { setCalendarDayType("single"); setCalendarDuoPartner(""); }}\n                className={calendarDayType === "single" ? "btn-gold !py-2 !px-3 !text-[0.65rem]" : "btn-outline-gold !py-2 !px-3 !text-[0.65rem]"}\n              >\n                Normaler Einzeltermin\n              </button>\n              <button\n                type="button"\n                onClick={() => setCalendarDayType("duo")}\n                className={calendarDayType === "duo" ? "btn-gold !py-2 !px-3 !text-[0.65rem]" : "btn-outline-gold !py-2 !px-3 !text-[0.65rem]"}\n              >\n                Einzel an Duo-Tag\n              </button>\n            </div>\n          </div>\n          {calendarDayType === "duo" && (\n            <div>\n              <label className="eyebrow block mb-1">Duo-Partnerin des Tages</label>\n              <input\n                value={calendarDuoPartner}\n                onChange={(e) => setCalendarDuoPartner(e.target.value)}\n                placeholder="z. B. Lady Selena"\n                className="input-luxe !py-2"\n                required\n              />\n              <p className="mt-1 text-[0.65rem] text-vanilla/45">Der Termin bleibt Einzel und wird öffentlich im Duo-Tagesbalken türkis als nur Einzel markiert.</p>\n            </div>\n          )}\n        </div>\n      )}\n\n      {bookingType === "duo" && (`,
"calendar mode UI");

form = replaceOnce(form,
`      <div>\n        <label className="eyebrow block mb-1">Kontakt (optional)</label>\n        <input\n          value={contact}\n          onChange={(e) => setContact(e.target.value)}\n          placeholder="@telegram-handle, E-Mail oder Telefonnummer"\n          className="input-luxe !py-2"\n        />\n      </div>`,
`      <div className="grid gap-3 sm:grid-cols-2">\n        <div>\n          <label className="eyebrow block mb-1">WhatsApp / Telefon / Telegram (optional)</label>\n          <input\n            value={contact}\n            onChange={(e) => setContact(e.target.value)}\n            placeholder="+49 … oder @telegram-handle"\n            className="input-luxe !py-2"\n            autoComplete="tel"\n          />\n        </div>\n        <div>\n          <label className="eyebrow block mb-1">E-Mail-Adresse (optional)</label>\n          <input\n            type="email"\n            value={email}\n            onChange={(e) => setEmail(e.target.value)}\n            placeholder="kunde@example.de"\n            className="input-luxe !py-2"\n            autoComplete="email"\n          />\n          <p className="mt-1 text-[0.65rem] text-vanilla/45">Wird für spätere Nachrichten im Bereich Kommunikation gespeichert. Beim Eintragen wird keine automatische E-Mail versendet.</p>\n        </div>\n      </div>`,
"real contact and email fields");

fs.writeFileSync(formPath, form);

const bookingPath = "src/lib/booking.functions.ts";
let booking = fs.readFileSync(bookingPath, "utf8");

booking = replaceOnce(booking,
`  guest_contact: z.string().trim().max(200).optional().nullable(),\n  source: z.string().trim().max(60).optional().nullable(),`,
`  guest_contact: z.string().trim().max(200).optional().nullable(),\n  guest_email: z.string().trim().email().max(200).optional().nullable(),\n  calendar_day_type: z.enum(["single", "duo"]).optional(),\n  calendar_duo_partner: z.string().trim().max(120).optional().nullable(),\n  source: z.string().trim().max(60).optional().nullable(),`,
"server email and calendar validator");

booking = replaceOnce(booking,
`    // Decide guest_email — the DB enforces an email format check.\n    const contact = data.guest_contact?.trim() ?? "";\n    const isEmail = /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(contact);\n    const guestEmail = isEmail\n      ? contact\n      : \`manuell+\${crypto.randomUUID().slice(0, 8)}@intern.local\`;`,
`    const contact = data.guest_contact?.trim() ?? "";\n    const guestEmail = data.guest_email?.trim() ||\n      \`manuell+\${crypto.randomUUID().slice(0, 8)}@intern.local\`;`,
"separate guest email");

booking = replaceOnce(booking,
`      contact && !isEmail ? \`Kontakt: \${contact}\` : null,`,
`      contact ? \`Kontakt: \${contact}\` : null,`,
"contact note");

booking = replaceOnce(booking,
`    if (openOverlapErr) throw new Error(openOverlapErr.message);\n\n    for (const s of openOverlaps ?? []) {`,
`    if (openOverlapErr) throw new Error(openOverlapErr.message);\n\n    const inferredDuoPartner = (openOverlaps ?? []).find((slot) => slot.is_duo && slot.duo_partner)?.duo_partner ?? null;\n    const duoDayPartner = data.booking_type === "duo"\n      ? data.duo_partner?.trim() || data.calendar_duo_partner?.trim() || inferredDuoPartner\n      : data.booking_type === "single" && data.calendar_day_type === "duo"\n        ? data.calendar_duo_partner?.trim() || inferredDuoPartner\n        : null;\n\n    if ((data.booking_type === "duo" || (data.booking_type === "single" && data.calendar_day_type === "duo")) && !duoDayPartner) {\n      throw new Error("Bitte die Duo-Partnerin für diesen Tag angeben.");\n    }\n\n    for (const s of openOverlaps ?? []) {`,
"resolve explicit duo day partner");

booking = replaceOnce(booking,
`  duo_partner:\n    data.booking_type === "duo"\n      ? data.duo_partner?.trim() ?? null\n      : null,`,
`  duo_partner:\n    data.booking_type === "duo"\n      ? duoDayPartner\n      : data.booking_type === "single" && data.calendar_day_type === "duo"\n        ? duoDayPartner\n        : null,`,
"single-only duo marker");

fs.writeFileSync(bookingPath, booking);
console.log("Manual booking email and Duo-day Single handling patched.");
