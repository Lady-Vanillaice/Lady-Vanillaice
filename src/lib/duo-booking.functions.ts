import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const duoInput = z.object({
  guest_name: z.string().trim().min(1).max(120),
  guest_email: z.string().trim().email().max(255),
  requested_start: z.string().min(1).max(80),
  duration: z.string().trim().max(80).nullable().optional(),
  message: z.string().trim().min(5).max(2000),
  age_confirmed: z.literal(true),
});

export const submitDuoBooking = createServerFn({ method: "POST" })
  .inputValidator((d) => duoInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const combinedMessage = [
      "[DUO SESSION ANFRAGE]",
      `Wunschtermin: ${data.requested_start}`,
      data.duration ? `Dauer: ${data.duration}` : null,
      "",
      "Wünsche:",
      data.message,
    ].filter(Boolean).join("\n");

    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        slot_id: null,
        guest_name: data.guest_name,
        guest_email: data.guest_email,
        duration: data.duration ?? "Duo Session",
        message: combinedMessage,
      })
      .select("id")
      .single();

    if (error || !row) {
      console.error("Failed to insert duo booking", error);
      throw new Error("Anfrage konnte nicht gespeichert werden. Bitte versuche es später erneut.");
    }

    try {
      const { enqueueTransactionalEmail } = await import("@/lib/email/enqueue.server");
      const guestData = {
        guestName: data.guest_name,
        wishDate: data.requested_start,
        duration: data.duration ?? "Duo Session",
        message: data.message,
      };
      await Promise.all([
        enqueueTransactionalEmail({
          templateName: "booking-confirmation",
          recipientEmail: data.guest_email,
          templateData: guestData,
          idempotencyKey: `duo-confirm-${row.id}`,
        }),
        enqueueTransactionalEmail({
          templateName: "booking-notification",
          recipientEmail: "info@herzblutmadl.com",
          templateData: { type: "Duo Session", ...guestData, guestEmail: data.guest_email, bookingId: row.id },
          idempotencyKey: `duo-notify-${row.id}`,
        }),
      ]);
    } catch (err) {
      console.error("Failed to enqueue duo booking emails", err);
    }

    return { id: row.id };
  });
