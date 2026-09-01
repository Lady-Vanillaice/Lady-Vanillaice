import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/_authenticated/admin.buchung.$id.tsx";
let text = readFileSync(path, "utf8");

const legacyLine = `  const isCustomContentBooking = Boolean(detailQ.data?.booking?.availability_slots?.is_content_shoot) || detailQ.data?.booking?.duration === "Custom Content";`;
const pureCustomLine = `  const isCustomContentBooking = detailQ.data?.booking?.duration === "Custom Content";`;

if (text.includes(legacyLine)) {
  text = text.replace(legacyLine, pureCustomLine);
  writeFileSync(path, text);
}

console.log("Pure Custom Content uses full prepayment; Session + Custom keeps normal session payment logic.");
