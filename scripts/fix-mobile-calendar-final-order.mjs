import { readFileSync, writeFileSync } from "node:fs";

const stylesPath = "src/styles.css";
let styles = readFileSync(stylesPath, "utf8");

const marker = "/* FINAL mobile public calendar order: calendar -> booking -> info boxes. */";
if (!styles.includes(marker)) {
  styles += `\n\n${marker}\n@media (max-width: 1023px) {\n  .public-calendar-layout {\n    display: flex !important;\n    flex-direction: column !important;\n  }\n\n  .public-calendar-layout > .lg\\:col-span-7 {\n    display: contents !important;\n  }\n\n  .public-calendar-layout > .lg\\:col-span-7 > .bg-card {\n    order: 0 !important;\n  }\n\n  .public-calendar-layout > .lg\\:col-span-5 {\n    order: 1 !important;\n  }\n\n  .public-calendar-layout > .lg\\:col-span-7 > .mt-6,\n  .public-calendar-layout > .lg\\:col-span-7 > .mt-4 {\n    order: 2 !important;\n  }\n}\n`;
}

writeFileSync(stylesPath, styles);
console.log("Final mobile calendar order enforced after all calendar transforms.");
