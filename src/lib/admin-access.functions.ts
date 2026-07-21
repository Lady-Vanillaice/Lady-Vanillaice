import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type AccessRequest = {
  id: string;
  requester_user_id: string;
  requester_email: string;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
};

/* -------- REQUESTER (any logged-in user) -------- */

export const requestAdminAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ message: z.string().trim().max(1000).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const email = (context.claims?.email as string | undefined) ?? null;
    if (!email) throw new Error("Kein E-Mail-Konto gefunden.");

    // Already admin? Don't create duplicate work.
    const { data: alreadyAdmin } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (alreadyAdmin) {
      return { alreadyAdmin: true, request: null as AccessRequest | null };
    }

    // Reuse existing pending request if any.
    const { data: existing } = await context.supabase
      .from("admin_access_requests")
      .select("*")
      .eq("requester_user_id", context.userId)
      .eq("status", "pending")
      .maybeSingle();

    let request = existing as AccessRequest | null;

    if (!request) {
      const { data: inserted, error } = await context.supabase
        .from("admin_access_requests")
        .insert({
          requester_user_id: context.userId,
          requester_email: email,
          message: data.message ?? null,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      request = inserted as AccessRequest;
    }

    // Notify existing admins (best-effort)
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: adminRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const recipients: string[] = [];
      for (const row of adminRoles ?? []) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
        if (u?.user?.email) recipients.push(u.user.email);
      }
      // Always also notify the project owner inbox if configured.
      const ownerEmail =
        process.env.ADMIN_NOTIFICATION_EMAIL || "kontakt@ladyvanillaice.de";
      if (!recipients.includes(ownerEmail)) recipients.push(ownerEmail);

      const { enqueueTransactionalEmail } = await import("@/lib/email/enqueue.server");
      await Promise.all(
        recipients.map((to) =>
          enqueueTransactionalEmail({
            templateName: "admin-access-request",
            recipientEmail: to,
            templateData: {
              requesterEmail: email,
              requesterUserId: context.userId,
              message: data.message ?? "",
            },
            idempotencyKey: `admin-req-${request!.id}-${to}`,
          }),
        ),
      );
    } catch (err) {
      console.error("Failed to enqueue admin-access-request emails", err);
    }

    return { alreadyAdmin: false, request };
  });

export const getMyAdminRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("admin_access_requests")
      .select("*")
      .eq("requester_user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { request: (data as AccessRequest | null) ?? null };
  });

/* -------- ADMIN -------- */

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const listAdminAccessRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("admin_access_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AccessRequest[];
  });

export const decideAdminAccessRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        note: z.string().trim().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { data: req, error: fetchErr } = await context.supabase
      .from("admin_access_requests")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!req) throw new Error("Anfrage nicht gefunden.");

    const { error: updErr } = await context.supabase
      .from("admin_access_requests")
      .update({
        status: data.decision,
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    if (data.decision === "approved") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: req.requester_user_id, role: "admin" },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
      if (roleErr) throw new Error(roleErr.message);
    }

    // Notify requester
    try {
      const { enqueueTransactionalEmail } = await import("@/lib/email/enqueue.server");
      await enqueueTransactionalEmail({
        templateName: "admin-access-decision",
        recipientEmail: req.requester_email,
        templateData: { approved: data.decision === "approved", note: data.note ?? "" },
        idempotencyKey: `admin-decision-${req.id}-${data.decision}`,
      });
    } catch (err) {
      console.error("Failed to enqueue admin-access-decision email", err);
    }

    return { ok: true };
  });
