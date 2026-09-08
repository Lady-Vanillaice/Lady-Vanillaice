import fs from "node:fs";

function patchSource(path, patches) {
  let source = fs.readFileSync(path, "utf8");

  for (const { before, after, label } of patches) {
    if (source.includes(after)) continue;
    if (!source.includes(before)) throw new Error(`Patch target missing: ${label}`);
    source = source.replace(before, after);
  }

  fs.writeFileSync(path, source);
}

patchSource("src/routes/kalender.tsx", [
  {
    before: `<AvailabilityTimeline slotId={slot.id} />`,
    after: `<AvailabilityTimeline slotId={slot.id} duoOptional={duoIsOptional} />`,
    label: "timeline props",
  },
  {
    before: `function AvailabilityTimeline({ slotId }: { slotId: string }) {`,
    after: `function AvailabilityTimeline({ slotId, duoOptional }: { slotId: string; duoOptional: boolean }) {`,
    label: "timeline signature",
  },
  {
    before: `              title={\`${'${'}isUnavailable ? tr("Nicht freigegeben","Unavailable") : isReserved ? tr("Reserviert","Reserved") : isSingleOnly ? tr("Nur Einzel","Single only") : tr("Belegt","Booked")${'}'} ${'${'}fmtHm(seg.s)${'}'} – ${'${'}fmtHm(seg.e)${'}'}\`}\n              className={\`absolute top-0 bottom-0 pointer-events-none ${'${'}\n                isUnavailable\n                  ? "bg-anthracite/80 border-x border-vanilla/15"\n                  : isReserved\n                  ? "bg-vanilla/35 border-x border-vanilla/45"\n                  : isSingleOnly\n                  ? "bg-orange-500/60 border-x border-orange-700/70"\n                  : "bg-bordeaux/60 border-x border-bordeaux/70"\n              ${'}'}\`}`,
    after: `              title={\`${'${'}isUnavailable ? tr("Nicht freigegeben","Unavailable") : isReserved ? tr("Reserviert","Reserved") : duoOptional ? tr("Nur Einzel belegt","Single only booked") : isSingleOnly ? tr("Nur Einzel","Single only") : tr("Belegt","Booked")${'}'} ${'${'}fmtHm(seg.s)${'}'} – ${'${'}fmtHm(seg.e)${'}'}\`}\n              className={\`absolute top-0 bottom-0 pointer-events-none ${'${'}\n                isUnavailable\n                  ? "bg-anthracite/80 border-x border-vanilla/15"\n                  : isReserved\n                  ? "bg-vanilla/35 border-x border-vanilla/45"\n                  : duoOptional\n                  ? "bg-orange-800/80 border-x border-orange-950/80"\n                  : isSingleOnly\n                  ? "bg-orange-500/60 border-x border-orange-700/70"\n                  : "bg-bordeaux/60 border-x border-bordeaux/70"\n              ${'}'}\`}`,
    label: "blocked duo colors",
  },
  {
    before: `              title={\`${'${'}tr("Frei","Free")${'}'} ${'${'}fmtHm(seg.s)${'}'} – ${'${'}fmtHm(seg.e)${'}'}\`}\n              className="absolute top-0 bottom-0 z-10 bg-champagne/50"`,
    after: `              title={\`${'${'}duoOptional ? tr("Nur Einzel verfügbar","Single only available") : tr("Frei","Free")${'}'} ${'${'}fmtHm(seg.s)${'}'} – ${'${'}fmtHm(seg.e)${'}'}\`}\n              className={\`absolute top-0 bottom-0 z-10 ${'${'}duoOptional ? "bg-orange-300/75" : "bg-champagne/50"${'}'}\`}`,
    label: "free duo colors",
  },
  {
    before: `      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-vanilla/60">\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-champagne" /> {tr("verfügbar", "available")}</span>\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-bordeaux" /> {tr("belegt", "booked")}</span>\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-400" /> {tr("nur Einzel", "single only")}</span>\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-vanilla/40" /> {tr("reserviert", "reserved")}</span>\n      </div>`,
    after: `      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-vanilla/60">\n        {duoOptional ? (\n          <>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-300" /> {tr("nur Einzel verfügbar", "single only available")}</span>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-800" /> {tr("nur Einzel belegt", "single only booked")}</span>\n          </>\n        ) : (\n          <>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-champagne" /> {tr("verfügbar", "available")}</span>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-bordeaux" /> {tr("belegt", "booked")}</span>\n            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-400" /> {tr("nur Einzel", "single only")}</span>\n          </>\n        )}\n        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-vanilla/40" /> {tr("reserviert", "reserved")}</span>\n      </div>`,
    label: "duo legend",
  },
  {
    before: `  // Thin out visible labels so they don't overlap; more zoom → mehr Labels.\n  const effHours = (totalMs / 3_600_000) / zoom;\n  const labelStep = effHours > 12 ? 3 : effHours > 6 ? 2 : 1;\n  const labelTicks = ticks.filter((t) => new Date(t).getHours() % labelStep === 0);`,
    after: `  // Keep time labels readable on narrow screens. A long day used to render\n  // too many labels on mobile, causing them to overlap into one unreadable line.\n  const effHours = (totalMs / 3_600_000) / zoom;\n  const maxVisibleLabels = zoom <= 1 ? 5 : zoom <= 2 ? 7 : 10;\n  const requiredStep = Math.max(1, Math.ceil(effHours / maxVisibleLabels));\n  const niceSteps = [1, 2, 3, 4, 6, 8, 12, 24];\n  const labelStep = niceSteps.find((step) => step >= requiredStep) ?? 24;\n  const labelTicks = ticks.filter((_, index) =>\n    index % labelStep === 0 || index === ticks.length - 1,\n  );`,
    label: "mobile timeline label density",
  },
  {
    before: `<div className="relative h-5 mt-1.5 text-[0.7rem] font-medium text-vanilla/75">`,
    after: `<div className="relative h-5 mt-1.5 text-[0.62rem] sm:text-[0.7rem] font-medium text-vanilla/75">`,
    label: "mobile timeline label font",
  },
]);

patchSource("src/lib/public-booking.functions.ts", [
  {
    before: `    const timelineStart = Math.min(...starts);\n    const timelineEnd = Math.max(...ends);`,
    after: `    // Keep the public occupancy bar inside the selected Berlin calendar day.\n    // A long booking that starts the previous day or ends the next day must not\n    // stretch the bar beyond 24 h and make all hour labels overlap on mobile.\n    const timelineStart = Math.max(dayStart.getTime(), Math.min(...starts));\n    const timelineEnd = Math.min(dayEnd.getTime(), Math.max(...ends));`,
    label: "timeline day bounds",
  },
]);

console.log("Calendar timeline patches applied.");
