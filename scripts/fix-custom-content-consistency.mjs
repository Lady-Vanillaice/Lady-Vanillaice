import { readFileSync, writeFileSync } from "node:fs";

function replaceOrFail(path, before, after, label) {
  let text = readFileSync(path, "utf8");
  if (text.includes(after)) return;
  if (!text.includes(before)) throw new Error(`Could not patch ${label} in ${path}`);
  text = text.replace(before, after);
  writeFileSync(path, text);
}

const cashbook = "src/lib/cashbook.functions.ts";
replaceOrFail(
  cashbook,
  `      const art = slot?.is_duo ? (slot?.is_content_shoot ? "Duo + Content" : "Duo") : (slot?.is_content_shoot ? "Single + Content" : "Single");`,
  `      const isPureCustomContent = b.duration === "Custom Content";\n      const hasCustomAddon = !isPureCustomContent && (Boolean(slot?.is_content_shoot) || /\\[SESSION_CUSTOM\\]/i.test(b.admin_note ?? ""));\n      const art = isPureCustomContent ? "Custom Content" : slot?.is_duo ? (hasCustomAddon ? "Duo + Custom Content" : "Duo") : (hasCustomAddon ? "Single + Custom Content" : "Single");`,
  "cashbook booking type",
);
replaceOrFail(
  cashbook,
  `        kunde: b.guest_name, art, dauer: durationLabel(b.duration_minutes, b.duration),`,
  `        kunde: b.guest_name, art, dauer: isPureCustomContent ? "Custom Content" : durationLabel(b.duration_minutes, b.duration),`,
  "cashbook custom label",
);

const terminplan = "src/routes/_authenticated/admin.terminplan.tsx";
replaceOrFail(
  terminplan,
  `          is_content_shoot: slot?.is_content_shoot ?? false,`,
  `          is_content_shoot: b.duration === "Custom Content" || /\\[SESSION_CUSTOM\\]/i.test(b.admin_note ?? "") || (slot?.is_content_shoot ?? false),`,
  "terminplan custom flag",
);

console.log("Custom Content is now classified from the booking itself across Kassenbuch and Terminplan.");
