import fs from "node:fs";

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Booking communication patch could not apply: ${label}`);
  return source.replace(before, after);
}

// Admin communication: keep only the manual templates that are still useful.
const adminPath = "src/routes/_authenticated/admin.buchung.$id.tsx";
let admin = fs.readFileSync(adminPath, "utf8");
admin = replaceOnce(
  admin,
  `const MESSAGE_TEMPLATES = [\n  { label: "Anfrage erhalten", text: "Danke für deine Anfrage. Ich prüfe den gewünschten Termin und melde mich schnellstmöglich mit einer verbindlichen Rückmeldung." },\n  { label: "Anzahlung", text: "Dein Termin ist vorgemerkt. Bitte überweise die vereinbarte Anzahlung, damit ich ihn verbindlich für dich reservieren kann." },\n  { label: "Termin-Erinnerung", text: "Ich freue mich auf unseren Termin. Bitte sei pünktlich und melde dich kurz, falls sich bei deiner Anreise etwas ändert." },\n  { label: "Adresse & Anfahrt", text: "Hier erhältst du noch einmal alle wichtigen Informationen zu Adresse und Anfahrt. Bitte plane ausreichend Zeit für deinen Weg ein." },\n  { label: "Danke danach", text: "Danke für dein Vertrauen und unsere gemeinsame Zeit. Ich wünsche dir einen angenehmen Nachklang." },\n] as const;`,
  `const MESSAGE_TEMPLATES = [\n  { label: "Adresse & Anfahrt", text: "Hier erhältst du noch einmal alle wichtigen Informationen zu Adresse und Anfahrt. Bitte plane ausreichend Zeit für deinen Weg ein." },\n] as const;`,
  "remove automated message templates",
);

const oldFixedMessage = `  function createFixedAppointmentMessage() {\n    const dateValue = overrideDate || (booking.requested_start ? String(booking.requested_start).slice(0, 10) : "");\n    const timeValue = overrideTime || (booking.requested_start\n      ? format(new Date(booking.requested_start), "HH:mm")\n      : slot?.starts_at\n        ? format(new Date(slot.starts_at), "HH:mm")\n        : "");\n    const durationValue = Number(overrideDuration || booking.duration_minutes || 0);\n    const depositValue = Number((anzahlungInput || "0").replace(",", ".")) || 0;\n    const cashValue = Number((barInput || "0").replace(",", ".")) || 0;\n    const displayDate = dateValue\n      ? format(new Date(\`\${dateValue}T12:00:00\`), "EEEE, dd.MM.yyyy", { locale: de })\n      : "noch nicht eingetragen";\n    const durationText = durationValue > 0\n      ? \`\${durationValue} Minuten\${durationValue % 60 === 0 ? \` (\${durationValue / 60} Std.)\` : ""}\`\n      : "noch nicht eingetragen";\n    const lines = [\n      \`Hallo \${booking.guest_name},\`,\n      "",\n      "dein Termin ist hiermit verbindlich fixiert.",\n      "",\n      \`Termin: \${displayDate}\${timeValue ? \` um \${timeValue} Uhr\` : ""}\`,\n      \`Dauer: \${durationText}\`,\n      slot?.location ? \`Ort: \${slot.location}\` : null,\n      \`Session: \${isDuoBooking ? \`Duo Session\${duoPartner.trim() ? \` mit \${duoPartner.trim()}\` : ""}\` : "Single Session"}\`,\n      "",\n      depositExemptionReason\n        ? "Anzahlung: nicht erforderlich"\n        : \`Anzahlung: \${depositValue.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €\${anzahlungMethod.trim() ? \` per \${anzahlungMethod.trim()}\` : ""}\`,\n      !depositExemptionReason && anzahlungPaidDate\n        ? \`Anzahlung erhalten am: \${format(new Date(\`\${anzahlungPaidDate}T12:00:00\`), "dd.MM.yyyy", { locale: de })}\`\n        : null,\n      \`Vor Ort Betrag: \${cashValue.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €\${restPaymentMethod.trim() ? \` per \${restPaymentMethod.trim()}\` : ""}\`,\n      barPaidDate ? \`Vor Ort erhalten am: \${format(new Date(\`\${barPaidDate}T12:00:00\`), "dd.MM.yyyy", { locale: de })}\` : null,\n      "",\n      "Ich freue mich auf unseren Termin.",\n      "",\n      "Liebe Grüße\\nLady Vanilla Ice",\n    ];\n    setConfirmationNote(lines.filter((line): line is string => line !== null).join("\\n"));\n  }`;

const newFixedMessage = `  function createFixedAppointmentMessage() {\n    const dateValue = overrideDate || (booking.requested_start ? String(booking.requested_start).slice(0, 10) : "");\n    const timeValue = overrideTime || (booking.requested_start\n      ? format(new Date(booking.requested_start), "HH:mm")\n      : slot?.starts_at\n        ? format(new Date(slot.starts_at), "HH:mm")\n        : "");\n    const durationValue = Number(overrideDuration || booking.duration_minutes || 0);\n    const displayDate = dateValue\n      ? format(new Date(\`\${dateValue}T12:00:00\`), "EEEE, dd.MM.yyyy", { locale: de })\n      : "noch nicht eingetragen";\n    const durationText = durationValue > 0\n      ? \`\${durationValue} Minuten\${durationValue % 60 === 0 ? \` (\${durationValue / 60} Std.)\` : ""}\`\n      : "noch nicht eingetragen";\n    const locationText = studioName.trim() || slot?.location || "noch nicht eingetragen";\n    const sessionText = isDuoBooking\n      ? \`Duo Session\${duoPartner.trim() ? \` mit \${duoPartner.trim()}\` : ""}\`\n      : "Single Session";\n    setConfirmationNote([\n      \`Termin: \${displayDate}\${timeValue ? \` um \${timeValue} Uhr\` : ""}\`,\n      \`Dauer: \${durationText}\`,\n      \`Ort: \${locationText}\`,\n      \`Session: \${sessionText}\`,\n    ].join("\\n"));\n  }`;
admin = replaceOnce(admin, oldFixedMessage, newFixedMessage, "simplify fixed appointment template");
fs.writeFileSync(adminPath, admin);

// Booking email data: use the exact studio and payment data from Termin & Zahlung.
const bookingPath = "src/lib/booking.functions.ts";
let booking = fs.readFileSync(bookingPath, "utf8");
booking = replaceOnce(
  booking,
  `.select("id, guest_name, guest_email, duration, slot_id, requested_start, anzahlung_paid, availability_slots(starts_at)")`,
  `.select("id, guest_name, guest_email, duration, slot_id, requested_start, anzahlung_paid, studio_override, studio_address_override, availability_slots(starts_at, location, location_address)")`,
  "confirmation booking select",
);
booking = replaceOnce(
  booking,
  `const slot = booking.availability_slots as { starts_at?: string } | null;`,
  `const slot = booking.availability_slots as { starts_at?: string; location?: string | null; location_address?: string | null } | null;`,
  "confirmation slot type",
);
booking = replaceOnce(
  booking,
  `            duration: booking.duration ?? undefined,\n            totalAmount,`,
  `            duration: booking.duration ?? undefined,\n            studio: booking.studio_override?.trim() || slot?.location || undefined,\n            studioAddress: booking.studio_address_override?.trim() || slot?.location_address || undefined,\n            totalAmount,`,
  "confirmation template studio data",
);

booking = replaceOnce(
  booking,
  `.select("id, guest_name, guest_email, duration, duration_minutes, requested_start, anzahlung, bar, confirmation_note, availability_slots(starts_at)")`,
  `.select("id, guest_name, guest_email, duration, duration_minutes, requested_start, anzahlung, bar, confirmation_note, studio_override, studio_address_override, availability_slots(starts_at, location, location_address)")`,
  "deposit-paid booking select",
);
booking = replaceOnce(
  booking,
  `      const slot = booking.availability_slots as { starts_at?: string } | null;`,
  `      const slot = booking.availability_slots as { starts_at?: string; location?: string | null; location_address?: string | null } | null;`,
  "deposit-paid slot type",
);
booking = replaceOnce(
  booking,
  `          duration: booking.duration ?? undefined,\n          totalAmount,`,
  `          duration: booking.duration ?? undefined,\n          studio: booking.studio_override?.trim() || slot?.location || undefined,\n          studioAddress: booking.studio_address_override?.trim() || slot?.location_address || undefined,\n          totalAmount,`,
  "deposit-paid template studio data",
);

booking = replaceOnce(
  booking,
  `.select("id, guest_name, guest_email, duration, duration_minutes, anzahlung, bar")`,
  `.select("id, guest_name, guest_email, duration, duration_minutes, anzahlung, bar, studio_override, studio_address_override, availability_slots(location, location_address)")`,
  "personal message booking select",
);
booking = replaceOnce(
  booking,
  `    if (!booking.guest_email) throw new Error("Keine Email-Adresse hinterlegt.");\n\n    // Persist the note`,
  `    if (!booking.guest_email) throw new Error("Keine Email-Adresse hinterlegt.");\n    const messageSlot = (Array.isArray(booking.availability_slots) ? booking.availability_slots[0] : booking.availability_slots) as { location?: string | null; location_address?: string | null } | null;\n\n    // Persist the note`,
  "personal message slot normalization",
);
booking = replaceOnce(
  booking,
  `        duration: booking.duration ?? undefined,\n        includeDepositInfo: data.includeDepositInfo,`,
  `        duration: booking.duration ?? undefined,\n        studio: booking.studio_override?.trim() || messageSlot?.location || undefined,\n        studioAddress: booking.studio_address_override?.trim() || messageSlot?.location_address || undefined,\n        includeDepositInfo: data.includeDepositInfo,`,
  "personal message studio data",
);

booking = replaceOnce(
  booking,
  `.select("guest_name, duration, duration_minutes, anzahlung, bar")`,
  `.select("guest_name, duration, duration_minutes, anzahlung, bar, studio_override, studio_address_override, availability_slots(location, location_address)")`,
  "personal preview booking select",
);
booking = replaceOnce(
  booking,
  `    if (!booking) throw new Error("Buchung nicht gefunden.");\n\n    const amounts = computePersonalMessageAmounts`,
  `    if (!booking) throw new Error("Buchung nicht gefunden.");\n    const previewSlot = (Array.isArray(booking.availability_slots) ? booking.availability_slots[0] : booking.availability_slots) as { location?: string | null; location_address?: string | null } | null;\n\n    const amounts = computePersonalMessageAmounts`,
  "personal preview slot normalization",
);
booking = replaceOnce(
  booking,
  `        duration: booking.duration ?? undefined,\n        includeDepositInfo: data.includeDepositInfo,`,
  `        duration: booking.duration ?? undefined,\n        studio: booking.studio_override?.trim() || previewSlot?.location || undefined,\n        studioAddress: booking.studio_address_override?.trim() || previewSlot?.location_address || undefined,\n        includeDepositInfo: data.includeDepositInfo,`,
  "personal preview studio data",
);
fs.writeFileSync(bookingPath, booking);

// Personal-message template: show the selected studio alongside amounts when the 50% block is enabled.
const personalPath = "src/lib/email-templates/personal-message.tsx";
let personal = fs.readFileSync(personalPath, "utf8");
personal = replaceOnce(personal, `  duration?: string\n`, `  duration?: string\n  studio?: string\n  studioAddress?: string\n`, "personal props");
personal = replaceOnce(
  personal,
  `const Email = ({ guestName, message, depositAmount, totalAmount, restAmount, duration, depositPartnerName, depositPartnerEmail, depositPartnerAmount, depositPartnerPayment, includeDepositInfo = false }: Props) => (`,
  `const Email = ({ guestName, message, depositAmount, totalAmount, restAmount, duration, studio, studioAddress, depositPartnerName, depositPartnerEmail, depositPartnerAmount, depositPartnerPayment, includeDepositInfo = false }: Props) => (`,
  "personal component props",
);
personal = replaceOnce(
  personal,
  `            {duration ? (\n              <Text style={row}><strong style={label}>Dauer:</strong> {duration}</Text>\n            ) : null}\n            {totalAmount ? (`,
  `            {duration ? (\n              <Text style={row}><strong style={label}>Dauer:</strong> {duration}</Text>\n            ) : null}\n            {studio ? (\n              <Text style={row}><strong style={label}>Studio:</strong> {studio}</Text>\n            ) : null}\n            {studioAddress ? (\n              <Text style={row}><strong style={label}>Adresse:</strong> {studioAddress}</Text>\n            ) : null}\n            {totalAmount ? (`,
  "personal studio rows",
);
fs.writeFileSync(personalPath, personal);

// Booking-confirmed template: show studio/location from the admin's Termin & Zahlung settings.
const confirmedPath = "src/lib/email-templates/booking-confirmed.tsx";
let confirmed = fs.readFileSync(confirmedPath, "utf8");
confirmed = replaceOnce(confirmed, `  duration?: string\n`, `  duration?: string\n  studio?: string\n  studioAddress?: string\n`, "confirmed props");
confirmed = replaceOnce(
  confirmed,
  `const Email = ({ guestName, wishDate, duration, totalAmount, depositAmount, restAmount, confirmationNote, depositPending, depositPaid, depositPartnerName, depositPartnerEmail, depositPartnerAmount, depositPartnerPayment }: Props) => (`,
  `const Email = ({ guestName, wishDate, duration, studio, studioAddress, totalAmount, depositAmount, restAmount, confirmationNote, depositPending, depositPaid, depositPartnerName, depositPartnerEmail, depositPartnerAmount, depositPartnerPayment }: Props) => (`,
  "confirmed component props",
);
confirmed = replaceOnce(
  confirmed,
  `          {duration ? (\n            <Text style={row}><strong style={label}>Dauer:</strong> {duration}</Text>\n          ) : null}\n          {totalAmount ? (`,
  `          {duration ? (\n            <Text style={row}><strong style={label}>Dauer:</strong> {duration}</Text>\n          ) : null}\n          {studio ? (\n            <Text style={row}><strong style={label}>Studio:</strong> {studio}</Text>\n          ) : null}\n          {studioAddress ? (\n            <Text style={row}><strong style={label}>Adresse:</strong> {studioAddress}</Text>\n          ) : null}\n          {totalAmount ? (`,
  "confirmed studio rows",
);
fs.writeFileSync(confirmedPath, confirmed);

// Register automatic templates.
const registryPath = "src/lib/email-templates/registry.ts";
let registry = fs.readFileSync(registryPath, "utf8");
registry = replaceOnce(
  registry,
  `import { template as duoPriceConfirmationTemplate } from './duo-price-confirmation'`,
  `import { template as duoPriceConfirmationTemplate } from './duo-price-confirmation'\nimport { template as bookingReminderTemplate } from './booking-reminder'\nimport { template as bookingFollowupTemplate } from './booking-followup'`,
  "registry imports",
);
registry = replaceOnce(
  registry,
  `  'duo-price-confirmation': duoPriceConfirmationTemplate,\n}`,
  `  'duo-price-confirmation': duoPriceConfirmationTemplate,\n  'booking-reminder': bookingReminderTemplate,\n  'booking-followup': bookingFollowupTemplate,\n}`,
  "registry entries",
);
fs.writeFileSync(registryPath, registry);

console.log("Booking communication templates simplified; reminder/follow-up automation and studio-aware payment emails enabled.");
