import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const visitorSchema = z.object({
  visitor_id: z.string().uuid(),
});

function berlinDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shiftDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return date.toISOString().slice(0, 10);
}

function shiftMonthKey(monthKey: string, months: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 15, 12));
  return date.toISOString().slice(0, 7);
}

export const recordHomepageVisit = createServerFn({ method: "POST" })
  .inputValidator((data) => visitorSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const visitDate = berlinDateKey();
    const { error } = await db.from("homepage_visits").upsert(
      {
        visitor_id: data.visitor_id,
        visit_date: visitDate,
        first_seen_at: new Date().toISOString(),
      },
      { onConflict: "visitor_id,visit_date", ignoreDuplicates: true },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getHomepageVisitStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError) throw new Error(roleError.message);
    if (!role) throw new Error("Forbidden");

    const today = berlinDateKey();
    const currentMonth = today.slice(0, 7);
    const firstMonth = shiftMonthKey(currentMonth, -5);
    const firstDate = `${firstMonth}-01`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data, error } = await db
      .from("homepage_visits")
      .select("visitor_id, visit_date")
      .gte("visit_date", firstDate)
      .lte("visit_date", today);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{ visitor_id: string; visit_date: string }>;
    const daily = Array.from({ length: 7 }, (_, index) => {
      const date = shiftDateKey(today, index - 6);
      return {
        date,
        visitors: new Set(rows.filter((row) => row.visit_date === date).map((row) => row.visitor_id)).size,
      };
    });

    const monthly = Array.from({ length: 6 }, (_, index) => {
      const month = shiftMonthKey(currentMonth, index - 5);
      return {
        month,
        visitors: new Set(
          rows.filter((row) => row.visit_date.startsWith(month)).map((row) => row.visitor_id),
        ).size,
      };
    });

    return {
      today: daily[daily.length - 1]?.visitors ?? 0,
      thisMonth: monthly[monthly.length - 1]?.visitors ?? 0,
      daily,
      monthly,
    };
  });
