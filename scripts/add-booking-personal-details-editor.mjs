import { readFileSync, writeFileSync } from "node:fs";
const bookingPath = "src/lib/booking.functions.ts";
let booking = readFileSync(bookingPath, "utf8");
if (!booking.includes("export const updateBookingPersonalDetails")) {
  const marker = 'export const updateBookingNote = createServerFn({ method: "POST" })';
  const insert = `
export const updateBookingPersonalDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    preferences: z.string().trim().max(2000).optional().nullable(),
    taboos: z.string().trim().max(2000).optional().nullable(),
    health_notes: z.string().trim().max(2000).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data: current, error: fetchError } = await context.supabase.from("bookings").select("message").eq("id", data.id).maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!current) throw new Error("Buchung nicht gefunden.");
    const stripSection = (value: string, heading: string) => value.replace(
      new RegExp("(?:^|\\\\n\\\\n)" + heading + ":\\\\n[\\\\s\\\\S]*?(?=\\\\n\\\\n(?:Vorlieben & Wünsche|Tabus & Grenzen|Gesundheitliche Hinweise|—)|$)", "g"), ""
    );
    let base = current.message ?? "";
    for (const heading of ["Vorlieben & Wünsche", "Tabus & Grenzen", "Gesundheitliche Hinweise"]) base = stripSection(base, heading);
    base = base.replace(/\\n{3,}/g, "\\n\\n").trim();
    const sections = [
      data.preferences ? "Vorlieben & Wünsche:\\n" + data.preferences : null,
      data.taboos ? "Tabus & Grenzen:\\n" + data.taboos : null,
      data.health_notes ? "Gesundheitliche Hinweise:\\n" + data.health_notes : null,
    ].filter(Boolean);
    const manualMarker = "—\\nManuell durch Admin eingetragen.";
    const markerIndex = base.indexOf(manualMarker);
    const beforeMarker = markerIndex >= 0 ? base.slice(0, markerIndex).trim() : base;
    const afterMarker = markerIndex >= 0 ? manualMarker : "";
    const message = [beforeMarker, ...sections, afterMarker].filter(Boolean).join("\\n\\n").slice(0, 2000);
    const { error } = await context.supabase.from("bookings").update({ message }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

`;
  if (!booking.includes(marker)) throw new Error("updateBookingNote marker missing");
  booking = booking.replace(marker, insert + marker);
  writeFileSync(bookingPath, booking);
}
const detailPath = "src/routes/_authenticated/admin.buchung.$id.tsx";
let detail = readFileSync(detailPath, "utf8");
if (!detail.includes("updateBookingPersonalDetails,")) detail = detail.replace("  updateBookingNote,\n", "  updateBookingNote,\n  updateBookingPersonalDetails,\n");
if (!detail.includes("const savePersonalDetails = useServerFn(updateBookingPersonalDetails);")) detail = detail.replace("  const saveNote = useServerFn(updateBookingNote);", "  const saveNote = useServerFn(updateBookingNote);\n  const savePersonalDetails = useServerFn(updateBookingPersonalDetails);");
if (!detail.includes('const [preferences, setPreferences] = useState("");')) detail = detail.replace('  const [noteSaved, setNoteSaved] = useState(false);', '  const [noteSaved, setNoteSaved] = useState(false);\n  const [preferences, setPreferences] = useState("");\n  const [taboos, setTaboos] = useState("");\n  const [healthNotes, setHealthNotes] = useState("");\n  const [personalDetailsSaved, setPersonalDetailsSaved] = useState(false);');
if (!detail.includes("function readPersonalSection(")) {
  const marker = "  useEffect(() => {\n    if (detailQ.data?.booking) {";
  const helper = `  function readPersonalSection(message: string | null | undefined, heading: string) {
    if (!message) return "";
    const match = message.match(new RegExp("(?:^|\\\\n\\\\n)" + heading + ":\\\\n([\\\\s\\\\S]*?)(?=\\\\n\\\\n(?:Vorlieben & Wünsche|Tabus & Grenzen|Gesundheitliche Hinweise|—)|$)"));
    return match?.[1]?.trim() ?? "";
  }

`;
  if (!detail.includes(marker)) throw new Error("detail useEffect marker missing");
  detail = detail.replace(marker, helper + marker);
}
if (!detail.includes("setPreferences(readPersonalSection")) detail = detail.replace('      setNote(b.admin_note ?? "");', '      setNote(b.admin_note ?? "");\n      const personalMessage = (detailQ.data.booking as { message?: string | null }).message;\n      setPreferences(readPersonalSection(personalMessage, "Vorlieben & Wünsche"));\n      setTaboos(readPersonalSection(personalMessage, "Tabus & Grenzen"));\n      setHealthNotes(readPersonalSection(personalMessage, "Gesundheitliche Hinweise"));');
if (!detail.includes("const personalDetailsMut = useMutation")) {
  const marker = "  const scheduleMut = useMutation({";
  const mutation = `  const personalDetailsMut = useMutation({
    mutationFn: () => savePersonalDetails({ data: { id, preferences: preferences.trim() || null, taboos: taboos.trim() || null, health_notes: healthNotes.trim() || null } }),
    onSuccess: () => {
      setPersonalDetailsSaved(true);
      setTimeout(() => setPersonalDetailsSaved(false), 2500);
      qc.invalidateQueries({ queryKey: ["admin-booking-detail", id] });
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
  });

`;
  if (!detail.includes(marker)) throw new Error("schedule mutation marker missing");
  detail = detail.replace(marker, mutation + marker);
}
if (!detail.includes("Persönliche Angaben bearbeiten")) {
  const marker = "          {/* CONTENT-DREH FOTO */}";
  const card = `          <div className="bg-card border border-champagne/15 p-6 mb-6">
            <div className="eyebrow mb-1">Persönliche Angaben bearbeiten</div>
            <p className="text-[0.7rem] text-vanilla/50 mb-4">Vorlieben, Tabus und gesundheitliche Hinweise kannst du auch nach dem Anlegen des Termins ergänzen oder ändern.</p>
            <div className="space-y-4">
              <div><label className="eyebrow block mb-1">Vorlieben &amp; Wünsche</label><textarea value={preferences} onChange={(e) => setPreferences(e.target.value)} rows={3} maxLength={2000} className="input-luxe w-full resize-y" placeholder="Vorlieben, Wünsche und besprochene Praktiken" /></div>
              <div><label className="eyebrow block mb-1">Tabus &amp; Grenzen</label><textarea value={taboos} onChange={(e) => setTaboos(e.target.value)} rows={3} maxLength={2000} className="input-luxe w-full resize-y" placeholder="Tabus, Grenzen und ausgeschlossene Praktiken" /></div>
              <div><label className="eyebrow block mb-1">Gesundheitliche Hinweise</label><textarea value={healthNotes} onChange={(e) => setHealthNotes(e.target.value)} rows={3} maxLength={2000} className="input-luxe w-full resize-y" placeholder="Allergien, Verletzungen, Medikamente oder andere wichtige Hinweise" /><p className="mt-1 text-[0.65rem] text-vanilla/45">Nur im geschützten Adminbereich sichtbar.</p></div>
              <button type="button" onClick={() => personalDetailsMut.mutate()} disabled={personalDetailsMut.isPending} className="btn-gold !py-2 !px-4 !text-[0.65rem] disabled:opacity-40">{personalDetailsMut.isPending ? "Speichere…" : personalDetailsSaved ? "✓ Angaben gespeichert" : "Persönliche Angaben speichern"}</button>
              {personalDetailsMut.error instanceof Error && <p className="text-xs text-bordeaux">{personalDetailsMut.error.message}</p>}
            </div>
          </div>

`;
  if (!detail.includes(marker)) throw new Error("content photo marker missing");
  detail = detail.replace(marker, card + marker);
}
writeFileSync(detailPath, detail);
console.log("Booking personal details editor applied.");
