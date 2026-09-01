import fs from "node:fs";

function replace(path, before, after, label) {
  let source = fs.readFileSync(path, "utf8");
  if (source.includes(after)) {
    console.log(`[terminart-custom] already applied: ${label}`);
    return;
  }
  if (!source.includes(before)) {
    throw new Error(`[terminart-custom] target not found: ${label} in ${path}`);
  }
  source = source.replace(before, after);
  fs.writeFileSync(path, source);
  console.log(`[terminart-custom] applied: ${label}`);
}

const detail = "src/routes/_authenticated/admin.buchung.$id.tsx";

replace(
  detail,
  `const [bookingType, setBookingType] =\n  useState<"single" | "duo">("single");`,
  `const [bookingType, setBookingType] =\n  useState<"single" | "duo" | "content">("single");`,
  "extend booking type state",
);

replace(
  detail,
  `setBookingType(\n  b.availability_slots?.is_duo ? "duo" : "single"\n);\n\nsetIsContentShoot(\n  b.availability_slots?.is_content_shoot ?? false\n);`,
  `setBookingType(\n  b.availability_slots?.is_content_shoot\n    ? "content"\n    : b.availability_slots?.is_duo\n      ? "duo"\n      : "single"\n);\n\nsetIsContentShoot(\n  b.availability_slots?.is_content_shoot ?? false\n);`,
  "load Custom appointment type",
);

replace(
  detail,
  `  is_content_shoot: isContentShoot,`,
  `  is_content_shoot: bookingType === "content",`,
  "derive content flag from appointment type",
);

replace(
  detail,
  `<div className="grid grid-cols-2 gap-2">\n  {[\n    { value: "single" as const, label: "Single" },\n    { value: "duo" as const, label: "Duo" },\n  ].map((option) => (`,
  `<div className="grid grid-cols-3 gap-2">\n  {[\n    { value: "single" as const, label: "Single" },\n    { value: "duo" as const, label: "Duo" },\n    { value: "content" as const, label: "Custom" },\n  ].map((option) => (`,
  "show Custom as third appointment type",
);

replace(
  detail,
  `\n<label className="mt-3 flex items-center gap-2 text-sm text-vanilla/80">\n  <input\n    type="checkbox"\n    checked={isContentShoot}\n    onChange={(e) => setIsContentShoot(e.target.checked)}\n    className="accent-champagne"\n  />\n  Zusätzlich Content\n</label>\n`,
  `\n`,
  "remove additional Content checkbox",
);

const bookingFunctions = "src/lib/booking.functions.ts";
replace(
  bookingFunctions,
  `booking_type: z.enum(["single", "duo"]),`,
  `booking_type: z.enum(["single", "duo", "content"]),`,
  "allow Custom appointment type on server",
);

replace(
  bookingFunctions,
  `      is_duo: data.booking_type === "duo",\n      is_content_shoot: data.is_content_shoot,`,
  `      is_duo: data.booking_type === "duo",\n      is_content_shoot: data.booking_type === "content",`,
  "persist Custom classification",
);

console.log("Terminart now uses Single, Duo or Custom; the separate Content checkbox is removed.");
