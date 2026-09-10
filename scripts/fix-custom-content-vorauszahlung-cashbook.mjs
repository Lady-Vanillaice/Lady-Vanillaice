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

const detail = "src/routes/_authenticated/admin.buchung.$id.tsx";
patch(detail, (source) => {
  let s = source;
  const strict = 'const isCustomContentBooking = detailQ.data?.booking?.duration === "Custom Content";';
  const tolerant = 'const isCustomContentBooking = String(detailQ.data?.booking?.duration ?? "").trim().toLowerCase().includes("custom content");';
  if (s.includes(strict)) s = s.replace(strict, tolerant);
  s = s.replace(
    "Custom Content wird nur nach vollständiger Vorauszahlung durchgeführt. Deshalb gibt es hier keine Anzahlung und keinen Restbetrag oder Barzahlung vor Ort.",
    "Bei Custom Content gibt es genau eine Zahlung: die vollständige Vorauszahlung. Trage nur Betrag, Zahlungsart und Eingangsdatum ein. Es gibt keine Anzahlung und keine Restzahlung vor Ort.",
  );
  s = s.replace("Gesamtbetrag · vorausbezahlt (€)", "Vorauszahlung · Betrag (€)");
  return s;
});

const cashbook = "src/lib/cashbook.functions.ts";
patch(cashbook, (source) => {
  let s = source;
  s = s.replace(
    'const isPureCustomContent = b.duration === "Custom Content" && /Custom-Content-(?:Vorauszahlung|Zahlung)/i.test(b.admin_note ?? "");',
    'const isPureCustomContent = String(b.duration ?? "").trim().toLowerCase().includes("custom content");',
  );
  s = s.replace(
    'const art = isPureCustomContent ? "Custom" : slot?.is_duo ? (hasCustomAddon ? "Duo + Custom" : "Duo") : (hasCustomAddon ? "Single + Custom" : "Single");',
    'const art = isPureCustomContent ? "Custom Content" : slot?.is_duo ? (hasCustomAddon ? "Duo + Custom" : "Duo") : (hasCustomAddon ? "Single + Custom" : "Single");',
  );
  s = s.replace(
    'const art = slot?.is_duo ? (slot?.is_content_shoot ? "Duo + Content" : "Duo") : (slot?.is_content_shoot ? "Single + Content" : "Single");',
    'const isPureCustomContent = String(b.duration ?? "").trim().toLowerCase().includes("custom content");\n      const art = isPureCustomContent ? "Custom Content" : slot?.is_duo ? (slot?.is_content_shoot ? "Duo + Content" : "Duo") : (slot?.is_content_shoot ? "Single + Content" : "Single");',
  );
  return s;
});

console.log("Custom Content: Vorauszahlung und Kassenbuch-Kennzeichnung aktiv.");
