import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/_authenticated/admin.kassenbuch.tsx";
let text = readFileSync(path, "utf8");

if (text.includes("keepOpenCashbookAcrossMonths")) {
  console.log("Open cashbook entries already ignore the month boundary.");
  process.exit(0);
}

const before = `  const filtered = useMemo(() => data.filter((e) => {\n    if (e.source === "booking" && e.booking_id && hiddenBookingSet.has(e.booking_id)) return false;\n    const matchesMonth = !month || e.termin_datum.startsWith(month) || Boolean(e.anzahlung_datum?.startsWith(month)) || Boolean(e.bar_datum?.startsWith(month));\n    const restMethod = e.source === "booking" && e.booking_id ? restPaymentMethods[e.booking_id] ?? (e.restbetrag_vorgemerkt > 0 ? "Bar" : null) : null;\n    const haystack = \`${'${e.kunde} ${e.studio} ${e.studio_address ?? ""} ${e.art} ${e.dauer ?? ""} ${e.expense_category ?? ""} ${e.payment_method ?? ""} ${e.anzahlung_method ?? ""} ${restMethod ?? ""}'}\`.toLowerCase();\n    const methodsForEntry = e.entry_type === "expense" ? [e.payment_method] : e.source === "booking" ? [e.anzahlung_method, restMethod] : [e.anzahlung_method];\n    return matchesMonth && (!studioFilter || e.studio === studioFilter) && (!methodFilter || methodsForEntry.includes(methodFilter)) && (!statusFilter || e.status === statusFilter) && (!search || haystack.includes(search.toLowerCase()));\n  }).sort((a, b) => {`;

const after = `  const keepOpenCashbookAcrossMonths = true;\n  const filtered = useMemo(() => data.filter((e) => {\n    if (e.source === "booking" && e.booking_id && hiddenBookingSet.has(e.booking_id)) return false;\n    const matchesMonth = !month || e.termin_datum.startsWith(month) || Boolean(e.anzahlung_datum?.startsWith(month)) || Boolean(e.bar_datum?.startsWith(month));\n    const isUnfinishedBooking = e.source === "booking" && e.entry_type === "income" && e.status !== "completed";\n    const restMethod = e.source === "booking" && e.booking_id ? restPaymentMethods[e.booking_id] ?? (e.restbetrag_vorgemerkt > 0 ? "Bar" : null) : null;\n    const haystack = \`${'${e.kunde} ${e.studio} ${e.studio_address ?? ""} ${e.art} ${e.dauer ?? ""} ${e.expense_category ?? ""} ${e.payment_method ?? ""} ${e.anzahlung_method ?? ""} ${restMethod ?? ""}'}\`.toLowerCase();\n    const methodsForEntry = e.entry_type === "expense" ? [e.payment_method] : e.source === "booking" ? [e.anzahlung_method, restMethod] : [e.anzahlung_method];\n    return (matchesMonth || isUnfinishedBooking) && (!studioFilter || e.studio === studioFilter) && (!methodFilter || methodsForEntry.includes(methodFilter)) && (!statusFilter || e.status === statusFilter) && (!search || haystack.includes(search.toLowerCase()));\n  }).sort((a, b) => {`;

if (!text.includes(before)) {
  throw new Error("Could not find the cashbook month-filter block.");
}

text = text.replace(before, after);
writeFileSync(path, text);
console.log("Unfinished booking entries now stay visible in the cashbook across month boundaries.");
