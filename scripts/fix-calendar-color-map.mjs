import fs from "node:fs";

// Keep the public booking timeline and the downloadable calendar image on the
// same semantic color map:
// gold   = single available
// orange = duo available
// violet = duo booked
// wine   = single booked
// grey   = reserved

const calendarPath = "src/routes/kalender.tsx";
let calendar = fs.readFileSync(calendarPath, "utf8");

calendar = calendar.replace(
  'title={`${duoDay ? tr("Nur Einzel verfügbar","Single only available") : tr("Frei","Free")} ${fmtHm(seg.s)} – ${fmtHm(seg.e)}`}',
  'title={`${duoDay ? tr("Duo verfügbar","Duo available") : tr("Nur Einzel verfügbar","Single only available")} ${fmtHm(seg.s)} – ${fmtHm(seg.e)}`}',
);

calendar = calendar.replace(
  '? "bg-orange-800/80 border-x border-orange-950/80"',
  '? "bg-bordeaux/75 border-x border-bordeaux/90"',
);

calendar = calendar.replace(
  ': "bg-bordeaux/60 border-x border-bordeaux/70"',
  ': duoDay\n                  ? "bg-violet-700/70 border-x border-violet-900/80"\n                  : "bg-bordeaux/75 border-x border-bordeaux/90"',
);

calendar = calendar.replace(
  'isSingleOnly ? tr("Nur Einzel belegt","Single only booked") : tr("Belegt","Booked")',
  'isSingleOnly ? tr("Nur Einzel belegt","Single only booked") : duoDay ? tr("Duo belegt","Duo booked") : tr("Nur Einzel belegt","Single only booked")',
);

const legendStart = '      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-vanilla/60">';
const legendEnd = '      </div>\n    </div>\n  );\n}';
const legendIndex = calendar.indexOf(legendStart);
if (legendIndex >= 0) {
  const legendClose = calendar.indexOf(legendEnd, legendIndex);
  if (legendClose >= 0) {
    const replacement = `      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-vanilla/60">\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-champagne" /> {tr("nur Einzel verfügbar", "single only available")}</span>\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-400" /> {tr("Duo verfügbar", "duo available")}</span>\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-violet-700" /> {tr("Duo belegt", "duo booked")}</span>\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-bordeaux" /> {tr("nur Einzel belegt", "single only booked")}</span>\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-vanilla/40" /> {tr("reserviert", "reserved")}</span>\n`;
    calendar = calendar.slice(0, legendIndex) + replacement + calendar.slice(legendClose);
  }
}

fs.writeFileSync(calendarPath, calendar);

const exportPath = "src/lib/download-image.client/calendar-image-export.ts";
let image = fs.readFileSync(exportPath, "utf8");

image = image.replace(
  'kind?: "booked" | "reserved" | "unavailable";',
  'kind?: "booked" | "reserved" | "unavailable" | "single_only";',
);
image = image.replace(
  'kind: "booked" | "reserved" | "unavailable";',
  'kind: "booked" | "reserved" | "unavailable" | "single_only";',
);

image = image.replace(
  '  available: "rgba(216,182,118,0.50)",\n  booked: "rgba(127,36,56,0.60)",\n  reserved: "rgba(244,234,216,0.35)",',
  '  singleAvailable: "rgba(216,182,118,0.58)",\n  duoAvailable: "rgba(205,123,45,0.72)",\n  duoBooked: "rgba(103,58,142,0.72)",\n  singleBooked: "rgba(127,36,56,0.72)",\n  reserved: "rgba(244,234,216,0.35)",',
);

image = image.replace(
  '  width: number,\n) {',
  '  width: number,\n  duoDay: boolean,\n) {',
);
image = image.replace(
  '  ctx.fillStyle = COLORS.available;',
  '  ctx.fillStyle = duoDay ? COLORS.duoAvailable : COLORS.singleAvailable;',
);
image = image.replace(
  '    ctx.fillStyle = range.kind === "booked"\n      ? COLORS.booked\n      : range.kind === "reserved"\n      ? COLORS.reserved\n      : COLORS.unavailable;',
  '    ctx.fillStyle = range.kind === "reserved"\n      ? COLORS.reserved\n      : range.kind === "single_only"\n      ? COLORS.singleBooked\n      : range.kind === "booked"\n      ? (duoDay ? COLORS.duoBooked : COLORS.singleBooked)\n      : COLORS.unavailable;',
);

image = image.replace('  const legendHeight = 78;', '  const legendHeight = 112;');

const oldExportLegend = `  drawLegendItem(ctx, 90, y + 58, COLORS.available, "verfügbar");\n  drawLegendItem(ctx, 226, y + 58, COLORS.booked, "belegt");\n  drawLegendItem(ctx, 330, y + 58, COLORS.reserved, "reserviert");`;
const newExportLegend = `  drawLegendItem(ctx, 90, y + 58, COLORS.singleAvailable, "nur Einzel verfügbar");\n  drawLegendItem(ctx, 325, y + 58, COLORS.duoAvailable, "Duo verfügbar");\n  drawLegendItem(ctx, 500, y + 58, COLORS.duoBooked, "Duo belegt");\n  drawLegendItem(ctx, 90, y + 92, COLORS.singleBooked, "nur Einzel belegt");\n  drawLegendItem(ctx, 325, y + 92, COLORS.reserved, "reserviert");`;
image = image.replace(oldExportLegend, newExportLegend);

image = image.replace(
  '    drawTimeline(ctx, availability, y + 12, width);',
  '    const duoDay = slots.some((slot) => dateParts(slot.starts_at).dayKey === dayKey && slot.is_duo);\n    drawTimeline(ctx, availability, y + 12, width, duoDay);',
);

fs.writeFileSync(exportPath, image);
