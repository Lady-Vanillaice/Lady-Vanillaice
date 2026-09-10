import fs from "node:fs";

function patch(path, transform) {
  const before = fs.readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) {
    console.log(`[custom-content-payment] no change: ${path}`);
    return;
  }
  fs.writeFileSync(path, after);
  console.log(`[custom-content-payment] patched: ${path}`);
}

// Custom-Content-Auftraege sind keine normalen Session-Zahlungen: es gibt genau
// eine vollstaendige Vorauszahlung (Betrag + Zahlungsweg + Eingangsdatum).
const detail = "src/routes/_authenticated/admin.buchung.$id.tsx";
patch(detail, (source) => {
  let s = source;

  // Die Erkennung absichtlich tolerant halten, damit auch alte Custom-Content-
  // Datensaetze mit leicht abweichender Schreibweise die vereinfachte Maske sehen.
  s = s.replace(
    'const isCustomContentBooking = detailQ.data?.booking?.duration === "Custom Content";',
    'const isCustomContentBooking = String(detailQ.data?.booking?.duration ?? "").trim().toLowerCase().includes("custom content");',
  );

  if (!s.includes("Vorauszahlung · Custom Content")) {
    throw new Error("Custom-Content-Vorauszahlungsmaske fehlt. custom-content-prepaid-only.mjs muss vorher laufen.");
  }

  // In der Custom-Maske eindeutig von Vorauszahlung sprechen.
  s = s.replace(
    "Custom Content wird nur nach vollständiger Vorauszahlung durchgeführt. Deshalb gibt es hier keine Anzahlung und keinen Restbetrag oder Barzahlung vor Ort.",
    "Bei Custom Content gibt es genau eine Zahlung: die vollständige Vorauszahlung. Trage nur Betrag, Zahlungsart und Eingangsdatum ein. Es gibt keine Anzahlung und keine Restzahlung vor Ort.",
  );
  s = s.replace("Gesamtbetrag · vorausbezahlt (€)", "Vorauszahlung · Betrag (€)");
  return s;
});

// Im Kassenbuch Custom Content als eigene Art ausweisen und die komplette
// Vorauszahlung als erhaltene Zahlung verwenden.
const cashbook = "src/lib/cashbook.functions.ts";
patch(cashbook, (source) => {
  let s = source;
  s = s.replace(
    'admin_note, created_at, requested_start, studio_override, studio_address_override, availability_slots(starts_at, ends_at, location, location_address, is_duo, is_content_shoot)',
    'admin_note, created_at, requested_start, studio_override, studio_address_override, duration, availability_slots(starts_at, ends_at, location, location_address, is_duo, is_content_shoot)',
  );
  s = s.replace(
    'const art = slot?.is_duo ? (slot?.is_content_shoot ? "Duo + Content" : "Duo") : (slot?.is_content_shoot ? "Single + Content" : "Single");',
    'const isCustomContent = String(b.duration ?? "").trim().toLowerCase().includes("custom content");\n      const art = isCustomContent ? "Custom Content" : slot?.is_duo ? (slot?.is_content_shoot ? "Duo + Content" : "Duo") : (slot?.is_content_shoot ? "Single + Content" : "Single");',
  );
  if (!s.includes('isCustomContent ? "Custom Content"')) {
    throw new Error("Kassenbuch-Custom-Content-Kennzeichnung konnte nicht gesetzt werden.");
  }
  return s;
});

console.log("Custom Content: Vorauszahlung und Kassenbuch-Kennzeichnung aktiv.");
