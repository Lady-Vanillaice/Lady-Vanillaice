import fs from "node:fs";

function replace(path, before, after, label) {
  let s = fs.readFileSync(path, "utf8");
  if (s.includes(after)) return;
  if (!s.includes(before)) throw new Error(`[admin-simple] target not found: ${label}`);
  s = s.replace(before, after);
  fs.writeFileSync(path, s);
}

function regex(path, pattern, replacement, label, needle) {
  let s = fs.readFileSync(path, "utf8");
  if (needle && s.includes(needle)) return;
  if (!pattern.test(s)) throw new Error(`[admin-simple] pattern not found: ${label}`);
  s = s.replace(pattern, replacement);
  fs.writeFileSync(path, s);
}

// 1) Restzahlungsmethode (z. B. PayPal) auch bei regulären Buchungen dauerhaft speichern.
const rest = "src/lib/rest-payment.functions.ts";
replace(
  rest,
  `function onsiteUpdate(data: { amount: number; paid_at: string | null }) {\n  return {\n    bar: data.amount,\n    cash_received_at: data.paid_at ? \`${'${data.paid_at}'}T12:00:00.000Z\` : null,\n  };\n}`,
  `function onsiteUpdate(data: { amount: number; paid_at: string | null }) {\n  return {\n    bar: data.amount,\n    cash_received_at: data.paid_at ? \`${'${data.paid_at}'}T12:00:00.000Z\` : null,\n  };\n}\n\nconst REST_METHOD_MARKER = "[RESTZAHLUNG:";\nfunction restMethodFromNote(note: string | null | undefined) {\n  const match = note?.match(/\\[RESTZAHLUNG:\\s*([^\\]]+)\\]/i);\n  return match?.[1]?.trim() || null;\n}\nfunction withRestMethodMarker(note: string | null | undefined, method: string | null) {\n  const clean = (note ?? "").replace(/(?:^|\\n)\\[RESTZAHLUNG:\\s*[^\\]]+\\]\\s*/gi, "").trim();\n  const marker = method?.trim() ? \`[RESTZAHLUNG: ${'${method.trim()}'}]\` : "";\n  return [clean, marker].filter(Boolean).join("\\n") || null;\n}`,
  "payment marker helpers",
);
replace(
  rest,
  `.select("id, anzahlung, anzahlung_method, deposit_exemption_reason")`,
  `.select("id, anzahlung, anzahlung_method, deposit_exemption_reason, admin_note")`,
  "load payment meta",
);
replace(
  rest,
  `      isNoDepositBooking(row) ? row.anzahlung_method ?? null : null,`,
  `      restMethodFromNote(row.admin_note) ?? (isNoDepositBooking(row) ? row.anzahlung_method ?? null : null),`,
  "read persisted rest method",
);
replace(
  rest,
  `.select("anzahlung, anzahlung_paid, deposit_exemption_reason")`,
  `.select("anzahlung, anzahlung_paid, deposit_exemption_reason, admin_note")`,
  "load note for onsite payment",
);
replace(
  rest,
  `        ...(isNoDepositBooking(booking) ? { anzahlung_method: data.amount > 0 ? data.method?.trim() || null : null } : {}),`,
  `        admin_note: withRestMethodMarker(booking.admin_note, data.amount > 0 ? data.method?.trim() || null : null),\n        ...(isNoDepositBooking(booking) ? { anzahlung_method: data.amount > 0 ? data.method?.trim() || null : null } : {}),`,
  "persist onsite method",
);

// 2) Kundensuche: alle Buchungen einbeziehen, auch alte, offene, stornierte oder umgeplante.
const customers = "src/lib/customers.functions.ts";
replace(customers, `.eq("status", "confirmed")\n      .order("created_at", { ascending: false });`, `.order("created_at", { ascending: false });`, "load all customer bookings");
replace(
  customers,
  `      // Die Kundenliste enthält ausschließlich tatsächlich abgeschlossene\n      // Sessions – dieselbe Grundlage, auf der das Kassenbuch den Termin als\n      // erledigt behandelt.\n      if (!b.completed_at && !b.fully_paid && !b.cash_received_at) continue;`,
  `      // Für die Suche sollen auch ältere, offene, stornierte und umgeplante\n      // Buchungen auffindbar bleiben. Besuche werden weiter nur für vergangene\n      // tatsächlich bestätigte/abgeschlossene Termine gezählt.`,
  "include historic customers",
);
replace(customers, `      const isPastVisit = !!when && new Date(when).getTime() <= now;`, `      const isPastVisit = b.status === "confirmed" && !!when && new Date(when).getTime() <= now;`, "count real visits only");

// 3) Kundenansicht verständlicher beschriften.
const customerRoute = "src/routes/_authenticated/admin.kunden.tsx";
replace(customerRoute, `intro="Alle Gäste mit erfolgreich abgeschlossenen Sessions aus dem Kassenbuch — mit Pseudonym, Kontakt, Vorlieben und Tabus."`, `intro="Suche alle Kunden und Buchungen — auch ältere, offene, stornierte oder umgeplante Termine."`, "customer intro");
replace(customerRoute, `placeholder="Suchen (Name, E-Mail, Vorlieben…)"`, `placeholder="Kunde suchen: Name, E-Mail, Telefon …"`, "customer search placeholder");
replace(customerRoute, `Noch keine bestätigten Kunden.`, `Keine passenden Kunden oder Buchungen gefunden.`, "customer empty state");

// 4) Admin-Hub vereinfachen: Schnellzugriff bleibt offen, seltene Bereiche einklappen.
const admin = "src/routes/_authenticated/admin.index.tsx";
regex(
  admin,
  /      <div className="space-y-9 mb-12">\{HUB_GROUPS\.map\(group => <div key=\{group\.label\}>[\s\S]*?<\/div>\)\}<\/div>\n      <StudioManagement \/>/,
  `      <details className="mb-10 border border-champagne/15 bg-card/40">\n        <summary className="cursor-pointer p-4 sm:p-5 flex items-center justify-between gap-3 text-champagne uppercase tracking-[0.16em] text-xs">\n          Weitere Admin-Bereiche <ChevronDown size={16} />\n        </summary>\n        <div className="space-y-8 p-4 sm:p-5 pt-0">{HUB_GROUPS.map(group => <div key={group.label}>\n          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4 pb-2 border-b border-champagne/15">\n            <h2 className="font-display text-xl gold-text">{group.label}</h2>\n          </div>\n          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{group.cards.map(({ to, title, description, Icon }) => <Link key={to} to={to} className="group bg-card border border-champagne/15 p-4 hover:border-champagne/50 transition grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1">\n            <Icon size={18} className="text-champagne mt-0.5 row-span-2" /><div className="font-display text-base text-vanilla group-hover:text-champagne transition">{title}</div><p className="text-xs text-vanilla/50 leading-relaxed">{description}</p>\n          </Link>)}</div>\n        </div>)}</div>\n      </details>\n      <StudioManagement />`,
  "collapse advanced admin areas",
  "Weitere Admin-Bereiche",
);

console.log("Payment methods, customer search and simplified admin UI patched.");
await import("./terminart-custom-option.mjs");
