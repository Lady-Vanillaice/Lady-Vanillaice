import webpush from "web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type NewBookingPush = {
  bookingId: string;
  guestName: string;
  requestedStart?: string | null;
};

export async function sendNewBookingPush(data: NewBookingPush) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:info@herzblutmadl.com";
  if (!publicKey || !privateKey) {
    console.warn("Push notification skipped: VAPID keys are not configured.");
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const { data: subscriptions, error } = await (supabaseAdmin as any)
    .from("admin_push_subscriptions")
    .select("endpoint, p256dh, auth");
  if (error) throw error;

  const when = data.requestedStart
    ? new Date(data.requestedStart).toLocaleString("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Berlin",
      })
    : null;
  const payload = JSON.stringify({
    title: "Neue Buchungsanfrage",
    body: `${data.guestName}${when ? ` · ${when}` : ""}`,
    url: `/admin/buchung/${data.bookingId}`,
    tag: `booking-${data.bookingId}`,
  });

  await Promise.allSettled(
    (subscriptions ?? []).map(async (row: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          payload,
        );
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await (supabaseAdmin as any)
            .from("admin_push_subscriptions")
            .delete()
            .eq("endpoint", row.endpoint);
          return;
        }
        throw error;
      }
    }),
  );
}

