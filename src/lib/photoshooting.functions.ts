import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const submitSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  social_media: z.string().trim().max(500).optional(),
  shoot_type: z.string().trim().min(1).max(200),
  budget_type: z.enum(["TFP", "Pay", "Beides"]),
  message: z.string().trim().max(2000).optional(),
});

export const submitPhotoshootRequest = createServerFn({ method: "POST" })
  .inputValidator((data) => submitSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("photoshoot_requests")
      .insert({
        name: data.name,
        email: data.email,
        social_media: data.social_media || null,
        shoot_type: data.shoot_type,
        budget_type: data.budget_type,
        message: data.message || null,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Send notification email to admin (best effort).
    try {
      const { enqueueTransactionalEmail } = await import("@/lib/email/enqueue.server");
      await enqueueTransactionalEmail({
        templateName: "photoshooting-notification",
        recipientEmail: "info@herzblutmadl.com",
        templateData: {
          name: data.name,
          email: data.email,
          socialMedia: data.social_media,
          shootType: data.shoot_type,
          budgetType: data.budget_type,
          message: data.message,
          requestId: row?.id,
        },
        idempotencyKey: `photoshoot-notify-${row?.id}`,
      });
    } catch (err) {
      console.error("Failed to enqueue photoshoot notification email", err);
    }

    return { success: true };
  });

export const listPhotoshootRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabase
      .from("photoshoot_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

const updateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "interested", "declined"]),
});

export const updatePhotoshootStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updateStatusSchema.parse(data))
  .handler(async ({ data }) => {
    const { error } = await supabase
      .from("photoshoot_requests")
      .update({ status: data.status })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });

const deleteSchema = z.object({
  id: z.string().uuid(),
});

export const deletePhotoshootRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => deleteSchema.parse(data))
  .handler(async ({ data }) => {
    const { error } = await supabase
      .from("photoshoot_requests")
      .delete()
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });
