import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/kalender.tsx";
let text = readFileSync(path, "utf8");

text = text.replace(
  '<div className="container-luxe grid lg:grid-cols-12 gap-10">',
  '<div className="container-luxe space-y-10">',
);
text = text.replace(
  '<div className="container-luxe grid lg:grid-cols-12 gap-10 public-calendar-layout">',
  '<div className="container-luxe space-y-10">',
);
text = text.replace(
  '<div className="lg:col-span-7">',
  '<div>',
);
text = text.replace(
  '<div className="lg:col-span-5">',
  '<div>',
);
text = text.replace(
  '<div className="lg:col-span-5 public-booking-stack">',
  '<div>',
);
text = text.replace(
  '<div className="lg:col-span-5 public-booking-stack flex flex-col">',
  '<div>',
);

const booking = text.indexOf('{/* Booking panel */}');
const info = text.indexOf('tr("Längere Session ab 4 Stunden?", "Longer session from 4 hours?")');
if (booking < 0 || info < 0 || info < booking) {
  throw new Error("Calendar order is not booking-first.");
}

writeFileSync(path, text);
console.log("Calendar is vertical on all devices: calendar -> booking request -> info boxes.");
