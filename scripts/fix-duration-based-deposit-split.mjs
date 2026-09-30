import { readFileSync, writeFileSync } from "node:fs";

const path = "src/lib/booking.functions.ts";
let source = readFileSync(path, "utf8");

const oldBlock = `  const overrideDeposit = typeof override.deposit === "number" && override.deposit > 0 ? override.deposit : null;
  const overrideBar = typeof override.bar === "number" && override.bar >= 0 ? override.bar : null;

  const savedDeposit = Number(booking.anzahlung) > 0 ? Number(booking.anzahlung) : null;
  const savedBar = Number(booking.bar) > 0 ? Number(booking.bar) : null;

  let deposit = overrideDeposit ?? savedDeposit;
  let bar = overrideBar ?? savedBar;

  const minutes = booking.duration_minutes ?? null;
  const durationTotal = minutes ? Math.round((minutes / 60) * 300) : null;

  // Fill missing pieces via fallback logic so we can ALWAYS show a rest amount if possible.
  if (deposit != null && bar == null) {
    // Deposit known, bar unknown → derive bar from duration if we have it, else assume rest = deposit (50/50).
    bar = durationTotal && durationTotal > deposit ? durationTotal - deposit : deposit;
  } else if (bar != null && deposit == null) {
    // Bar known, deposit unknown → derive deposit from duration if we have it, else assume 50/50.
    deposit = durationTotal && durationTotal > bar ? durationTotal - bar : bar;
  } else if (deposit == null && bar == null && durationTotal) {
    // Nothing known but duration → assume 50/50 split.
    deposit = Math.round(durationTotal * 0.5);
    bar = durationTotal - deposit;
  }
`;

const newBlock = `  const overrideDeposit = typeof override.deposit === "number" && override.deposit >= 0 ? override.deposit : null;
  const overrideBar = typeof override.bar === "number" && override.bar >= 0 ? override.bar : null;
  const savedDeposit = booking.anzahlung != null && Number(booking.anzahlung) >= 0 ? Number(booking.anzahlung) : null;
  const savedBar = booking.bar != null && Number(booking.bar) >= 0 ? Number(booking.bar) : null;
  const durationTotal = booking.duration_minutes ? Math.round((booking.duration_minutes / 60) * 300) : null;
  const deposit = overrideDeposit ?? savedDeposit ?? 0;
  // Explicit amounts represent the agreed price and must never revert to 50 percent.
  const bar = overrideBar ?? (overrideDeposit != null && durationTotal != null
    ? Math.round(Math.max(0, durationTotal - deposit) * 100) / 100
    : savedBar != null && savedBar > 0 ? savedBar
    : durationTotal != null ? Math.round(Math.max(0, durationTotal - deposit) * 100) / 100 : null);
`;

if (!source.includes(newBlock)) {
  if (!source.includes(oldBlock)) {
    throw new Error("Duration-based deposit calculation patch target not found");
  }
  source = source.replace(oldBlock, newBlock);
}

writeFileSync(path, source);
console.log("Personal-message deposit preserves agreed amounts and calculates the remainder.");
