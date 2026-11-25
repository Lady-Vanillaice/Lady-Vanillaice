import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LongtermClient = {
  id: string;
  kunde: string;
  paket: string;
  betrag: number;
  bezahltAm: string; // YYYY-MM-DD
  bis: string; // YYYY-MM-DD
};

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
      .select("id, kunde, datum, gesamt, notiz")
      .eq("studio", "Langzeiterziehung")
      .order("datum", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const clients: LongtermClient[] = (data ?? []).map((row: { id: string; kunde: string | null; datum: string; gesamt: number | string | null; notiz: string | null }) => {
      const note = row.notiz ?? "";
      const paket = note.match(/Paket\s+([^·\n]+)/)?.[1]?.trim() ?? "Individuell";
      const bisMatch = note.match(/Laufzeit bis\s+(\d{2})\.(\d{2})\.(\d{4})/);
      const bis = bisMatch ? `${bisMatch[3]}-${bisMatch[2]}-${bisMatch[1]}` : addOneMonth(row.datum);
      return { id: row.id, kunde: row.kunde ?? "—", paket, betrag: Number(row.gesamt ?? 0), bezahltAm: row.datum, bis };
    });
    // Pro Kunde nur die neueste Zahlung (spätestes Laufzeit-Ende) zeigen.
    const latest = new Map<string, LongtermClient>();
    for (const c of clients) {
      const key = c.kunde.trim().toLowerCase();
      const prev = latest.get(key);
      if (!prev || c.bis > prev.bis) latest.set(key, c);
    }
    return [...latest.values()].sort((a, b) => a.bis.localeCompare(b.bis));
  });
