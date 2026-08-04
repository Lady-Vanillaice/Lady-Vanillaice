import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const customInput = z.object({
  guest_name: z.string().trim().min(1).max(120),
  guest_email: z.string().trim().email().max(255),
  guest_phone: z.string().trim().min(6).max(40).optional().nullable(),
  photo_count: z.string().trim().max(80).nullable().optional(),
  video_duration: z.string().trim().max(80).nullable().optional(),
  outfit: z.string().trim().max(500).nullable().optional(),
  colleague: z.string().trim().max(200).nullable().optional(),
  message: z.string().trim().min(5).max(2000),
  age_confirmed: z.literal(true),
});

export const submitCustomRequest = createServerFn({ method: "POST" })
  .inputValidator((d) => customInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const combinedMessage = [
      "[CUSTOM ANFRAGE]",
      data.photo_count ? `Anzahl Bilder: ${data.photo_count}` : null,
      data.video_duration ? `Dauer Video: ${data.video_duration}` : null,
      data.outfit ? `Outfitwunsch: ${data.outfit}` : null,
      data.colleague ? `Mit Kollegin: ${data.colleague}` : null,
      "",
      "Wunschvorstellung:",
      data.message,
    ].filter(Boolean).join("\n");

    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        slot_id: null,
        guest_name: data.guest_name,
        guest_email: data.guest_email,
        guest_phone: data.guest_phone ?? null,
        duration: "Custom Content",
        message: combinedMessage,
      })
      .select("id")
      .single();

    if (error || !row) {
      console.error("Failed to insert custom request", error);
      throw new Error("Anfrage konnte nicht gespeichert werden. Bitte versuche es später erneut.");
    }

    try {
      const { enqueueTransactionalEmail } = await import("@/lib/email/enqueue.server");
      const guestData = {
        guestName: data.guest_name,
        wishDate: "Custom Content Anfrage",
        duration: [
          data.photo_count ? `${data.photo_count} Bilder` : null,
          data.video_duration ? `Video ${data.video_duration}` : null,
        ].filter(Boolean).join(" · ") || "Custom Content",
        message: combinedMessage,
      };
      await Promise.all([
        enqueueTransactionalEmail({
          templateName: "booking-confirmation",
          recipientEmail: data.guest_email,
          templateData: guestData,
          idempotencyKey: `custom-confirm-${row.id}`,
        }),
        enqueueTransactionalEmail({
          templateName: "booking-notification",
          recipientEmail: "info@herzblutmadl.com",
          templateData: { type: "Custom Content", ...guestData, guestEmail: data.guest_email, bookingId: row.id },
          idempotencyKey: `custom-notify-${row.id}`,
        }),
      ]);
    } catch (err) {
      console.error("Failed to enqueue custom request emails", err);
    }

    return { id: row.id };
  });
