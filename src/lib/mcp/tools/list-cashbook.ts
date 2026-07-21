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
  name: "list_cashbook_entries",
  title: "Kassenbuch-Einträge auflisten",
  description:
    "Liste Kassenbuch-Einträge (Cashbook). Optional nach Datum filtern (ISO YYYY-MM-DD, inklusive).",
  inputSchema: {
    from: z.string().optional().describe("Startdatum (YYYY-MM-DD), inklusive."),
    to: z.string().optional().describe("Enddatum (YYYY-MM-DD), inklusive."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Nicht authentifiziert." }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let query = sb
      .from("cash_book_entries")
      .select("id,datum,studio,kunde,anzahlung,anzahlung_method,bar,gesamt,notiz,created_at")
      .order("datum", { ascending: false })
      .limit(limit ?? 50);
    if (from) query = query.gte("datum", from);
    if (to) query = query.lte("datum", to);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const total = (data ?? []).reduce((sum, row) => sum + Number(row.gesamt ?? 0), 0);
    return {
      content: [
        {
          type: "text",
          text: `Summe (gesamt): ${total.toFixed(2)} €\n\n${JSON.stringify(data, null, 2)}`,
        },
      ],
      structuredContent: { entries: data ?? [], total },
    };
  },
});
