import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type AdminSearchResult = {
  key: string;
  kind: "Kunde" | "Zahlung" | "Buchung" | "Custom" | "Content-Dreh" | "Newsletter" | "Erfahrungsbericht";
  title: string;
  subtitle: string;
  href: string;
  date: string | null;
};

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

const norm = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase("de-DE");
const hit = (query: string, ...values: unknown[]) => values.some((value) => norm(value).includes(query));

export const searchAdminData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ query: z.string().trim().min(2).max(120) }).parse(value))
  .handler(async ({ data, context }): Promise<AdminSearchResult[]> => {
    await ensureAdmin(context.supabase, context.userId);
    const db = context.supabase as any;
    const query = norm(data.query);

    const [bookingsRes, cashRes, notesRes, newsletterRes, testimonialRes] = await Promise.all([
      db.from("bookings").select("id, guest_name, guest_email, guest_phone, duration, message, status, anzahlung, anzahlung_method, anzahlung_paid_at, bar, cash_received_at, requested_start, created_at").order("created_at", { ascending: false }).limit(1000),
      db.from("cash_book_entries").select("id, kunde, studio, datum, anzahlung, anzahlung_method, bar, notiz, created_at").order("created_at", { ascending: false }).limit(1000),
      db.from("customer_notes").select("id, email, pseudonym, phone, admin_note, vorlieben, tabus, updated_at").order("updated_at", { ascending: false }).limit(1000),
      db.from("newsletter_subscribers").select("id, email, name, status, consent_source, created_at").order("created_at", { ascending: false }).limit(1000),
      db.from("testimonials").select("id, pseudonym, text, status, created_at").order("created_at", { ascending: false }).limit(1000),
    ]);
    for (const result of [bookingsRes, cashRes, notesRes, newsletterRes, testimonialRes]) if (result.error) throw new Error(result.error.message);

    const results: AdminSearchResult[] = [];

    for (const booking of bookingsRes.data ?? []) {
      if (!hit(query, booking.guest_name, booking.guest_email, booking.guest_phone, booking.duration, booking.message, booking.status)) continue;
      const duration = String(booking.duration ?? "");
      const isCustom = duration === "Custom Content" || String(booking.message ?? "").includes("[CUSTOM ANFRAGE]");
      const isContent = duration === "Content Dreh" || String(booking.message ?? "").includes("[CONTENT DREH ANFRAGE]");
      const kind = isCustom ? "Custom" : isContent ? "Content-Dreh" : "Buchung";
      const paymentBits = [
        Number(booking.anzahlung ?? 0) > 0 ? `Anzahlung ${Number(booking.anzahlung).toLocaleString("de-DE")} €` : null,
        Number(booking.bar ?? 0) > 0 ? `Vor Ort ${Number(booking.bar).toLocaleString("de-DE")} €` : null,
      ].filter(Boolean).join(" · ");
      results.push({
        key: `booking:${booking.id}`,
        kind,
        title: booking.guest_name || booking.guest_email || "Buchung",
        subtitle: [booking.guest_email, duration || null, paymentBits || null, booking.status].filter(Boolean).join(" · "),
        href: `/admin/buchung/${booking.id}`,
        date: booking.requested_start ?? booking.created_at ?? null,
      });
    }

    for (const row of cashRes.data ?? []) {
      if (!hit(query, row.kunde, row.studio, row.notiz, row.anzahlung_method)) continue;
      const total = Number(row.anzahlung ?? 0) + Number(row.bar ?? 0);
      results.push({
        key: `cash:${row.id}`,
        kind: "Zahlung",
        title: row.kunde || "Kassenbucheintrag",
        subtitle: [row.studio, total > 0 ? `${total.toLocaleString("de-DE")} €` : null, row.anzahlung_method].filter(Boolean).join(" · "),
        href: "/admin/kassenbuch",
        date: row.datum ?? row.created_at ?? null,
      });
    }

    for (const note of notesRes.data ?? []) {
      if (!hit(query, note.pseudonym, note.email, note.phone, note.admin_note, note.vorlieben, note.tabus)) continue;
      results.push({
        key: `customer:${note.id}`,
        kind: "Kunde",
        title: note.pseudonym || note.email || "Kunde",
        subtitle: [note.email, note.phone, note.admin_note].filter(Boolean).join(" · ").slice(0, 220),
        href: "/admin/kunden",
        date: note.updated_at ?? null,
      });
    }

    for (const subscriber of newsletterRes.data ?? []) {
      if (!hit(query, subscriber.name, subscriber.email, subscriber.status, subscriber.consent_source)) continue;
      results.push({
        key: `newsletter:${subscriber.id}`,
        kind: "Newsletter",
        title: subscriber.name || subscriber.email,
        subtitle: [subscriber.email, subscriber.status].filter(Boolean).join(" · "),
        href: "/admin/newsletter",
        date: subscriber.created_at ?? null,
      });
    }

    for (const testimonial of testimonialRes.data ?? []) {
      if (!hit(query, testimonial.pseudonym, testimonial.text, testimonial.status)) continue;
      results.push({
        key: `testimonial:${testimonial.id}`,
        kind: "Erfahrungsbericht",
        title: testimonial.pseudonym || "Erfahrungsbericht",
        subtitle: [testimonial.status, String(testimonial.text ?? "").slice(0, 150)].filter(Boolean).join(" · "),
        href: "/admin/erfahrungsberichte",
        date: testimonial.created_at ?? null,
      });
    }

    return results.sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? ""))).slice(0, 60);
  });
