import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_bookings",
  title: "Buchungen auflisten",
  description:
    "Liste Buchungen (Bookings) für den angemeldeten Nutzer. Standardmäßig sortiert nach angefragtem Startzeitpunkt. Optional nach Status filtern.",
  inputSchema: {
    status: z
      .enum(["pending", "confirmed", "cancelled", "declined", "rescheduling", "waiting_deposit", "open"])
      .optional()
      .describe("Nur Buchungen mit diesem Status zurückgeben."),
    limit: z.number().int().min(1).max(100).optional().describe("Anzahl Einträge (max 100, Standard 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Nicht authentifiziert." }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let query = sb
      .from("bookings")
      .select(
        "id,guest_name,guest_email,guest_phone,status,requested_start,duration_minutes,anzahlung,anzahlung_paid,bar,message,created_at",
      )
      .order("requested_start", { ascending: true, nullsFirst: false })
      .limit(limit ?? 25);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { bookings: data ?? [] },
    };
  },
});
