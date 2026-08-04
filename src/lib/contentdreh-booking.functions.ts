import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

const input = z.object({
  guest_name: z.string().trim().min(1).max(120),
  guest_email: z.string().trim().email().max(255),
  guest_phone: z.string().trim().min(6).max(40).optional().nullable(),
  requested_start: z.string().min(1).max(80),
  mask: z.string().trim().max(40).nullable().optional(),
  message: z.string().trim().min(5).max(2000),
  age_confirmed: z.literal(true),
  terms_confirmed: z.literal(true),
  photo: z
    .object({
      filename: z.string().trim().min(1).max(200),
      content_type: z.enum(ALLOWED_IMAGE_TYPES),
      data_base64: z.string().min(1).max(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 1024),
      description: z.string().trim().max(500).optional().default(""),
    })
    .nullable()
    .optional(),
});

export const submitContentdrehBooking = createServerFn({ method: "POST" })
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Handle optional photo upload
    let uploadedPath: string | null = null;
    if (data.photo) {
      const buffer = Buffer.from(data.photo.data_base64, "base64");
      if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
        throw new Error("Bild ist zu groß oder ungültig (max. 8 MB).");
      }
      const ext = (data.photo.filename.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
      const path = `${new Date().toISOString().slice(0, 10)}/${safeName}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("contentdreh-uploads")
        .upload(path, buffer, { contentType: data.photo.content_type, upsert: false });
      if (upErr) {
        console.error("Failed to upload contentdreh photo", upErr);
        throw new Error("Foto konnte nicht hochgeladen werden. Bitte versuche es später erneut.");
      }
      uploadedPath = path;
    }

    const combinedMessage = [
      "[CONTENT DREH ANFRAGE]",
      `Wunschzeitraum: ${data.requested_start}`,
      data.mask ? `Maske: ${data.mask}` : null,
      "Personalien & Vertrag: bestätigt",
      uploadedPath ? `Foto: contentdreh-uploads/${uploadedPath}` : null,
      uploadedPath && data.photo?.description ? `Foto-Beschreibung: ${data.photo.description}` : null,
      "",
      "Nachricht:",
      data.message,
    ].filter(Boolean).join("\n");

    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        slot_id: null,
        guest_name: data.guest_name,
        guest_email: data.guest_email,
        guest_phone: data.guest_phone ?? null,
        duration: "Content Dreh",
        message: combinedMessage,
      })
      .select("id")
      .single();

    if (error || !row) {
      console.error("Failed to insert contentdreh booking", error);
      throw new Error("Anfrage konnte nicht gespeichert werden. Bitte versuche es später erneut.");
    }

    try {
      const { enqueueTransactionalEmail } = await import("@/lib/email/enqueue.server");
      const guestData = {
        guestName: data.guest_name,
        wishDate: data.requested_start,
        duration: "Content Dreh",
        message: data.message,
      };
      await Promise.all([
        enqueueTransactionalEmail({
          templateName: "booking-confirmation",
          recipientEmail: data.guest_email,
          templateData: guestData,
          idempotencyKey: `contentdreh-confirm-${row.id}`,
        }),
        enqueueTransactionalEmail({
          templateName: "booking-notification",
          recipientEmail: "info@herzblutmadl.com",
          templateData: { type: "Content Dreh", ...guestData, guestEmail: data.guest_email, bookingId: row.id },
          idempotencyKey: `contentdreh-notify-${row.id}`,
        }),
      ]);
    } catch (err) {
      console.error("Failed to enqueue contentdreh booking emails", err);
    }

    return { id: row.id };
  });
