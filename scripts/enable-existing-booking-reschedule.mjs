import fs from "node:fs";

function apply(path, before, after, label) {
  let source = fs.readFileSync(path, "utf8");
  if (source.includes(after)) {
    console.log(`[reschedule] already applied: ${label}`);
    return;
  }
  if (!source.includes(before)) {
    console.warn(`[reschedule] skipped ${label}: target not found in ${path}`);
    return;
  }
  source = source.replace(before, after);
  fs.writeFileSync(path, source);
  console.log(`[reschedule] applied: ${label}`);
}

function ensureBookingUi() {
  const path = "src/routes/_authenticated/admin.buchung.$id.tsx";
  let source = fs.readFileSync(path, "utf8");

  if (!source.includes("Termin ändern")) {
    const marker = /([ \t]*)\{booking\.duration\s*&&\s*\(\s*\n\s*<div className="text-vanilla\/55 text-xs mt-2">\s*\n\s*Dauer-Wunsch:\s*\{booking\.duration\}\s*\n\s*<\/div>\s*\n\s*\)\}/m;
    const match = source.match(marker);
    if (!match) {
      throw new Error("[reschedule] UI patch failed: Dauer-Wunsch block not found in booking details");
    }
    const indent = match[1] ?? "                  ";
    const button = `${match[0]}\n${indent}<button\n${indent}  type="button"\n${indent}  onClick={() => {\n${indent}    setActiveTab("schedule");\n${indent}    window.setTimeout(() => {\n${indent}      document.getElementById("admin-schedule-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });\n${indent}    }, 80);\n${indent}  }}\n${indent}  className="mt-4 text-[0.65rem] uppercase tracking-[0.2em] px-4 py-2 border border-champagne/50 text-champagne hover:bg-champagne/10"\n${indent}>\n${indent}  Termin ändern\n${indent}</button>`;
    source = source.replace(marker, button);
    console.log("[reschedule] applied: direct Termin ändern button");
  } else {
    console.log("[reschedule] already applied: direct Termin ändern button");
  }

  if (!source.includes('id="admin-schedule-editor"')) {
    const scheduleCard = `          {/* TERMIN-ÜBERSCHREIBUNG */}\n          <div className="bg-card border border-champagne/15 p-6 mb-6">`;
    if (!source.includes(scheduleCard)) {
      throw new Error("[reschedule] UI patch failed: Termin überschreiben card not found");
    }
    source = source.replace(
      scheduleCard,
      `          {/* TERMIN-ÜBERSCHREIBUNG */}\n          <div id="admin-schedule-editor" className="bg-card border border-champagne/15 p-6 mb-6 scroll-mt-28">`,
    );
    console.log("[reschedule] applied: schedule editor anchor");
  } else {
    console.log("[reschedule] already applied: schedule editor anchor");
  }

  fs.writeFileSync(path, source);

  const verified = fs.readFileSync(path, "utf8");
  if (!verified.includes("Termin ändern") || !verified.includes('id="admin-schedule-editor"')) {
    throw new Error("[reschedule] UI verification failed after patching");
  }
}

apply(
  "src/routes/_authenticated/admin.terminplan.tsx",
  `.eq("status", "confirmed");`,
  `.in("status", ["confirmed", "rescheduling"]);`,
  "keep rescheduling bookings visible in Terminplan",
);

apply(
  "src/routes/_authenticated/admin.buchung.$id.tsx",
  `      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });\n      qc.invalidateQueries({ queryKey: ["admin-bookings"] });\n      router.invalidate();\n    },\n  });\n  const studioMut`,
  `      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });\n      qc.invalidateQueries({ queryKey: ["admin-bookings"] });\n      qc.invalidateQueries({ queryKey: ["admin-terminplan"], refetchType: "all" });\n      router.invalidate();\n    },\n  });\n  const studioMut`,
  "refresh Terminplan after schedule save",
);

apply(
  "src/routes/_authenticated/admin.buchung.$id.tsx",
  `                  onClick={() => statusMut.mutate({ status: "rescheduling" })}`,
  `                  onClick={() => {\n                    statusMut.mutate({ status: "rescheduling" });\n                    setActiveTab("schedule");\n                  }}`,
  "open Termin & Zahlung immediately when Umplanen is clicked",
);

apply(
  "src/routes/_authenticated/admin.buchung.$id.tsx",
  `                    {format(new Date(slot.starts_at), "EEEE, dd.MM.yyyy", {`,
  `                    {format(new Date(booking.requested_start ?? slot.starts_at), "EEEE, dd.MM.yyyy", {`,
  "show overridden booking date instead of old slot date",
);

apply(
  "src/routes/_authenticated/admin.buchung.$id.tsx",
  `{scheduleMut.isPending ? "Speichere…" : "Termin speichern"}`,
  `{scheduleMut.isPending ? "Speichere…" : booking.status === "rescheduling" ? "Neuen Termin speichern" : "Termin speichern"}`,
  "make rescheduling save action explicit",
);

ensureBookingUi();

console.log("[reschedule] verified: booking reschedule UI is present in the source that Vite will build.");
