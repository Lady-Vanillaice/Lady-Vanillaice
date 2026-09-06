import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/_authenticated/admin.termine.tsx";
let text = readFileSync(path, "utf8");
const before = text;

text = text.replace(
  '<div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-3">',
  '<div className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-black/80 p-3 sm:p-6 [-webkit-overflow-scrolling:touch]">',
);

text = text.replace(
  '<form onSubmit={submit} className="w-full max-w-lg bg-card border border-champagne/40 p-5 space-y-5">',
  '<form onSubmit={submit} className="mx-auto my-3 w-full max-w-lg bg-card border border-champagne/40 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-5">',
);

if (text !== before) {
  writeFileSync(path, text);
  console.log("Mobile booking-fix dialog scrolling enabled.");
} else {
  console.log("Mobile booking-fix dialog scrolling already enabled.");
}
