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

function visitSlug(dateKey: string, visitorId: string) {
  return `hv-${dateKey}-${visitorId}`;
}

export const recordHomepageVisit = createServerFn({ method: "POST" })
  .inputValidator((data) => visitorSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const visitDate = berlinDateKey();

    // Nutzt die bereits vorhandene site_content-Tabelle.
    // Pro Browser und Kalendertag existiert maximal eine Zeile.
    const { error } = await supabaseAdmin
      .from("site_content")
      .upsert(
        {
          slug: visitSlug(visitDate, data.visitor_id),
          body: "homepage-visit",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug", ignoreDuplicates: true },
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
    const { data, error } = await supabaseAdmin
      .from("site_content")
      .select("slug")
      .like("slug", "hv-%");

    if (error) throw new Error(error.message);

    const rows = (data ?? [])
      .map((row) => {
        const match = row.slug.match(/^hv-(\d{4}-\d{2}-\d{2})-([0-9a-f-]{36})$/i);
        return match ? { date: match[1], visitorId: match[2] } : null;
      })
      .filter((row): row is { date: string; visitorId: string } => Boolean(row))
      .filter((row) => row.date >= firstDate && row.date <= today);

    const daily = Array.from({ length: 7 }, (_, index) => {
      const date = shiftDateKey(today, index - 6);
      return {
        date,
        visitors: new Set(rows.filter((row) => row.date === date).map((row) => row.visitorId)).size,
      };
    });

    const monthly = Array.from({ length: 6 }, (_, index) => {
      const month = shiftMonthKey(currentMonth, index - 5);
      return {
        month,
        visitors: new Set(
          rows.filter((row) => row.date.startsWith(month)).map((row) => row.visitorId),
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
