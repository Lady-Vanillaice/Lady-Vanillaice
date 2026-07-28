import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const whatsappBookingInput = z.object({
  guest_name: z.string().trim().min(1).max(120),
  guest_email: z.string().trim().email().max(255),
  guest_phone: z.string().trim().max(40).optional().nullable(),
  requested_start: z.string().optional().nullable(),
  requested_end: z.string().optional().nullable(),
  message: z.string().trim().max(3000).optional().nullable(),
});

function formatDate(value?: string | null) {
  if (!value) return "noch offen";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
}

function formatTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

export const sendBookingWhatsApp = createServerFn({ method: "POST" })
  .inputValidator((data) => whatsappBookingInput.parse(data))
  .handler(async ({ data }) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;
    const to = process.env.TWILIO_WHATSAPP_TO;

    if (!accountSid || !authToken || !from || !to) {
      console.warn("Twilio WhatsApp environment variables are incomplete.");
      return { sent: false, reason: "not_configured" } as const;
    }

    const startTime = formatTime(data.requested_start);
    const endTime = formatTime(data.requested_end);
    const timeLine = startTime
      ? `${startTime}${endTime ? `–${endTime}` : ""}`
      : "noch offen";

    const body = [
      "🔔 Neue Buchungsanfrage",
      `👤 ${data.guest_name}`,
      `📅 ${formatDate(data.requested_start)}`,
      `🕐 ${timeLine}`,
      `📞 ${data.guest_phone?.trim() || "nicht angegeben"}`,
      `📧 ${data.guest_email}`,
      "",
      "Text aus dem Buchungsformular:",
      data.message?.trim() || "Kein zusätzlicher Text.",
    ].join("\n");

    const form = new URLSearchParams({ From: from, To: to, Body: body });
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Twilio WhatsApp notification failed", response.status, errorText);
      return { sent: false, reason: "twilio_error" } as const;
    }

    return { sent: true } as const;
  });
