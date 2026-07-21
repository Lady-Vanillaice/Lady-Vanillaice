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
  last_booking_at: string | null;
  note: {
    id: string;
    pseudonym: string | null;
    phone: string | null;
    vorlieben: string | null;
    tabus: string | null;
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
      .select("guest_name, guest_email, guest_phone, requested_start, created_at, status")
      .eq("status", "confirmed")
      .order("created_at", { ascending: false });
    if (bErr) throw new Error(bErr.message);

    const map = new Map<string, CustomerRow>();
    for (const b of bookings ?? []) {
      const rawEmail = (b.guest_email ?? "").trim();
      if (!rawEmail) continue;
      const key = rawEmail.toLowerCase();
      const existing = map.get(key);
      const when = b.requested_start ?? b.created_at ?? null;
      if (existing) {
        if (b.guest_name && !existing.names.includes(b.guest_name)) existing.names.push(b.guest_name);
        if (b.guest_phone && !existing.phones.includes(b.guest_phone)) existing.phones.push(b.guest_phone);
        existing.bookings_count += 1;
        if (when && (!existing.last_booking_at || when > existing.last_booking_at)) {
          existing.last_booking_at = when;
        }
      } else {
        map.set(key, {
          email: rawEmail,
          names: b.guest_name ? [b.guest_name] : [],
          phones: b.guest_phone ? [b.guest_phone] : [],
          bookings_count: 1,
          last_booking_at: when,
          note: null,
        });
      }
    }

    const { data: notes, error: nErr } = await context.supabase
      .from("customer_notes")
      .select("id, email, pseudonym, phone, vorlieben, tabus, admin_note, updated_at");
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
          last_booking_at: null,
          note: noteData,
        });
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
