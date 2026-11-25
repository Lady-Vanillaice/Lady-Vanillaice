import { berlinDateKey, freeHolesForPlan, parsePlan, type PlanHole } from "./session-plan";

/** Lädt alle unbeaufsichtigten Liegezeiten im Zeitraum (frei buchbare Lücken). */
export async function loadFreeLiegezeitHoles(fromMs: number, toMs: number): Promise<PlanHole[]> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const day = 24 * 60 * 60_000;
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("requested_start, admin_note, status")
      .in("status", ["pending", "waiting_deposit", "confirmed"])
      .ilike("admin_note", "%Ablauf:%")
      .not("requested_start", "is", null)
      .gte("requested_start", new Date(fromMs - day).toISOString())
      .lte("requested_start", new Date(toMs + day).toISOString());
    if (error || !data) return [];
    return data.flatMap((b: { requested_start: string | null; admin_note: string | null }) => {
      const plan = parsePlan(b.admin_note);
      if (!plan || !b.requested_start) return [];
      return freeHolesForPlan(berlinDateKey(b.requested_start), plan);
    });
  } catch {
    return [];
  }
}
