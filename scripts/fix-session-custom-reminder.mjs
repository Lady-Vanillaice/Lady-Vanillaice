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

// A pure Custom order is identified by its dedicated payment marker.
// The old duration label alone must NOT turn a normal Session + Custom into prepaid-only Custom.
const detailPatch = "src/routes/_authenticated/admin.buchung.$id.tsx";
replaceIfPresent(
  detailPatch,
  `  const isCustomContentBooking = detailQ.data?.booking?.duration === "Custom Content";`,
  `  const isCustomContentBooking = detailQ.data?.booking?.duration === "Custom Content" && /Custom-Content-(?:Vorauszahlung|Zahlung)/i.test(detailQ.data?.booking?.admin_note ?? "");`,
);

// Server action used directly from Terminplan to remember that a regular session includes Custom Content.
const bookingFns = "src/lib/booking.functions.ts";
appendOnce(
  bookingFns,
  "export const setSessionCustomFlag = createServerFn",
  `export const setSessionCustomFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data: booking, error: bookingErr } = await context.supabase
      .from("bookings")
      .select("id, slot_id, duration, admin_note")
      .eq("id", data.id)
      .maybeSingle();
    if (bookingErr) throw new Error(bookingErr.message);
    if (!booking) throw new Error("Buchung nicht gefunden.");
    if (!booking.slot_id) throw new Error("Für diese Buchung ist kein Termin-Slot hinterlegt.");

    const pureCustom = booking.duration === "Custom Content" && /Custom-Content-(?:Vorauszahlung|Zahlung)/i.test(booking.admin_note ?? "");
    if (pureCustom) throw new Error("Reine Custom-Content-Aufträge werden über den eigenen Custom-Bereich verwaltet.");

    const { error: slotErr } = await context.supabase
      .from("availability_slots")
      .update({ is_content_shoot: data.enabled })
      .eq("id", booking.slot_id);
    if (slotErr) throw new Error(slotErr.message);

    const marker = "[SESSION_CUSTOM]";
    const cleaned = (booking.admin_note ?? "").replace(/(?:^|\\n)\\[SESSION_CUSTOM\\]\\s*/g, "").trim();
    const admin_note = data.enabled ? [cleaned, marker].filter(Boolean).join("\\n") : cleaned || null;
    const updatePayload = {
      admin_note,
      ...(data.enabled && booking.duration === "Custom Content" ? { duration: null } : {}),
    };
    const { error: noteErr } = await context.supabase.from("bookings").update(updatePayload).eq("id", data.id);
    if (noteErr) throw new Error(noteErr.message);
    return { ok: true };
  });`,
);

const terminplan = "src/routes/_authenticated/admin.terminplan.tsx";
replaceIfPresent(
  terminplan,
  `import { createManualBooking } from "@/lib/booking.functions";`,
  `import { createManualBooking, setSessionCustomFlag } from "@/lib/booking.functions";`,
);
replaceIfPresent(
  terminplan,
  `function hasNoDeposit(entry: Pick<Entry, "deposit_exemption_reason" | "anzahlung" | "bar">) {\n  return Boolean(entry.deposit_exemption_reason) || (Number(entry.anzahlung ?? 0) === 0 && Number(entry.bar ?? 0) > 0);\n}`,
  `function hasNoDeposit(entry: Pick<Entry, "deposit_exemption_reason" | "anzahlung" | "bar">) {\n  return Boolean(entry.deposit_exemption_reason) || (Number(entry.anzahlung ?? 0) === 0 && Number(entry.bar ?? 0) > 0);\n}\n\nfunction isPureCustomContent(entry: Pick<Entry, "duration" | "admin_note">) {\n  return entry.duration === "Custom Content" && /Custom-Content-(?:Vorauszahlung|Zahlung)/i.test(entry.admin_note ?? "");\n}`,
);
replaceIfPresent(
  terminplan,
  `  const createManualBookingFn = useServerFn(createManualBooking);`,
  `  const createManualBookingFn = useServerFn(createManualBooking);\n  const setSessionCustomFlagFn = useServerFn(setSessionCustomFlag);`,
);
replaceIfPresent(
  terminplan,
  `  const q = useQuery({`,
  `  const sessionCustomMut = useMutation({\n    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => setSessionCustomFlagFn({ data: { id, enabled } }),\n    onSuccess: async () => {\n      await Promise.all([\n        qc.invalidateQueries({ queryKey: ["admin-terminplan"], refetchType: "all" }),\n        qc.invalidateQueries({ queryKey: ["admin-booking-detail"], refetchType: "all" }),\n        qc.invalidateQueries({ queryKey: ["cashbook"], refetchType: "all" }),\n      ]);\n    },\n  });\n\n  const q = useQuery({`,
);
replaceIfPresent(
  terminplan,
  `                    <EntryCard key={e.id} e={e} />`,
  `                    <div key={e.id} className="space-y-2">\n                      <EntryCard e={e} />\n                      {!isPureCustomContent(e) && (\n                        <button\n                          type="button"\n                          disabled={sessionCustomMut.isPending}\n                          onClick={() => sessionCustomMut.mutate({ id: e.id, enabled: !e.is_content_shoot })}\n                          className={\`w-full border px-3 py-2 text-[0.65rem] uppercase tracking-[0.16em] transition disabled:opacity-40 \${e.is_content_shoot ? "border-green-500/40 bg-green-500/10 text-green-200" : "border-champagne/25 text-champagne hover:border-champagne/60"}\`}\n                        >\n                          {e.is_content_shoot ? "✓ Custom für diese Session vorgemerkt · entfernen" : "+ Custom für diese Session vormerken"}\n                        </button>\n                      )}\n                    </div>`,
);

console.log("Session + Custom reminder and legacy Custom classification applied.");
