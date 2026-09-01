import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/_authenticated/admin.buchung.$id.tsx";
let text = readFileSync(path, "utf8");

const oldLine = `  const isCustomContentBooking = detailQ.data?.booking?.duration === "Custom Content";`;
const newLine = `  const isCustomContentBooking = Boolean(detailQ.data?.booking?.availability_slots?.is_content_shoot) || detailQ.data?.booking?.duration === "Custom Content";`;

if (!text.includes(newLine)) {
  if (!text.includes(oldLine)) {
    throw new Error("[custom-payment-detection] target not found");
  }
  text = text.replace(oldLine, newLine);
  writeFileSync(path, text);
}

console.log("Custom payment detection now follows the Custom checkbox / is_content_shoot flag.");
