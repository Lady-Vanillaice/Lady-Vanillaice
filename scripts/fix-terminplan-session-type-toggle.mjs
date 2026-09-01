import { readFileSync, writeFileSync } from "node:fs";

function replaceIfPresent(path, before, after) {
  let text = readFileSync(path, "utf8");
  if (text.includes(after) || !text.includes(before)) return;
  text = text.replace(before, after);
  writeFileSync(path, text);
}

function appendOnce(path, needle, block) {
  let text = readFileSync(path, "utf8");
  if (text.includes(needle)) return;
  text += `\n\n${block}\n`;
  writeFileSync(path, text);
}

const bookingFns = "src/lib/booking.functions.ts";
appendOnce(
  bookingFns,
  "export const setBookingDuoFlag = createServerFn",
  `export const setBookingDuoFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), is_duo: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data: booking, error: bookingErr } = await context.supabase
      .from("bookings")
      .select("id, slot_id")
      .eq("id", data.id)
      .maybeSingle();
    if (bookingErr) throw new Error(bookingErr.message);
    if (!booking) throw new Error("Buchung nicht gefunden.");
    if (!booking.slot_id) throw new Error("Für diese Buchung ist kein Termin-Slot hinterlegt.");

    const { error: slotErr } = await context.supabase
      .from("availability_slots")
      .update({ is_duo: data.is_duo, ...(data.is_duo ? {} : { duo_partner: null }) })
      .eq("id", booking.slot_id);
    if (slotErr) throw new Error(slotErr.message);
    return { ok: true };
  });`,
);

const terminplan = "src/routes/_authenticated/admin.terminplan.tsx";
replaceIfPresent(
  terminplan,
  `import { createManualBooking, setSessionCustomFlag } from "@/lib/booking.functions";`,
  `import { createManualBooking, setSessionCustomFlag, setBookingDuoFlag } from "@/lib/booking.functions";`,
);
replaceIfPresent(
  terminplan,
  `  const setSessionCustomFlagFn = useServerFn(setSessionCustomFlag);`,
  `  const setSessionCustomFlagFn = useServerFn(setSessionCustomFlag);\n  const setBookingDuoFlagFn = useServerFn(setBookingDuoFlag);`,
);
replaceIfPresent(
  terminplan,
  `  const q = useQuery({`,
  `  const bookingTypeMut = useMutation({\n    mutationFn: ({ id, is_duo }: { id: string; is_duo: boolean }) => setBookingDuoFlagFn({ data: { id, is_duo } }),\n    onSuccess: async () => {\n      await Promise.all([\n        qc.invalidateQueries({ queryKey: ["admin-terminplan"], refetchType: "all" }),\n        qc.invalidateQueries({ queryKey: ["admin-booking-detail"], refetchType: "all" }),\n        qc.invalidateQueries({ queryKey: ["cashbook"], refetchType: "all" }),\n        qc.invalidateQueries({ queryKey: ["admin-slots"], refetchType: "all" }),\n      ]);\n    },\n  });\n\n  const q = useQuery({`,
);
replaceIfPresent(
  terminplan,
  `                      <EntryCard e={e} />\n                      {!isPureCustomContent(e) && (`,
  `                      <EntryCard e={e} />\n                      {!isPureCustomContent(e) && (\n                        <div className="grid grid-cols-2 gap-2">\n                          <button type="button" disabled={bookingTypeMut.isPending || !e.is_duo} onClick={() => bookingTypeMut.mutate({ id: e.id, is_duo: false })} className={\`border px-3 py-2 text-[0.65rem] uppercase tracking-[0.16em] transition disabled:opacity-45 \${!e.is_duo ? "border-green-500/40 bg-green-500/10 text-green-200" : "border-champagne/25 text-champagne hover:border-champagne/60"}\`}>\n                            {!e.is_duo ? "✓ Single" : "Als Single setzen"}\n                          </button>\n                          <button type="button" disabled={bookingTypeMut.isPending || e.is_duo} onClick={() => bookingTypeMut.mutate({ id: e.id, is_duo: true })} className={\`border px-3 py-2 text-[0.65rem] uppercase tracking-[0.16em] transition disabled:opacity-45 \${e.is_duo ? "border-green-500/40 bg-green-500/10 text-green-200" : "border-champagne/25 text-champagne hover:border-champagne/60"}\`}>\n                            {e.is_duo ? "✓ Duo" : "Als Duo setzen"}\n                          </button>\n                        </div>\n                      )}\n                      {!isPureCustomContent(e) && (`,
);

console.log("Terminplan allows correcting existing bookings between Single and Duo.");
