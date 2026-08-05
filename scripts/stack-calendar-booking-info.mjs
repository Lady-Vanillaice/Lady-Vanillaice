import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/kalender.tsx";
let text = readFileSync(path, "utf8");

const original = `      <div className="text-xs text-vanilla/60 mb-5 flex flex-wrap items-start gap-3">
        <span className="flex items-start gap-1.5"><Clock size={11} className="text-champagne mt-0.5 shrink-0" />
          <span className="flex flex-col gap-1">
            <span>{tr("Verfügbar", "Available")}</span>
            {windows.map((window) => (
              <span key={window.id}>
                {formatMunichTime(window.starts_at)} – {formatMunichTime(window.ends_at)}
              </span>
            ))}
          </span>
        </span>
        <span className="flex items-center gap-1.5"><MapPin size={11} className="text-champagne" />{slot.location}</span>
      </div>`;

const stacked = `      {/* Booking information stacked vertically */}
      <div className="text-xs text-vanilla/60 mb-5 flex flex-col items-start gap-2">
        <div className="flex items-center gap-1.5">
          <Clock size={11} className="text-champagne shrink-0" />
          <span>{tr("Verfügbar", "Available")}</span>
        </div>
        <div className="flex flex-col gap-1 pl-[17px] text-vanilla/80">
          {windows.map((window) => (
            <span key={window.id}>
              {formatMunichTime(window.starts_at)} – {formatMunichTime(window.ends_at)}{lang === "en" ? "" : " Uhr"}
            </span>
          ))}
        </div>
        <div className="flex items-start gap-1.5">
          <MapPin size={11} className="text-champagne mt-0.5 shrink-0" />
          <span>{slot.location}</span>
        </div>
      </div>`;

if (!text.includes("Booking information stacked vertically")) {
  if (!text.includes(original)) {
    throw new Error("Die Termin-Informationen im Kalender konnten nicht gefunden werden.");
  }
  text = text.replace(original, stacked);
}

if (!text.includes("Booking information stacked vertically")) {
  throw new Error("Die Termin-Informationen konnten nicht untereinander angeordnet werden.");
}

writeFileSync(path, text);
console.log("Stacked calendar booking information vertically.");

await import("./add-duo-booking-modes.mjs");
