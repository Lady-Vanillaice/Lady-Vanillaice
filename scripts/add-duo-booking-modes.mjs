import { readFileSync, writeFileSync } from "node:fs";

const adminPath = "src/components/admin/admin-shared.tsx";
let admin = readFileSync(adminPath, "utf8");

if (!admin.includes("isDuoOptional")) {
  admin = admin.replace(
    '  const [isDuo, setIsDuo] = useState(false);\n  const [duoPartner, setDuoPartner] = useState("");',
    '  const [isDuo, setIsDuo] = useState(false);\n  const [isDuoOptional, setIsDuoOptional] = useState(false);\n  const [duoPartner, setDuoPartner] = useState("");',
  );

  admin = admin.replace(
    '    if (isDuo && !duoPartner.trim()) {',
    '    if ((isDuo || isDuoOptional) && !duoPartner.trim()) {',
  );

  admin = admin.replace(
    '        is_duo: isDuo,\n        is_content_shoot: isContentShoot,\n        duo_partner: isDuo ? duoPartner.trim() : null,',
    '        is_duo: isDuo || isDuoOptional,\n        is_content_shoot: isContentShoot,\n        duo_partner: isDuoOptional ? `OPTIONAL_DUO::${duoPartner.trim()}` : isDuo ? duoPartner.trim() : null,',
  );

  admin = admin.replace(
    'setDate(""); setRoom(""); setNote(""); setIsDuo(false); setDuoPartner("");',
    'setDate(""); setRoom(""); setNote(""); setIsDuo(false); setIsDuoOptional(false); setDuoPartner("");',
  );

  admin = admin.replace(
    '          onChange={(e) => setIsDuo(e.target.checked)}',
    '          onChange={(e) => { setIsDuo(e.target.checked); if (e.target.checked) setIsDuoOptional(false); }}',
  );

  admin = admin.replace(
    '          Als Duo-Zeitfenster freischalten — wird im Kalender sichtbar mit <span className="text-champagne">Duo</span> markiert.',
    '          Nur Duo-Sessions anbieten — Kunden können bei diesem Termin keine Single-Session auswählen.',
  );

  const firstDuoLabelEnd = `      </label>\n      {isDuo && (`;
  const secondDuoLabel = `      </label>\n      <label className="flex items-start gap-3 text-xs text-vanilla/70 cursor-pointer border border-champagne/15 bg-anthracite/30 p-3">\n        <input\n          type="checkbox"\n          checked={isDuoOptional}\n          onChange={(e) => { setIsDuoOptional(e.target.checked); if (e.target.checked) setIsDuo(false); }}\n          className="mt-0.5 accent-[var(--color-champagne)]"\n        />\n        <span>\n          Duo-Session möglich — Kunden können zwischen Duo und Single wählen.\n        </span>\n      </label>\n      {(isDuo || isDuoOptional) && (`;
  admin = admin.replace(firstDuoLabelEnd, secondDuoLabel);
}

if (!admin.includes("isDuoOptional")) {
  throw new Error("Die zweite Duo-Option konnte im Admin-Kalender nicht eingebaut werden.");
}
writeFileSync(adminPath, admin);

const calendarPath = "src/routes/kalender.tsx";
let calendar = readFileSync(calendarPath, "utf8");

if (!calendar.includes("OPTIONAL_DUO::")) {
  calendar = calendar.replace(
    'function BookingPanel({ slot, onBooked }: { slot: Slot; onBooked: () => void }) {',
    'const OPTIONAL_DUO_PREFIX = "OPTIONAL_DUO::";\n\nfunction BookingPanel({ slot, onBooked }: { slot: Slot; onBooked: () => void }) {',
  );

  calendar = calendar.replace(
    '  const [sessionType, setSessionType] = useState<"duo" | "single">("duo");\n  const applyingProposalRef = useRef(false);',
    '  const [sessionType, setSessionType] = useState<"duo" | "single">("duo");\n  const duoIsOptional = Boolean(slot.duo_partner?.startsWith(OPTIONAL_DUO_PREFIX));\n  const duoPartner = duoIsOptional ? slot.duo_partner?.slice(OPTIONAL_DUO_PREFIX.length) || null : slot.duo_partner;\n  const applyingProposalRef = useRef(false);',
  );

  calendar = calendar.replaceAll('slot.duo_partner ? ` (mit ${slot.duo_partner})` : ""', 'duoPartner ? ` (mit ${duoPartner})` : ""');
  calendar = calendar.replaceAll('slot.duo_partner ? ` (with ${slot.duo_partner})` : ""', 'duoPartner ? ` (with ${duoPartner})` : ""');
  calendar = calendar.replaceAll('slot.duo_partner ?? "Partnerin"', 'duoPartner ?? "Partnerin"');
  calendar = calendar.replaceAll('slot.duo_partner ?? "partner"', 'duoPartner ?? "partner"');
  calendar = calendar.replaceAll('{slot.duo_partner}', '{duoPartner}');

  calendar = calendar.replace(
    '      {slot.is_duo && (\n        <div className="mb-5 border border-champagne/30 bg-champagne/[0.04] p-4">',
    '      {slot.is_duo && duoIsOptional && (\n        <div className="mb-5 border border-champagne/30 bg-champagne/[0.04] p-4">',
  );
}

if (!calendar.includes("duoIsOptional") || !calendar.includes("OPTIONAL_DUO_PREFIX")) {
  throw new Error("Die Duo-Auswahl konnte im öffentlichen Kalender nicht unterschieden werden.");
}
writeFileSync(calendarPath, calendar);

console.log("Duo-only and duo-or-single booking modes applied.");
