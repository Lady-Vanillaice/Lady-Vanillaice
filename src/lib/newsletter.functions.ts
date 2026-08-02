import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SITE_URL = "https://lady-vanillaice.com";
const esc = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function ensureAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export async function requestNewsletterOptIn(name: string, email: string, source = "booking_form") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const normalized = email.trim().toLowerCase();
  const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
  const { error } = await supabaseAdmin.from("newsletter_subscribers").upsert({
    email: normalized, name: name.trim() || null, status: "pending", confirmation_token: token,
    consent_source: source, consent_requested_at: new Date().toISOString(), confirmed_at: null,
    unsubscribed_at: null, updated_at: new Date().toISOString(),
  }, { onConflict: "email" });
  if (error) throw new Error(error.message);
  const { deliverEmailNow } = await import("@/lib/email/deliver.server");
  const url = `${SITE_URL}/newsletter-bestaetigen?token=${encodeURIComponent(token)}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1b1714"><h1>Neue Termine von Lady Vanilla Ice</h1><p>Hallo ${esc(name || "")},</p><p>bitte bestätige, dass Du per E-Mail über neue verfügbare Termine informiert werden möchtest.</p><p><a href="${url}" style="display:inline-block;background:#c9a96e;color:#111;padding:14px 22px;text-decoration:none">E-Mail-Anmeldung bestätigen</a></p><p>Wenn Du Dich nicht angemeldet hast, ignoriere diese Nachricht.</p></div>`;
  const result = await deliverEmailNow({ to: normalized, subject: "Bitte bestätige Deine E-Mail-Anmeldung", html, text: `Bitte bestätige Deine Anmeldung: ${url}`, idempotencyKey: `newsletter-optin-${normalized}-${token}` });
  if (!result.configured || !result.success) throw new Error("Bestätigungs-E-Mail konnte nicht versendet werden.");
}

export const confirmNewsletter = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(20).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("newsletter_subscribers").update({ status: "confirmed", confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("confirmation_token", data.token).select("id").maybeSingle();
    if (error || !row) throw new Error("Bestätigungslink ist ungültig.");
    return { ok: true };
  });

export const listNewsletterSubscribers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await ensureAdmin(context.supabase, context.userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("newsletter_subscribers").select("id,email,name,status,consent_source,consent_requested_at,confirmed_at,unsubscribed_at").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const sendNewsletter = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ subject: z.string().trim().min(3).max(140), message: z.string().trim().min(10).max(5000) }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: subscribers, error }, { data: suppressed }] = await Promise.all([
      supabaseAdmin.from("newsletter_subscribers").select("email,name").eq("status", "confirmed").limit(500),
      supabaseAdmin.from("suppressed_emails").select("email"),
    ]);
    if (error) throw new Error(error.message);
    const blocked = new Set((suppressed ?? []).map((r: any) => String(r.email).toLowerCase()));
    let sent = 0, failed = 0;
    const { deliverEmailNow } = await import("@/lib/email/deliver.server");
    for (const recipient of subscribers ?? []) {
      const email = String(recipient.email).toLowerCase();
      if (blocked.has(email)) continue;
      let { data: tokenRow } = await supabaseAdmin.from("email_unsubscribe_tokens").select("token").eq("email", email).maybeSingle();
      if (!tokenRow) {
        const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
        await supabaseAdmin.from("email_unsubscribe_tokens").insert({ email, token });
        tokenRow = { token };
      }
      const unsubscribe = `${SITE_URL}/unsubscribe?token=${encodeURIComponent(tokenRow.token)}`;
      const body = esc(data.message).replaceAll("\n", "<br>");
      const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#1b1714"><p>Hallo ${esc(recipient.name || "")},</p><div style="line-height:1.7">${body}</div><hr style="margin-top:30px;border:0;border-top:1px solid #ddd"><p style="font-size:12px;color:#777">Du erhältst diese Nachricht, weil Du den Termin-Newsletter bestätigt hast. <a href="${unsubscribe}">Abmelden</a></p></div>`;
      const result = await deliverEmailNow({ to: email, subject: data.subject, html, text: `${data.message}\n\nAbmelden: ${unsubscribe}`, idempotencyKey: `newsletter-${Date.now()}-${email}` });
      await supabaseAdmin.from("email_send_log").insert({ message_id: crypto.randomUUID(), template_name: "newsletter", recipient_email: email, status: result.configured && result.success ? "sent" : "failed", error_message: result.configured && !result.success ? result.reason : !result.configured ? "Kein E-Mail-Anbieter konfiguriert" : null, metadata: { subject: data.subject } });
      if (result.configured && result.success) sent++; else failed++;
    }
    return { sent, failed };
  });
