import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type LongtermClient = {
  id: string;
  kunde: string;
  paket: string;
  betrag: number;
  bezahltAm: string; // YYYY-MM-DD
  bis: string; // YYYY-MM-DD
  zahlungsart: string | null;
  notiz: string; // freie Notiz ohne Paket/Laufzeit
  /** Alle Zahlungen für dieselbe Laufzeit zusammen (z. B. Basis + Upgrade-Nachzahlung). */
  summe: number;
};

/** Trennt die sichtbare Notiz von den internen [[LVI_…]]-Zeilen. */
function splitNote(raw: string | null) {
  const lines = (raw ?? "").split("\n");
  const meta = lines.filter((l) => l.trim().startsWith("[[LVI_"));
  const human = lines.filter((l) => !l.trim().startsWith("[[LVI_")).join(" ").trim();
  return { human, meta };
}

function freeNote(human: string) {
  return human
    .split("·")
    .map((part) => part.trim())
    .filter((part) => part && !/^Paket\s/i.test(part) && !/^Laufzeit bis\s/i.test(part))
    .join(" · ");
}

async function adminDb(context: { supabase: any; userId: string }) {
  const role = await context.supabase
    .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (role.error || !role.data) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function addOneMonth(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(Date.UTC(y, m, d));
  if (target.getUTCDate() !== d) target.setUTCDate(0);
  return target.toISOString().slice(0, 10);
}

/** Langzeiterziehungen aus dem Kassenbuch mit Paket und Laufzeit. */
export const listLongtermClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (role.error || !role.data) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("cash_book_entries")
      .select("id, kunde, datum, gesamt, notiz, anzahlung_method")
      .eq("studio", "Langzeiterziehung")
      .order("datum", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const clients: LongtermClient[] = (data ?? []).map((row: { id: string; kunde: string | null; datum: string; gesamt: number | string | null; notiz: string | null; anzahlung_method: string | null }) => {
      const note = splitNote(row.notiz).human;
      const paket = note.match(/Paket\s+([^·\n]+)/)?.[1]?.trim() ?? "Individuell";
      const bisMatch = note.match(/Laufzeit bis\s+(\d{2})\.(\d{2})\.(\d{4})/);
      const bis = bisMatch ? `${bisMatch[3]}-${bisMatch[2]}-${bisMatch[1]}` : addOneMonth(row.datum);
      return { id: row.id, kunde: row.kunde ?? "—", paket, betrag: Number(row.gesamt ?? 0), bezahltAm: row.datum, bis, zahlungsart: row.anzahlung_method, notiz: freeNote(note), summe: Number(row.gesamt ?? 0) };
    });
    // Pro Kunde nur die neueste Zahlung (spätestes Laufzeit-Ende) zeigen.
    const latest = new Map<string, LongtermClient>();
    for (const c of clients) {
      const key = c.kunde.trim().toLowerCase();
      const prev = latest.get(key);
      if (!prev || c.bis > prev.bis) latest.set(key, c);
    }
    // Nachzahlungen (z. B. Upgrade) für dieselbe Laufzeit zusammenrechnen.
    for (const c of latest.values()) {
      const key = c.kunde.trim().toLowerCase();
      c.summe = clients.filter((o) => o.kunde.trim().toLowerCase() === key && o.bis === c.bis).reduce((sum, o) => sum + o.betrag, 0);
    }
    return [...latest.values()].sort((a, b) => a.bis.localeCompare(b.bis));
  });


/** Langzeiterziehung nachträglich ändern (Paket, Betrag, Zahlungsart, Laufzeit, Notiz). */
export const updateLongtermEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      kunde: z.string().trim().min(1).max(120),
      paket: z.string().trim().min(1).max(40),
      betrag: z.number().min(0).max(100_000),
      zahlungsart: z.string().trim().max(40).nullable(),
      bis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      notiz: z.string().max(500),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await adminDb(context);
    const { data: row, error } = await db
      .from("cash_book_entries")
      .select("id, studio, notiz")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || row.studio !== "Langzeiterziehung") throw new Error("Eintrag nicht gefunden.");
    const [y, m, d] = data.bis.split("-");
    const human = [`Paket ${data.paket}`, `Laufzeit bis ${d}.${m}.${y}`, data.notiz.trim() || null].filter(Boolean).join(" · ");
    const { meta } = splitNote(row.notiz);
    const { error: updErr } = await db
      .from("cash_book_entries")
      .update({
        kunde: data.kunde,
        anzahlung: data.betrag,
        anzahlung_method: data.zahlungsart || null,
        notiz: [human, ...meta].join("\n"),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);
    return { ok: true };
  });
