import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AdminSearchResult = {
  key: string;
  kind: "Kunde" | "Zahlung" | "Buchung" | "Custom" | "Content-Dreh" | "Newsletter" | "Erfahrungsbericht";
  title: string;
  subtitle: string;
  href: string;
  date: string | null;
};

const norm = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase("de-DE");
const hit = (query: string, ...values: unknown[]) => values.some((value) => norm(value).includes(query));

function createAuthedClient(token: string) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase ist nicht konfiguriert.");
  return createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const Route = createFileRoute("/api/admin/search")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization") ?? "";
          if (!auth.startsWith("Bearer ")) return Response.json({ error: "Unauthorized" }, { status: 401 });
          const token = auth.slice(7).trim();
          const db = createAuthedClient(token);

          const { data: claims, error: claimsError } = await db.auth.getClaims(token);
          const userId = claims?.claims?.sub;
          if (claimsError || !userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

          const { data: adminRole, error: roleError } = await db
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .eq("role", "admin")
            .maybeSingle();
          if (roleError) throw roleError;
          if (!adminRole) return Response.json({ error: "Forbidden" }, { status: 403 });

          const body = await request.json().catch(() => ({}));
          const query = norm((body as { query?: unknown }).query);
          if (query.length < 2 || query.length > 120) {
            return Response.json({ error: "Ungültige Suche" }, { status: 400 });
          }

          const anyDb = db as any;
          const [bookingsRes, cashRes, notesRes, newsletterRes, testimonialRes] = await Promise.all([
            anyDb.from("bookings").select("id, guest_name, guest_email, guest_phone, duration, message, status, anzahlung, anzahlung_method, anzahlung_paid_at, bar, cash_received_at, requested_start, created_at").order("created_at", { ascending: false }).limit(1000),
            anyDb.from("cash_book_entries").select("id, kunde, studio, datum, anzahlung, anzahlung_method, bar, notiz, created_at").order("created_at", { ascending: false }).limit(1000),
            anyDb.from("customer_notes").select("id, email, pseudonym, phone, admin_note, vorlieben, tabus, updated_at").order("updated_at", { ascending: false }).limit(1000),
            anyDb.from("newsletter_subscribers").select("id, email, name, status, consent_source, created_at").order("created_at", { ascending: false }).limit(1000),
            anyDb.from("testimonials").select("id, pseudonym, text, status, created_at").order("created_at", { ascending: false }).limit(1000),
          ]);
          for (const result of [bookingsRes, cashRes, notesRes, newsletterRes, testimonialRes]) {
            if (result.error) throw result.error;
          }

          const results: AdminSearchResult[] = [];

          for (const booking of bookingsRes.data ?? []) {
            if (!hit(query, booking.guest_name, booking.guest_email, booking.guest_phone, booking.duration, booking.message, booking.status)) continue;
            const duration = String(booking.duration ?? "");
            const isCustom = duration === "Custom Content" || String(booking.message ?? "").includes("[CUSTOM ANFRAGE]");
            const isContent = duration === "Content Dreh" || String(booking.message ?? "").includes("[CONTENT DREH ANFRAGE]");
            const kind: AdminSearchResult["kind"] = isCustom ? "Custom" : isContent ? "Content-Dreh" : "Buchung";
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

          return Response.json(
            results.sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? ""))).slice(0, 60),
          );
        } catch (error) {
          console.error("[admin-search]", error);
          return Response.json({ error: error instanceof Error ? error.message : "Suche fehlgeschlagen" }, { status: 500 });
        }
      },
    },
  },
});
