import fs from "node:fs";

function apply(path, before, after, label) {
  let source = fs.readFileSync(path, "utf8");
  if (source.includes(after)) {
    console.log(`[reschedule] already applied: ${label}`);
    return true;
  }
  if (!source.includes(before)) {
    console.warn(`[reschedule] skipped ${label}: target not found in ${path}`);
    return false;
  }
  source = source.replace(before, after);
  fs.writeFileSync(path, source);
  console.log(`[reschedule] applied: ${label}`);
  return true;
}

const bookingPath = "src/routes/_authenticated/admin.buchung.$id.tsx";

apply(
  "src/routes/_authenticated/admin.terminplan.tsx",
  `.eq("status", "confirmed");`,
  `.in("status", ["confirmed", "rescheduling"]);`,
  "keep rescheduling bookings visible in Terminplan",
);

apply(
  bookingPath,
  `      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });\n      qc.invalidateQueries({ queryKey: ["admin-bookings"] });\n      router.invalidate();\n    },\n  });\n  const studioMut`,
  `      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });\n      qc.invalidateQueries({ queryKey: ["admin-bookings"] });\n      qc.invalidateQueries({ queryKey: ["admin-terminplan"], refetchType: "all" });\n      router.invalidate();\n    },\n  });\n  const studioMut`,
  "refresh Terminplan after schedule save",
);

apply(
  bookingPath,
  `                  onClick={() => statusMut.mutate({ status: "rescheduling" })}`,
  `                  onClick={() => {\n                    statusMut.mutate({ status: "rescheduling" });\n                    setActiveTab("schedule");\n                    window.setTimeout(() => {\n                      document.getElementById("admin-schedule-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });\n                    }, 80);\n                  }}`,
  "Umplanen opens schedule editor",
);

apply(
  bookingPath,
  `                    {format(new Date(slot.starts_at), "EEEE, dd.MM.yyyy", {`,
  `                    {format(new Date(booking.requested_start ?? slot.starts_at), "EEEE, dd.MM.yyyy", {`,
  "show overridden booking date instead of old slot date",
);

apply(
  bookingPath,
  `{scheduleMut.isPending ? "Speichere…" : "Termin speichern"}`,
  `{scheduleMut.isPending ? "Speichere…" : booking.status === "rescheduling" ? "Neuen Termin speichern" : "Termin speichern"}`,
  "make rescheduling save action explicit",
);

const directButtonMarker = `              <div className="mt-5 border-t border-champagne/15 pt-4 space-y-3">`;
const directButtonReplacement = `              <button\n                type="button"\n                onClick={() => {\n                  setActiveTab("schedule");\n                  window.setTimeout(() => {\n                    document.getElementById("admin-schedule-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });\n                  }, 80);\n                }}\n                className="mt-4 mb-1 text-[0.65rem] uppercase tracking-[0.2em] px-4 py-2 border border-champagne/50 text-champagne hover:bg-champagne/10"\n              >\n                Termin ändern\n              </button>\n              <div className="mt-5 border-t border-champagne/15 pt-4 space-y-3">`;

apply(
  bookingPath,
  directButtonMarker,
  directButtonReplacement,
  "add direct Termin ändern button before studio controls",
);

const scheduleMarker = `          {/* TERMIN-ÜBERSCHREIBUNG */}\n          <div className="bg-card border border-champagne/15 p-6 mb-6">`;
const scheduleReplacement = `          {/* TERMIN-ÜBERSCHREIBUNG */}\n          <div id="admin-schedule-editor" className="bg-card border border-champagne/15 p-6 mb-6 scroll-mt-28">`;

apply(
  bookingPath,
  scheduleMarker,
  scheduleReplacement,
  "add stable anchor to Termin überschreiben",
);

const verified = fs.readFileSync(bookingPath, "utf8");
if (!verified.includes("Termin ändern")) {
  throw new Error("[reschedule] build verification failed: Termin ändern button is missing");
}
if (!verified.includes('id="admin-schedule-editor"')) {
  throw new Error("[reschedule] build verification failed: schedule editor anchor is missing");
}

console.log("[reschedule] verified: Termin ändern button and schedule editor are in the source passed to Vite.");
