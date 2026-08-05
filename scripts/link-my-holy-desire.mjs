import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/faq.tsx";
let text = readFileSync(path, "utf8");

const current = '<strong className="text-vanilla/90">My Holy Desire</strong>';
const linked = '<a href="https://myholydesire.com" target="_blank" rel="noopener noreferrer" className="text-champagne hover:underline">My Holy Desire</a>';

if (text.includes(current)) {
  text = text.replaceAll(current, linked);
}

const linkCount = (text.match(/href="https:\/\/myholydesire\.com"/g) ?? []).length;
if (linkCount < 2) {
  throw new Error("My Holy Desire could not be linked in both FAQ languages.");
}

writeFileSync(path, text);
console.log("Linked My Holy Desire in the FAQ.");
