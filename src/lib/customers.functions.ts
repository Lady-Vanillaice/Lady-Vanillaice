import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export type CustomerRow = {
  email: string;
  names: string[];
  phones: string[];
  bookings_count: number;
  visits_count: number;
  last_booking_at: string | null;
  testimonial: {
    id: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
  } | null;
  booking_profile: {
    vorlieben: string | null;
    tabus: string | null;
    gesundheit: string | null;
    safeword: string | null;
  };
  note: {
    id: string;
    pseudonym: string | null;
    phone: string | null;
    vorlieben: string | null;
    tabus: string | null;
    gesundheit: string | null;
    safeword: string | null;
    admin_note: string | null;
    updated_at: string;
  } | null;
};

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CustomerRow[]> => {
    await assertAdmin(context);

    const { data: bookings, error: bErr } = await context.supabase
      .from("bookings")
      .select("guest_name, guest_email, guest_phone, requested_start, created_at, status, message, completed_at, fully_paid, cash_received_at")
      .eq("status", "confirmed")
      .order("created_at", { ascending: false });
    if (bErr) throw new Error(bErr.message);

    const map = new Map<string, CustomerRow>();
    const now = Date.now();
    const normalizeName = (value: string) => value.trim().toLocaleLowerCase("de-DE");
    const extractSection = (message: string | null, labels: string[]) => {
      if (!message) return null;
      const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const match = message.match(
        new RegExp(`(?:^|\\n)(?:${escaped.join("|")}):\\s*\\n([^]*?)(?=\\n\\n(?:[^\\n]+):\\s*\\n|\\n\\n—|$)`, "i"),
      );
      return match?.[1]?.trim() || null;
    };
    for (const b of bookings ?? []) {
      // Die Kundenliste enthält ausschließlich tatsächlich abgeschlossene
      // Sessions – dieselbe Grundlage, auf der das Kassenbuch den Termin als
      // erledigt behandelt.
      if (!b.completed_at && !b.fully_paid && !b.cash_received_at) continue;
      const rawEmail = (b.guest_email ?? "").trim();
      if (!rawEmail) continue;
      const key = rawEmail.toLowerCase();
      const existing = map.get(key);
      const when = b.requested_start ?? b.created_at ?? null;
      const isPastVisit = !!when && new Date(when).getTime() <= now;
      const profile = {
        vorlieben: extractSection(b.message, ["Vorlieben & Wünsche", "Vorlieben"]),
        tabus: extractSection(b.message, ["Tabus & Grenzen", "Tabus"]),
        gesundheit: extractSection(b.message, ["Gesundheitliche Hinweise"]),
        safeword: extractSection(b.message, ["Safeword"]),
      };
      if (existing) {
        if (b.guest_name && !existing.names.includes(b.guest_name)) existing.names.push(b.guest_name);
        if (b.guest_phone && !existing.phones.includes(b.guest_phone)) existing.phones.push(b.guest_phone);
        existing.bookings_count += 1;
        if (isPastVisit) existing.visits_count += 1;
        for (const key of Object.keys(profile) as Array<keyof typeof profile>) {
          if (!existing.booking_profile[key] && profile[key]) existing.booking_profile[key] = profile[key];
        }
        if (when && (!existing.last_booking_at || when > existing.last_booking_at)) {
          existing.last_booking_at = when;
        }
      } else {
        map.set(key, {
          email: rawEmail,
          names: b.guest_name ? [b.guest_name] : [],
          phones: b.guest_phone ? [b.guest_phone] : [],
          bookings_count: 1,
          visits_count: isPastVisit ? 1 : 0,
          last_booking_at: when,
          testimonial: null,
          booking_profile: profile,
          note: null,
        });
      }
    }

    // Manuelle bzw. beim Löschen archivierte Kassenbucheinträge besitzen
    // keine Buchungszeile mehr. Ihre Kundennamen bleiben trotzdem dauerhaft
    // für die Kundensuche verfügbar.
    const { data: cashbookRows, error: cErr } = await context.supabase
      .from("cash_book_entries")
      .select("id, kunde, datum, notiz, created_at")
      .neq("kunde", "Studiomiete")
      .order("datum", { ascending: false });
    if (cErr) throw new Error(cErr.message);

    for (const row of cashbookRows ?? []) {
      const name = String(row.kunde ?? "").trim();
      if (!name) continue;
      const existing = Array.from(map.values()).find((customer) =>
        [customer.note?.pseudonym, ...customer.names]
          .filter(Boolean)
          .some((candidate) => normalizeName(String(candidate)) === normalizeName(name)),
      );
      const when = row.datum ?? row.created_at ?? null;
      if (existing) {
        if (!existing.names.includes(name)) existing.names.push(name);
        existing.bookings_count += 1;
        existing.visits_count += 1;
        if (when && (!existing.last_booking_at || when > existing.last_booking_at)) existing.last_booking_at = when;
        continue;
      }
      map.set(`cashbook:${row.id}`, {
        email: `cashbook+${row.id}@intern.local`,
        names: [name],
        phones: [],
        bookings_count: 1,
        visits_count: 1,
        last_booking_at: when,
        testimonial: null,
        booking_profile: { vorlieben: null, tabus: null, gesundheit: null, safeword: null },
        note: row.notiz ? {
          id: row.id,
          pseudonym: name,
          phone: null,
          vorlieben: null,
          tabus: null,
          gesundheit: null,
          safeword: null,
          admin_note: row.notiz,
          updated_at: row.created_at,
        } : null,
      });
    }

    const { data: notes, error: nErr } = await context.supabase
      .from("customer_notes")
      .select("id, email, pseudonym, phone, vorlieben, tabus, gesundheit, safeword, admin_note, updated_at");
    if (nErr) throw new Error(nErr.message);

    for (const n of notes ?? []) {
      const key = (n.email ?? "").toLowerCase();
      if (!key) continue;
      const existing = map.get(key);
      const noteData = {
        id: n.id,
        pseudonym: n.pseudonym,
        phone: n.phone,
        vorlieben: n.vorlieben,
        tabus: n.tabus,
        gesundheit: n.gesundheit,
        safeword: n.safeword,
        admin_note: n.admin_note,
        updated_at: n.updated_at,
      };
      if (existing) {
        existing.note = noteData;
      } else {
        map.set(key, {
          email: n.email,
          names: [],
          phones: n.phone ? [n.phone] : [],
          bookings_count: 0,
          visits_count: 0,
          last_booking_at: null,
          testimonial: null,
          booking_profile: { vorlieben: null, tabus: null, gesundheit: null, safeword: null },
          note: noteData,
        });
      }
    }

    const { data: testimonials, error: tErr } = await context.supabase
      .from("testimonials")
      .select("id, pseudonym, status, created_at")
      .order("created_at", { ascending: false });
    if (tErr) throw new Error(tErr.message);

    const normalize = (value: string) => value.trim().toLocaleLowerCase("de-DE");
    for (const customer of map.values()) {
      const identities = new Set(
        [customer.note?.pseudonym, ...customer.names].filter(Boolean).map((value) => normalize(String(value))),
      );
      const match = (testimonials ?? []).find((item) => item.pseudonym && identities.has(normalize(item.pseudonym)));
      if (match) {
        customer.testimonial = {
          id: match.id,
          status: match.status as "pending" | "approved" | "rejected",
          created_at: match.created_at,
        };
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const aT = a.last_booking_at ?? "";
      const bT = b.last_booking_at ?? "";
      return bT.localeCompare(aT);
    });
  });

export const upsertCustomerNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        pseudonym: z.string().trim().max(200).optional().nullable(),
        phone: z.string().trim().max(50).optional().nullable(),
        vorlieben: z.string().trim().max(4000).optional().nullable(),
        tabus: z.string().trim().max(4000).optional().nullable(),
        gesundheit: z.string().trim().max(4000).optional().nullable(),
        safeword: z.string().trim().max(200).optional().nullable(),
        admin_note: z.string().trim().max(4000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const emailLower = data.email.toLowerCase();

    const { data: existing } = await context.supabase
      .from("customer_notes")
      .select("id")
      .ilike("email", emailLower)
      .maybeSingle();

    const payload = {
      email: emailLower,
      pseudonym: data.pseudonym ?? null,
      phone: data.phone ?? null,
      vorlieben: data.vorlieben ?? null,
      tabus: data.tabus ?? null,
      gesundheit: data.gesundheit ?? null,
      safeword: data.safeword ?? null,
      admin_note: data.admin_note ?? null,
    };

    if (existing?.id) {
      const { error } = await context.supabase
        .from("customer_notes")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: existing.id };
    }

    const { data: inserted, error } = await context.supabase
      .from("customer_notes")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id };
  });

export const deleteCustomerNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("customer_notes")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
