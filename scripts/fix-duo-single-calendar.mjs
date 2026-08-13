import fs from "node:fs";

const path = "src/routes/kalender.tsx";
let s = fs.readFileSync(path, "utf8");

s = s.replace(
  '<AvailabilityTimeline slotId={slot.id} />',
  '<AvailabilityTimeline slotId={slot.id} duoDay={slot.is_duo} />',
);

s = s.replace(
  'function AvailabilityTimeline({ slotId }: { slotId: string }) {',
  'function AvailabilityTimeline({ slotId, duoDay }: { slotId: string; duoDay: boolean }) {',
);

s = s.replace(
  'isSingleOnly ? tr("Nur Einzel","Single only") : tr("Belegt","Booked")',
  'isSingleOnly ? tr("Nur Einzel belegt","Single only booked") : tr("Belegt","Booked")',
);

s = s.replace(
  '? "bg-orange-500/60 border-x border-orange-700/70"',
  '? "bg-orange-800/80 border-x border-orange-950/80"',
);

s = s.replace(
  'title={`${tr("Frei","Free")} ${fmtHm(seg.s)} – ${fmtHm(seg.e)}`}',
  'title={`${duoDay ? tr("Nur Einzel verfügbar","Single only available") : tr("Frei","Free")} ${fmtHm(seg.s)} – ${fmtHm(seg.e)}`}',
);

s = s.replace(
  'className="absolute top-0 bottom-0 z-10 bg-champagne/50"',
  'className={`absolute top-0 bottom-0 z-10 ${duoDay ? "bg-orange-300/75" : "bg-champagne/50"}`}',
);

const oldLegend = `        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-champagne" /> {tr("verfügbar", "available")}</span>\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-bordeaux" /> {tr("belegt", "booked")}</span>\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-400" /> {tr("nur Einzel", "single only")}</span>`;
const newLegend = `        {duoDay ? (\n          <>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-300" /> {tr("nur Einzel verfügbar", "single only available")}</span>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-bordeaux" /> {tr("Duo belegt", "duo booked")}</span>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-800" /> {tr("nur Einzel belegt", "single only booked")}</span>\n          </>\n        ) : (\n          <>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-champagne" /> {tr("verfügbar", "available")}</span>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-bordeaux" /> {tr("belegt", "booked")}</span>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-800" /> {tr("nur Einzel belegt", "single only booked")}</span>\n          </>\n        )}`;

s = s.replace(oldLegend, newLegend);
fs.writeFileSync(path, s);
