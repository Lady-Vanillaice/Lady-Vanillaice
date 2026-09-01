import { readFileSync, writeFileSync } from "node:fs";

const cashbookPath = "src/lib/cashbook.functions.ts";
let cashbook = readFileSync(cashbookPath, "utf8");

const desiredBlock = `      const isPureCustomContent = b.duration === "Custom Content";\n      const hasCustomAddon = !isPureCustomContent && (Boolean(slot?.is_content_shoot) || /\\[SESSION_CUSTOM\\]/i.test(b.admin_note ?? ""));\n      const art = isPureCustomContent ? "Custom Content" : slot?.is_duo ? (hasCustomAddon ? "Duo + Custom Content" : "Duo") : (hasCustomAddon ? "Single + Custom Content" : "Single");`;
const simpleBlock = `      const art = slot?.is_duo ? (slot?.is_content_shoot ? "Duo + Content" : "Duo") : (slot?.is_content_shoot ? "Single + Content" : "Single");`;
const legacyBlock = `      const isPureCustomContent = b.duration === "Custom Content" && /Custom-Content-(?:Vorauszahlung|Zahlung)/i.test(b.admin_note ?? "");\n      const hasCustomAddon = Boolean(slot?.is_content_shoot) || /\\[SESSION_CUSTOM\\]/i.test(b.admin_note ?? "") || (b.duration === "Custom Content" && !isPureCustomContent);\n      const art = isPureCustomContent ? "Custom" : slot?.is_duo ? (hasCustomAddon ? "Duo + Custom" : "Duo") : (hasCustomAddon ? "Single + Custom" : "Single");`;

if (!cashbook.includes(desiredBlock)) {
  if (cashbook.includes(legacyBlock)) cashbook = cashbook.replace(legacyBlock, desiredBlock);
  else if (cashbook.includes(simpleBlock)) cashbook = cashbook.replace(simpleBlock, desiredBlock);
  else console.warn("Custom Content cashbook classification already has an unknown/newer shape; leaving it untouched.");
}

cashbook = cashbook.replace(
  `        kunde: b.guest_name, art, dauer: durationLabel(b.duration_minutes, b.duration),`,
  `        kunde: b.guest_name, art, dauer: isPureCustomContent ? "Custom Content" : durationLabel(b.duration_minutes, b.duration),`,
);
writeFileSync(cashbookPath, cashbook);

const terminplanPath = "src/routes/_authenticated/admin.terminplan.tsx";
let terminplan = readFileSync(terminplanPath, "utf8");
const currentFlag = `          is_content_shoot: slot?.is_content_shoot ?? false,`;
const desiredFlag = `          is_content_shoot: b.duration === "Custom Content" || /\\[SESSION_CUSTOM\\]/i.test(b.admin_note ?? "") || (slot?.is_content_shoot ?? false),`;
if (!terminplan.includes(desiredFlag) && terminplan.includes(currentFlag)) {
  terminplan = terminplan.replace(currentFlag, desiredFlag);
} else if (!terminplan.includes(desiredFlag)) {
  console.warn("Terminplan Custom flag already has an unknown/newer shape; leaving it untouched.");
}
writeFileSync(terminplanPath, terminplan);

console.log("Custom Content consistency pass completed.");
