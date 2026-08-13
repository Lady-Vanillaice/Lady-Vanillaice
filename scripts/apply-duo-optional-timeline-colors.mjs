import fs from "node:fs";

const path = "src/routes/kalender.tsx";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(before, after, label) {
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`Patch target missing: ${label}`);
  source = source.replace(before, after);
}

replaceOnce(
  `<AvailabilityTimeline slotId={slot.id} />`,
  `<AvailabilityTimeline slotId={slot.id} duoOptional={duoIsOptional} />`,
  "timeline props",
);

replaceOnce(
  `function AvailabilityTimeline({ slotId }: { slotId: string }) {`,
  `function AvailabilityTimeline({ slotId, duoOptional }: { slotId: string; duoOptional: boolean }) {`,
  "timeline signature",
);

replaceOnce(
  `              title={\`${'${'}isUnavailable ? tr("Nicht freigegeben","Unavailable") : isReserved ? tr("Reserviert","Reserved") : isSingleOnly ? tr("Nur Einzel","Single only") : tr("Belegt","Booked")${'}'} ${'${'}fmtHm(seg.s)${'}'} – ${'${'}fmtHm(seg.e)${'}'}\`}\n              className={\`absolute top-0 bottom-0 pointer-events-none ${'${'}\n                isUnavailable\n                  ? "bg-anthracite/80 border-x border-vanilla/15"\n                  : isReserved\n                  ? "bg-vanilla/35 border-x border-vanilla/45"\n                  : isSingleOnly\n                  ? "bg-orange-500/60 border-x border-orange-700/70"\n                  : "bg-bordeaux/60 border-x border-bordeaux/70"\n              ${'}'}\`}`,
  `              title={\`${'${'}isUnavailable ? tr("Nicht freigegeben","Unavailable") : isReserved ? tr("Reserviert","Reserved") : duoOptional ? tr("Nur Einzel belegt","Single only booked") : isSingleOnly ? tr("Nur Einzel","Single only") : tr("Belegt","Booked")${'}'} ${'${'}fmtHm(seg.s)${'}'} – ${'${'}fmtHm(seg.e)${'}'}\`}\n              className={\`absolute top-0 bottom-0 pointer-events-none ${'${'}\n                isUnavailable\n                  ? "bg-anthracite/80 border-x border-vanilla/15"\n                  : isReserved\n                  ? "bg-vanilla/35 border-x border-vanilla/45"\n                  : duoOptional\n                  ? "bg-orange-800/80 border-x border-orange-950/80"\n                  : isSingleOnly\n                  ? "bg-orange-500/60 border-x border-orange-700/70"\n                  : "bg-bordeaux/60 border-x border-bordeaux/70"\n              ${'}'}\`}`,
  "blocked duo colors",
);

replaceOnce(
  `              title={\`${'${'}tr("Frei","Free")${'}'} ${'${'}fmtHm(seg.s)${'}'} – ${'${'}fmtHm(seg.e)${'}'}\`}\n              className="absolute top-0 bottom-0 z-10 bg-champagne/50"`,
  `              title={\`${'${'}duoOptional ? tr("Nur Einzel verfügbar","Single only available") : tr("Frei","Free")${'}'} ${'${'}fmtHm(seg.s)${'}'} – ${'${'}fmtHm(seg.e)${'}'}\`}\n              className={\`absolute top-0 bottom-0 z-10 ${'${'}duoOptional ? "bg-orange-300/75" : "bg-champagne/50"${'}'}\`}`,
  "free duo colors",
);

replaceOnce(
  `      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-vanilla/60">\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-champagne" /> {tr("verfügbar", "available")}</span>\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-bordeaux" /> {tr("belegt", "booked")}</span>\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-400" /> {tr("nur Einzel", "single only")}</span>\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-vanilla/40" /> {tr("reserviert", "reserved")}</span>\n      </div>`,
  `      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-vanilla/60">\n        {duoOptional ? (\n          <>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-300" /> {tr("nur Einzel verfügbar", "single only available")}</span>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-800" /> {tr("nur Einzel belegt", "single only booked")}</span>\n          </>\n        ) : (\n          <>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-champagne" /> {tr("verfügbar", "available")}</span>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-bordeaux" /> {tr("belegt", "booked")}</span>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-400" /> {tr("nur Einzel", "single only")}</span>\n          </>\n        )}\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-vanilla/40" /> {tr("reserviert", "reserved")}</span>\n      </div>`,
  "duo legend",
);

fs.writeFileSync(path, source);
console.log("Duo optional timeline colours applied.");
