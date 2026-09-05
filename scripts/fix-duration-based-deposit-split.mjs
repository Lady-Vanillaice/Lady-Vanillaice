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

const newBlock = `  const overrideDeposit = typeof override.deposit === "number" && override.deposit > 0 ? override.deposit : null;
  const overrideBar = typeof override.bar === "number" && override.bar >= 0 ? override.bar : null;

  const savedDeposit = Number(booking.anzahlung) > 0 ? Number(booking.anzahlung) : null;
  const savedBar = Number(booking.bar) >= 0 ? Number(booking.bar) : null;

  const minutes = booking.duration_minutes ?? null;
  const durationTotal = minutes ? Math.round((minutes / 60) * 300) : null;

  let deposit: number | null = null;
  let bar: number | null = null;

  if (durationTotal) {
    // The 50%-Anzahlung is based on the requested session duration.
    // Keep manually entered values only when they already add up to the correct
    // duration-based total. This prevents stale values such as 300 + 300 from
    // turning a 60-minute / 300-Euro session into a 600-Euro session.
    if (overrideDeposit != null && overrideBar != null && overrideDeposit + overrideBar === durationTotal) {
      deposit = overrideDeposit;
      bar = overrideBar;
    } else if (savedDeposit != null && savedBar != null && savedDeposit + savedBar === durationTotal) {
      deposit = savedDeposit;
      bar = savedBar;
    } else {
      deposit = Math.round(durationTotal * 0.5);
      bar = durationTotal - deposit;
    }
  } else {
    // If no duration is available, retain the previous fallback behaviour.
    deposit = overrideDeposit ?? savedDeposit;
    bar = overrideBar ?? savedBar;
    if (deposit != null && bar == null) bar = deposit;
    else if (bar != null && deposit == null) deposit = bar;
  }
`;

if (!source.includes(newBlock)) {
  if (!source.includes(oldBlock)) {
    throw new Error("Duration-based deposit calculation patch target not found");
  }
  source = source.replace(oldBlock, newBlock);
}

writeFileSync(path, source);
console.log("50% deposit now follows the requested booking duration.");
