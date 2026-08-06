import fs from "node:fs";

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Patch target missing: ${label}`);
  return source.replace(before, after);
}

const formPath = "src/components/admin/admin-shared.tsx";
let form = fs.readFileSync(formPath, "utf8");

form = replaceOnce(form,
`  guest_contact?: string | null;\n  source?: string | null;`,
`  guest_contact?: string | null;\n  guest_email?: string | null;\n  source?: string | null;`,
"manual booking value email");

form = replaceOnce(form,
`  const [contact, setContact] = useState("");\n  const [note, setNote] = useState("");`,
`  const [contact, setContact] = useState("");\n  const [email, setEmail] = useState("");\n  const [note, setNote] = useState("");`,
"email state");

form = replaceOnce(form,
`    setGuestName(name);\n    setContact(phone || customer.email);`,
`    setGuestName(name);\n    setContact(phone);\n    setEmail(customer.email ?? "");`,
"customer contact split");

form = replaceOnce(form,
`        guest_contact: contact.trim() || null,\n        source: source.trim() || null,`,
`        guest_contact: contact.trim() || null,\n        guest_email: email.trim() || null,\n        source: source.trim() || null,`,
"submit email");

form = replaceOnce(form,
`      setContact("");\n      setNote("");`,
`      setContact("");\n      setEmail("");\n      setNote("");`,
"reset email");

form = replaceOnce(form,
`      <div>\n        <label className="eyebrow block mb-1">Kontakt (optional)</label>\n        <input\n          value={contact}\n          onChange={(e) => setContact(e.target.value)}\n          placeholder="@telegram-handle, E-Mail oder Telefonnummer"\n          className="input-luxe !py-2"\n        />\n      </div>`,
`      <div className="grid gap-3 sm:grid-cols-2">\n        <div>\n          <label className="eyebrow block mb-1">WhatsApp / Telefon / Telegram (optional)</label>\n          <input\n            value={contact}\n            onChange={(e) => setContact(e.target.value)}\n            placeholder="+49 … oder @telegram-handle"\n            className="input-luxe !py-2"\n            autoComplete="tel"\n          />\n        </div>\n        <div>\n          <label className="eyebrow block mb-1">E-Mail-Adresse (optional)</label>\n          <input\n            type="email"\n            value={email}\n            onChange={(e) => setEmail(e.target.value)}\n            placeholder="kunde@example.de"\n            className="input-luxe !py-2"\n            autoComplete="email"\n          />\n        </div>\n      </div>`,
"real contact and email fields");

fs.writeFileSync(formPath, form);

const bookingPath = "src/lib/booking.functions.ts";
let booking = fs.readFileSync(bookingPath, "utf8");

booking = replaceOnce(booking,
`  guest_contact: z.string().trim().max(200).optional().nullable(),\n  source: z.string().trim().max(60).optional().nullable(),`,
`  guest_contact: z.string().trim().max(200).optional().nullable(),\n  guest_email: z.string().trim().email().max(200).optional().nullable(),\n  source: z.string().trim().max(60).optional().nullable(),`,
"server email validator");

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
`    if (openOverlapErr) throw new Error(openOverlapErr.message);\n\n    const duoDayPartner = data.booking_type === "single"\n      ? (openOverlaps ?? []).find((slot) => slot.is_duo && slot.duo_partner)?.duo_partner ?? null\n      : null;\n\n    for (const s of openOverlaps ?? []) {`,
"remember duo partner before splitting");

booking = replaceOnce(booking,
`  duo_partner:\n    data.booking_type === "duo"\n      ? data.duo_partner?.trim() ?? null\n      : null,`,
`  duo_partner:\n    data.booking_type === "duo"\n      ? data.duo_partner?.trim() ?? null\n      : data.booking_type === "single"\n        ? duoDayPartner\n        : null,`,
"single-only duo marker");

fs.writeFileSync(bookingPath, booking);
console.log("Manual booking Single/Duo handling patched.");
