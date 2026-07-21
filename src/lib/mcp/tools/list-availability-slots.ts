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
  name: "list_availability_slots",
  title: "Verfügbarkeits-Slots auflisten",
  description:
    "Liste kommende Verfügbarkeits-Slots. Optional nach Status filtern (open, held, booked).",
  inputSchema: {
    status: z.enum(["open", "held", "booked"]).optional(),
    limit: z.number().int().min(1).max(100).optional().describe("Anzahl Einträge (max 100, Standard 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Nicht authentifiziert." }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let query = sb
      .from("availability_slots")
      .select("id,starts_at,ends_at,status,location,is_duo,duo_partner,is_content_shoot,buffer_minutes")
      .gte("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(limit ?? 25);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { slots: data ?? [] },
    };
  },
});
