import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Admin bootstrap via a client-callable endpoint has been removed to prevent
// privilege-escalation races. Admin roles must be granted via a migration
// or through the admin access-request approval flow.

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    if (error) {
      return {
        isAdmin: false,
        userId: context.userId,
        email: context.claims?.email ?? null,
        roles: [] as string[],
        reason: `Rollen konnten nicht geladen werden: ${error.message}`,
      };
    }

    const roleList = (roles ?? []).map((r) => r.role as string);
    const isAdmin = roleList.includes("admin");

    // Check whether any admin exists at all — helps explain "first admin" path
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    let reason: string;
    if (isAdmin) {
      reason = "Du bist als Admin freigeschaltet. Lade die Seite neu, falls das Dashboard nicht erscheint.";
    } else if ((count ?? 0) === 0) {
      reason = "Es existiert noch kein Admin. Bitte lasse dich manuell freischalten (per Datenbank-Migration).";
    } else {
      reason = `Dein Konto (${context.claims?.email ?? context.userId}) ist eingeloggt, hat aber keine Admin-Rolle. Es existiert bereits ein anderer Admin – bitte lass dich von dieser Person freischalten.`;
    }

    return {
      isAdmin,
      userId: context.userId,
      email: context.claims?.email ?? null,
      roles: roleList,
      adminCount: count ?? 0,
      reason,
    };
  });

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const getCalendarFeedUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const token = process.env.CALENDAR_FEED_TOKEN;
    if (!token) throw new Error("CALENDAR_FEED_TOKEN nicht gesetzt");
    return { token };
  });

/* ---------- ADMIN: slot management ---------- */

const slotInput = z.object({
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  location: z.string().trim().min(1).max(200),
  is_duo: z.boolean().optional().default(false),
  is_content_shoot: z.boolean().optional().default(false),
  duo_partner: z.string().trim().max(120).optional().nullable(),
  internal_note: z.string().max(500).optional().nullable(),
  buffer_minutes: z.number().int().min(0).max(240).optional(),
  is_hidden: z.boolean().optional().default(false),
});

export const createSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => slotInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("availability_slots")
      .insert({
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        location: data.location,
        is_duo: data.is_duo,
        is_content_shoot: data.is_content_shoot,
        duo_partner: data.is_duo ? (data.duo_partner?.trim() || null) : null,
        is_hidden: data.is_hidden ?? false,
        ...(typeof data.buffer_minutes === "number" ? { buffer_minutes: data.buffer_minutes } : {}),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (row && (data.internal_note || context.userId)) {
      const { error: metaErr } = await context.supabase
        .from("availability_slot_admin_meta")
        .insert({
          slot_id: row.id,
          internal_note: data.internal_note ?? null,
          created_by: context.userId,
        });
      if (metaErr) throw new Error(metaErr.message);
    }

    return row;
  });

export const updateSlotBuffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      buffer_minutes: z.number().int().min(0).max(240),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("availability_slots")
      .update({ buffer_minutes: data.buffer_minutes })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setSlotHidden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      is_hidden: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("availability_slots")
      .update({ is_hidden: data.is_hidden })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("availability_slots")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DECLINE_REASON_TEXTS = {
  services_not_offered:
    "Diese Leistungen biete ich nicht an — bitte suche dir hierfür eine andere Domina.",
  slot_taken:
    "Leider ist der gebuchte Termin bereits belegt — bitte versuche es erneut über meinen Kalender.",
  not_yet_offered:
    "Aktuell zählen diese Praktiken noch nicht zu meinem Gebiet — bitte versuch es in 1–2 Monaten nochmal.",
  no_response:
    "Leider habe ich von dir keine Antwort mehr erhalten — bitte melde dich erneut, falls du weiterhin an einem Termin interessiert bist.",
} as const;

function isBlockingBooking(booking: { id?: string | null; status?: string | null; updated_at?: string | null }) {
  if (booking.status !== "waiting_deposit") return true;
  if (!booking.updated_at) return true;
  return new Date(booking.updated_at).getTime() + 24 * 60 * 60_000 > Date.now();
}

export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "confirmed", "cancelled", "declined", "rescheduling", "waiting_deposit", "open"]),
      admin_note: z.string().max(1000).optional().nullable(),
      confirmation_note: z.string().max(2000).optional().nullable(),
      decline_reason: z
        .enum(["services_not_offered", "slot_taken", "not_yet_offered", "no_response"])
        .optional()
        .nullable(),
      anzahlung: z.number().min(0).max(1_000_000).optional(),
      bar: z.number().min(0).max(1_000_000).optional(),
      deposit_partner_name: z.string().trim().max(120).optional().nullable(),
      deposit_partner_email: z.string().trim().email().max(200).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Fetch booking details before update so we can send a confirmation email.
    const { data: booking, error: fetchErr } = await context.supabase
      .from("bookings")
      .select("id, guest_name, guest_email, duration, slot_id, requested_start, anzahlung_paid, availability_slots(starts_at)")
      .eq("id", data.id)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!booking) throw new Error("Buchung nicht gefunden.");

    const updatePayload: {
      status: typeof data.status;
      admin_note: string | null;
      confirmation_note?: string | null;
      anzahlung?: number;
      bar?: number;
    } = {
      status: data.status,
      admin_note: data.admin_note ?? null,
      confirmation_note: data.confirmation_note ?? null,
    };
    if (data.status === "confirmed" || data.status === "waiting_deposit") {
      if (typeof data.anzahlung === "number") updatePayload.anzahlung = data.anzahlung;
      if (typeof data.bar === "number") updatePayload.bar = data.bar;
    }

    const { error } = await context.supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // A reserved/confirmed booking blocks only its requested hours via the
    // bookings row. The availability window itself stays open so other hours
    // on the same day remain bookable.
    if (booking.slot_id && ["declined", "cancelled", "rescheduling", "open"].includes(data.status)) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: blockers } = await supabaseAdmin
          .from("bookings")
          .select("id, status, updated_at")
          .eq("slot_id", booking.slot_id)
          .in("status", ["pending", "waiting_deposit", "confirmed"]);

        const hasActiveBlocker = (blockers ?? []).some((b) => {
          if (b.status !== "waiting_deposit") return true;
          if (!b.updated_at) return true;
          return new Date(b.updated_at).getTime() + 24 * 60 * 60_000 > Date.now();
        });

        if (!hasActiveBlocker) {
          await supabaseAdmin
            .from("availability_slots")
            .update({ status: "open" })
            .eq("id", booking.slot_id)
            .neq("status", "open");
        }
      } catch (slotErr) {
        console.error("Failed to reopen slot after booking status change", slotErr);
      }
    }

    // Send confirmation / reservation email to the guest.
    if ((data.status === "confirmed" || data.status === "waiting_deposit") && booking.guest_email) {
      try {
        const { enqueueTransactionalEmail } = await import("@/lib/email/enqueue.server");

        const slot = booking.availability_slots as { starts_at?: string } | null;
        const startIso = (booking as { requested_start?: string | null }).requested_start ?? slot?.starts_at ?? null;
        const wishDate = startIso
          ? new Date(startIso).toLocaleString("de-DE", {
              dateStyle: "full",
              timeStyle: "short",
              timeZone: "Europe/Berlin",
            })
          : undefined;

        const anzahlungNum = typeof data.anzahlung === "number" ? data.anzahlung : 0;
        const barNum = typeof data.bar === "number" ? data.bar : 0;
        const totalNum = anzahlungNum + barNum;
        const fmt = (n: number) => `${n.toLocaleString("de-DE")} €`;
        const totalAmount = totalNum > 0 ? fmt(totalNum) : undefined;
        const restAmount = barNum > 0 ? fmt(barNum) : undefined;
        const depositAmount = anzahlungNum > 0 ? fmt(anzahlungNum) : undefined;

        // A reservation is always "deposit pending" — treat confirmed with unpaid deposit the same way.
        const isReservation = data.status === "waiting_deposit";
        const depositPending = isReservation || (anzahlungNum > 0 && !booking.anzahlung_paid);

        await enqueueTransactionalEmail({
          templateName: "booking-confirmed",
          recipientEmail: booking.guest_email,
          templateData: {
            guestName: booking.guest_name ?? undefined,
            wishDate,
            duration: booking.duration ?? undefined,
            totalAmount,
            depositAmount,
            restAmount,
            confirmationNote: data.confirmation_note?.trim() ? data.confirmation_note.trim() : undefined,
            depositPending,
            depositPaid: !isReservation && booking.anzahlung_paid,
            depositPartnerName: data.deposit_partner_name ?? undefined,
            depositPartnerEmail: data.deposit_partner_email ?? undefined,
          },
          idempotencyKey: isReservation
            ? `booking-reserved-${booking.id}`
            : `booking-confirmed-${booking.id}`,
        });
      } catch (err) {
        console.error("Failed to enqueue confirmation/reservation email", err);
      }
    }



    // Send rejection email when declining with a reason.
    if (data.status === "declined" && data.decline_reason && booking.guest_email) {
      try {
        const { enqueueTransactionalEmail } = await import("@/lib/email/enqueue.server");
        const reasonText = DECLINE_REASON_TEXTS[data.decline_reason];
        await enqueueTransactionalEmail({
          templateName: "booking-declined",
          recipientEmail: booking.guest_email,
          templateData: {
            guestName: booking.guest_name ?? undefined,
            reasonText,
          },
          idempotencyKey: `booking-declined-${booking.id}-${data.decline_reason}`,
        });
      } catch (err) {
        console.error("Failed to enqueue declined booking email", err);
      }
    }

    return { ok: true };
  });

export const deleteBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Zuerst den zugehörigen Slot merken.
    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from("bookings")
      .select("id, slot_id")
      .eq("id", data.id)
      .maybeSingle();

    if (fetchErr) {
      throw new Error(fetchErr.message);
    }

    if (!booking) {
      throw new Error("Buchung nicht gefunden.");
    }

    // Buchung endgültig löschen.
    const { error: deleteErr } = await supabaseAdmin
      .from("bookings")
      .delete()
      .eq("id", data.id);

    if (deleteErr) {
      throw new Error(deleteErr.message);
    }

    // Prüfen, ob noch eine andere aktive Buchung denselben Slot verwendet.
    if (booking.slot_id) {
      const { data: remainingBookings, error: remainingErr } =
        await supabaseAdmin
          .from("bookings")
          .select("id")
          .eq("slot_id", booking.slot_id)
          .in("status", ["pending", "waiting_deposit", "confirmed"])
          .limit(1);

      if (remainingErr) {
        throw new Error(remainingErr.message);
      }

      // Nur freigeben, wenn keine andere aktive Buchung mehr existiert.
      if ((remainingBookings ?? []).length === 0) {
        const { error: slotErr } = await supabaseAdmin
          .from("availability_slots")
          .update({
            status: "open",
            is_hidden: false,
          })
          .eq("id", booking.slot_id);

        if (slotErr) {
          throw new Error(
            `Die Buchung wurde gelöscht, aber der Slot konnte nicht freigegeben werden: ${slotErr.message}`,
          );
        }
      }
    }

    return { ok: true };
  });

export const sendPaymentReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);

    const { data: booking, error } = await context.supabase
      .from("bookings")
      .select("id, guest_name, guest_email, duration, requested_start, anzahlung, anzahlung_paid, availability_slots(starts_at)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!booking) throw new Error("Buchung nicht gefunden.");
    if (!booking.guest_email) throw new Error("Keine Email-Adresse hinterlegt.");
    if (booking.anzahlung_paid) throw new Error("Anzahlung ist bereits als bezahlt markiert.");

    const slot = booking.availability_slots as { starts_at?: string } | null;
    const startIso = (booking as { requested_start?: string | null }).requested_start ?? slot?.starts_at ?? null;
    const wishDate = startIso
      ? new Date(startIso).toLocaleString("de-DE", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: "Europe/Berlin",
        })
      : undefined;

    const anzahlungNum = Number(booking.anzahlung) || 0;
    const depositAmount = anzahlungNum > 0
      ? `${anzahlungNum.toLocaleString("de-DE")} €`
      : undefined;

    const { enqueueTransactionalEmail } = await import("@/lib/email/enqueue.server");
    const result = await enqueueTransactionalEmail({
      templateName: "payment-reminder",
      recipientEmail: booking.guest_email,
      templateData: {
        guestName: booking.guest_name ?? undefined,
        wishDate,
        duration: booking.duration ?? undefined,
        depositAmount,
      },
      idempotencyKey: `payment-reminder-${booking.id}-${Date.now()}`,
    });

    if (!result.success) {
      throw new Error(`Email konnte nicht versendet werden: ${result.reason}`);
    }
    return { ok: true };
  });

const fmtEuro = (n: number) => `${n.toLocaleString("de-DE")} €`;

function computePersonalMessageAmounts(
  booking: { duration_minutes: number | null; anzahlung?: number | null; bar?: number | null },
  override: { deposit?: number | null; bar?: number | null },
) {
  const overrideDeposit = typeof override.deposit === "number" && override.deposit > 0 ? override.deposit : null;
  const overrideBar = typeof override.bar === "number" && override.bar >= 0 ? override.bar : null;

  const savedDeposit = Number(booking.anzahlung) > 0 ? Number(booking.anzahlung) : null;
  const savedBar = Number(booking.bar) > 0 ? Number(booking.bar) : null;

  let deposit = overrideDeposit ?? savedDeposit;
  let bar = overrideBar ?? savedBar;

  const minutes = booking.duration_minutes ?? null;
  const durationTotal = minutes ? Math.round((minutes / 60) * 300) : null;

  // Fill missing pieces via fallback logic so we can ALWAYS show a rest amount if possible.
  if (deposit != null && bar == null) {
    // Deposit known, bar unknown → derive bar from duration if we have it, else assume rest = deposit (50/50).
    bar = durationTotal && durationTotal > deposit ? durationTotal - deposit : deposit;
  } else if (bar != null && deposit == null) {
    // Bar known, deposit unknown → derive deposit from duration if we have it, else assume 50/50.
    deposit = durationTotal && durationTotal > bar ? durationTotal - bar : bar;
  } else if (deposit == null && bar == null && durationTotal) {
    // Nothing known but duration → assume 50/50 split.
    deposit = Math.round(durationTotal * 0.5);
    bar = durationTotal - deposit;
  }

  const total = deposit != null && bar != null ? deposit + bar : durationTotal;
  const rest = bar;

  return {
    totalAmount: total ? fmtEuro(total) : undefined,
    depositAmount: deposit ? fmtEuro(deposit) : undefined,
    restAmount: rest != null && rest > 0 ? fmtEuro(rest) : undefined,
  };
}


const personalMessageInput = z.object({
  id: z.string().uuid(),
  message: z.string().max(2000),
  depositOverride: z.number().min(0).max(1_000_000).optional().nullable(),
  barOverride: z.number().min(0).max(1_000_000).optional().nullable(),
  depositPartnerName: z.string().trim().max(120).optional().nullable(),
  depositPartnerEmail: z.string().trim().email().max(200).optional().nullable(),
});

export const sendPersonalMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    personalMessageInput.extend({ message: z.string().trim().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);

    const { data: booking, error } = await context.supabase
      .from("bookings")
      .select("id, guest_name, guest_email, duration, duration_minutes, anzahlung, bar")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!booking) throw new Error("Buchung nicht gefunden.");
    if (!booking.guest_email) throw new Error("Keine Email-Adresse hinterlegt.");

    // Persist the note + any admin-entered deposit/bar so the UI stays in sync.
    const updatePayload: { confirmation_note: string; anzahlung?: number; bar?: number } = {
      confirmation_note: data.message,
    };
    if (typeof data.depositOverride === "number") updatePayload.anzahlung = data.depositOverride;
    if (typeof data.barOverride === "number") updatePayload.bar = data.barOverride;
    await context.supabase.from("bookings").update(updatePayload).eq("id", data.id);

    const amounts = computePersonalMessageAmounts(booking, {
      deposit: data.depositOverride,
      bar: data.barOverride,
    });

    const { enqueueTransactionalEmail } = await import("@/lib/email/enqueue.server");
    const result = await enqueueTransactionalEmail({
      templateName: "personal-message",
      recipientEmail: booking.guest_email,
      templateData: {
        guestName: booking.guest_name ?? undefined,
        message: data.message,
        duration: booking.duration ?? undefined,
        ...amounts,
        depositPartnerName: data.depositPartnerName ?? undefined,
        depositPartnerEmail: data.depositPartnerEmail ?? undefined,
      },
      idempotencyKey: `personal-message-${booking.id}-${Date.now()}`,
    });

    if (!result.success) {
      throw new Error(`Email konnte nicht versendet werden: ${result.reason}`);
    }
    return { ok: true };
  });

export const previewPersonalMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => personalMessageInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);

    const { data: booking, error } = await context.supabase
      .from("bookings")
      .select("guest_name, duration, duration_minutes, anzahlung, bar")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!booking) throw new Error("Buchung nicht gefunden.");

    const amounts = computePersonalMessageAmounts(booking, {
      deposit: data.depositOverride,
      bar: data.barOverride,
    });

    const React = await import("react");
    const { render } = await import("@react-email/components");
    const { TEMPLATES } = await import("@/lib/email-templates/registry");
    const entry = TEMPLATES["personal-message"];
    const html = await render(
      React.createElement(entry.component, {
        guestName: booking.guest_name ?? undefined,
        message: data.message,
        duration: booking.duration ?? undefined,
        ...amounts,
        depositPartnerName: data.depositPartnerName ?? undefined,
        depositPartnerEmail: data.depositPartnerEmail ?? undefined,
      }),
    );
    const subject =
      typeof entry.subject === "function" ? entry.subject({}) : entry.subject;
    return { html, subject };
  });


export const sendContentdrehReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      proposedDate: z.string().trim().min(1).max(200),
      price: z.string().trim().min(1).max(50),
      depositAmount: z.string().trim().max(50).optional().nullable(),
      message: z.string().trim().max(2000).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);

    const { data: booking, error } = await context.supabase
      .from("bookings")
      .select("id, guest_name, guest_email")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!booking) throw new Error("Buchung nicht gefunden.");
    if (!booking.guest_email) throw new Error("Keine Email-Adresse hinterlegt.");

    const { enqueueTransactionalEmail } = await import("@/lib/email/enqueue.server");
    const result = await enqueueTransactionalEmail({
      templateName: "contentdreh-reply",
      recipientEmail: booking.guest_email,
      templateData: {
        guestName: booking.guest_name ?? undefined,
        proposedDate: data.proposedDate,
        price: data.price,
        depositAmount: data.depositAmount || undefined,
        message: data.message || undefined,
      },
      idempotencyKey: `contentdreh-reply-${booking.id}-${Date.now()}`,
    });

    if (!result.success) {
      throw new Error(`Email konnte nicht versendet werden: ${result.reason}`);
    }
    return { ok: true };
  });


export const updateBookingNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      admin_note: z.string().max(2000).nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);

    const { error } = await context.supabase
      .from("bookings")
      .update({ admin_note: data.admin_note?.trim() ? data.admin_note.trim() : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- ADMIN: override schedule (date/time/duration) ---------- */

export const updateBookingSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      requested_start: z.string().datetime().nullable(),
      duration_minutes: z.number().int().min(15).max(24 * 60).nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    let resolvedSlotId: string | undefined;

    if ((data.requested_start && !data.duration_minutes) || (!data.requested_start && data.duration_minutes)) {
      throw new Error("Bitte Datum, Uhrzeit und Dauer gemeinsam ausfüllen.");
    }

    if (data.requested_start && data.duration_minutes) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: booking, error: bookingErr } = await context.supabase
        .from("bookings")
        .select("id, slot_id, status")
        .eq("id", data.id)
        .maybeSingle();
      if (bookingErr) throw new Error(bookingErr.message);
      if (!booking) throw new Error("Buchung nicht gefunden.");

      const requestedStart = new Date(data.requested_start);
      const requestedEnd = new Date(requestedStart.getTime() + data.duration_minutes * 60_000);
      if (!Number.isFinite(requestedStart.getTime())) {
        throw new Error("Bitte gib eine gültige Uhrzeit ein.");
      }

      const dayStart = new Date(requestedStart);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

     // Offene Zeitfenster des gewählten Tages laden
const { data: openDaySlots, error: slotErr } = await supabaseAdmin
  .from("availability_slots")
  .select("id, starts_at, ends_at, buffer_minutes, status, is_hidden")
  .eq("status", "open")
  .eq("is_hidden", false)
  .lt("starts_at", dayEnd.toISOString())
  .gt("ends_at", dayStart.toISOString())
  .order("starts_at", { ascending: true });

if (slotErr) throw new Error(slotErr.message);

// Das bisherige Zeitfenster zusätzlich laden.
// Dadurch kann ein bereits bestätigter Termin weiter bearbeitet werden,
// auch wenn sein Slot inzwischen gebucht oder ausgeblendet ist.
let currentSlot: {
  id: string;
  starts_at: string;
  ends_at: string;
  buffer_minutes: number | null;
  status: string;
  is_hidden: boolean;
} | null = null;

if (booking.slot_id) {
  const { data, error: currentSlotErr } = await supabaseAdmin
    .from("availability_slots")
    .select("id, starts_at, ends_at, buffer_minutes, status, is_hidden")
    .eq("id", booking.slot_id)
    .maybeSingle();

  if (currentSlotErr) throw new Error(currentSlotErr.message);
  currentSlot = data;
}

const daySlots = [...(openDaySlots ?? [])];

if (
  currentSlot &&
  !daySlots.some((slot) => slot.id === currentSlot.id)
) {
  daySlots.push(currentSlot);
}
      const containingSlot = (daySlots ?? []).find((slot) => {
        const slotStart = new Date(slot.starts_at).getTime();
        const slotEnd = new Date(slot.ends_at).getTime();
        return requestedStart.getTime() >= slotStart && requestedEnd.getTime() <= slotEnd;
      });

      if (!containingSlot) {
        throw new Error("Diese Uhrzeit passt nicht in ein sichtbares freies Zeitfenster. Bitte lege zuerst im Kalender ein passendes Zeitfenster an oder wähle eine andere Uhrzeit/Dauer.");
      }

      const slotIds = (daySlots ?? []).map((slot) => slot.id);
      const { data: blockers, error: blockersErr } = await supabaseAdmin
        .from("bookings")
        .select("id, requested_start, duration_minutes, status, updated_at")
        .in("slot_id", slotIds)
        .neq("id", data.id)
        .in("status", ["pending", "waiting_deposit", "confirmed"])
        .not("requested_start", "is", null)
        .not("duration_minutes", "is", null);
      if (blockersErr) throw new Error(blockersErr.message);

      const bufferMs = (containingSlot.buffer_minutes ?? 30) * 60_000;
      const conflicts = (blockers ?? []).some((blocked) => {
        if (!isBlockingBooking(blocked)) return false;
        if (!blocked.requested_start || !blocked.duration_minutes) return false;
        const blockedStart = new Date(blocked.requested_start).getTime() - bufferMs;
        const blockedEnd = new Date(blocked.requested_start).getTime() + blocked.duration_minutes * 60_000 + bufferMs;
        return requestedStart.getTime() < blockedEnd && requestedEnd.getTime() > blockedStart;
      });

      if (conflicts) {
        throw new Error("Diese Uhrzeit überschneidet sich mit einem anderen Termin oder der Pause dazwischen. Bitte wähle eine andere Uhrzeit.");
      }

      if (booking.slot_id !== containingSlot.id) {
        resolvedSlotId = containingSlot.id;
      }
    }

    const { error } = await context.supabase
      .from("bookings")
      .update({
        requested_start: data.requested_start,
        duration_minutes: data.duration_minutes,
        ...(resolvedSlotId ? { slot_id: resolvedSlotId } : {}),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- ADMIN: override payment amounts ---------- */
export const updateBookingType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      booking_type: z.enum(["single", "duo", "content"]),
      duo_partner: z.string().trim().max(120).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);

    const { data: booking, error: bookingErr } = await context.supabase
      .from("bookings")
      .select("id, slot_id")
      .eq("id", data.id)
      .maybeSingle();

    if (bookingErr) throw new Error(bookingErr.message);
    if (!booking) throw new Error("Buchung nicht gefunden.");

    if (!booking.slot_id) {
      throw new Error("Diese Buchung hat keinen verknüpften Termin-Slot.");
    }

    const { error: slotErr } = await context.supabase
      .from("availability_slots")
      .update({
        is_duo: data.booking_type === "duo",
        is_content_shoot: data.booking_type === "content",
        duo_partner:
          data.booking_type === "duo"
            ? data.duo_partner?.trim() || null
            : null,
      })
      .eq("id", booking.slot_id);

    if (slotErr) throw new Error(slotErr.message);

    return { ok: true };
  });
export const updateBookingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      anzahlung: z.number().min(0).max(1_000_000),
      bar: z.number().min(0).max(1_000_000),
      anzahlung_method: z.string().max(100).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const payload: { anzahlung: number; bar: number; anzahlung_method?: string | null } = {
      anzahlung: data.anzahlung,
      bar: data.bar,
    };
    if (data.anzahlung_method !== undefined) {
      const trimmed = data.anzahlung_method?.trim() ?? "";
      payload.anzahlung_method = trimmed.length ? trimmed : null;
    }
    const { error } = await context.supabase
      .from("bookings")
      .update(payload)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- ADMIN: mark deposit as received and send final confirmation ---------- */

export const markDepositPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);

    const { data: booking, error: fetchErr } = await context.supabase
      .from("bookings")
      .select("id, guest_name, guest_email, duration, duration_minutes, requested_start, anzahlung, bar, confirmation_note, availability_slots(starts_at)")
      .eq("id", data.id)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!booking) throw new Error("Buchung nicht gefunden.");
    if (!booking.guest_email) throw new Error("Keine Gast-E-Mail hinterlegt.");

    const anzahlungNum = Number(booking.anzahlung || 0);
    if (anzahlungNum <= 0) {
      throw new Error("Es ist keine Anzahlung hinterlegt, die als eingegangen markiert werden könnte.");
    }

    const { error } = await context.supabase
      .from("bookings")
      .update({ anzahlung_paid: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // Send final confirmation email with rest-amount hint.
    try {
      const { enqueueTransactionalEmail } = await import("@/lib/email/enqueue.server");

      const slot = booking.availability_slots as { starts_at?: string } | null;
      const startIso = (booking as { requested_start?: string | null }).requested_start ?? slot?.starts_at ?? null;
      const wishDate = startIso
        ? new Date(startIso).toLocaleString("de-DE", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "Europe/Berlin",
          })
        : undefined;

      const barExplicit = Number(booking.bar);
      const hasExplicitBar = Number.isFinite(barExplicit) && barExplicit > 0;

      // Fallback: if admin didn't fill "bar", derive rest from duration (300 €/h) - anzahlung.
      let restNum = hasExplicitBar ? barExplicit : 0;
      let totalNum = anzahlungNum + restNum;

      if (!hasExplicitBar && booking.duration_minutes) {
        const computedTotal = Math.round((booking.duration_minutes / 60) * 300);
        if (computedTotal > anzahlungNum) {
          restNum = computedTotal - anzahlungNum;
          totalNum = computedTotal;
        }
      }

      const fmt = (n: number) => `${n.toLocaleString("de-DE")} €`;
      const totalAmount = totalNum > 0 ? fmt(totalNum) : undefined;
      const restAmount = restNum > 0 ? fmt(restNum) : undefined;
      const depositAmount = anzahlungNum > 0 ? fmt(anzahlungNum) : undefined;

      // Include restAmount in idempotency key so a re-send with new bar amount goes through.
      const idemp = `booking-deposit-paid-${booking.id}-${restNum}`;

      await enqueueTransactionalEmail({
        templateName: "booking-confirmed",
        recipientEmail: booking.guest_email,
        templateData: {
          guestName: booking.guest_name ?? undefined,
          wishDate,
          duration: booking.duration ?? undefined,
          totalAmount,
          depositAmount,
          restAmount,
          confirmationNote: booking.confirmation_note?.trim() ? booking.confirmation_note.trim() : undefined,
          depositPending: false,
          depositPaid: true,
        },
        idempotencyKey: idemp,
      });
    } catch (err) {
      console.error("Failed to enqueue deposit-paid email", err);
    }


    return { ok: true };
  });


/* ---------- ADMIN: manual booking (e.g. from Telegram / E-Mail) ---------- */

const manualBookingInput = z.object({
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  location: z.string().trim().min(1).max(200),
  guest_name: z.string().trim().min(1).max(120),
  guest_contact: z.string().trim().max(200).optional().nullable(),
  source: z.string().trim().max(60).optional().nullable(),
  internal_note: z.string().max(1000).optional().nullable(),
  booking_type: z.enum(["single", "duo", "content"]),
  duo_partner: z.string().trim().max(120).optional().nullable(),
});

export const createManualBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => manualBookingInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);

    const startsAt = new Date(data.starts_at);
    const endsAt = new Date(data.ends_at);
    if (!(endsAt > startsAt)) {
      throw new Error("Endzeit muss nach Startzeit liegen.");
    }
    const durationMinutes = Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000);
    if (durationMinutes < 15) {
      throw new Error("Termin muss mindestens 15 Minuten dauern.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Decide guest_email — the DB enforces an email format check.
    const contact = data.guest_contact?.trim() ?? "";
    const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact);
    const guestEmail = isEmail
      ? contact
      : `manuell+${crypto.randomUUID().slice(0, 8)}@intern.local`;
    const contactLine = contact && !isEmail ? `Kontakt: ${contact}\n` : "";
    const sourceLine = data.source ? `Quelle: ${data.source}\n` : "";
    const noteLine = data.internal_note ? `Notiz: ${data.internal_note}\n` : "";
    const message =
      `${sourceLine}${contactLine}${noteLine}Manuell durch Admin eingetragen.`.trim();

    // First check only real blocked/reserved/booked slots. Open availability
    // windows must not block a manual booking; they are resized below.
    const { data: blocking, error: blockingErr } = await supabaseAdmin
      .from("availability_slots")
      .select("id, starts_at, ends_at, status, location")
      .neq("status", "open")
      .lt("starts_at", endsAt.toISOString())
      .gt("ends_at", startsAt.toISOString());
    if (blockingErr) throw new Error(blockingErr.message);
    if (blocking.length > 0) {
      throw new Error(
        "In diesem Zeitraum existiert bereits ein Termin. Bitte zuerst löschen oder andere Zeit wählen.",
      );
    }

    const { data: openOverlaps, error: openOverlapErr } = await supabaseAdmin
      .from("availability_slots")
      .select("id, starts_at, ends_at, status, location, buffer_minutes, is_duo, is_content_shoot, duo_partner, is_hidden")
      .eq("status", "open")
      .lt("starts_at", endsAt.toISOString())
      .gt("ends_at", startsAt.toISOString());
    if (openOverlapErr) throw new Error(openOverlapErr.message);

    for (const s of openOverlaps ?? []) {
      const sStart = new Date(s.starts_at);
      const sEnd = new Date(s.ends_at);
      const leftKeep = sStart < startsAt;
      const rightKeep = sEnd > endsAt;
      if (leftKeep && rightKeep) {
        // Split: shrink existing to left part, insert new right part.
        const { error: updErr } = await supabaseAdmin
          .from("availability_slots")
          .update({ ends_at: startsAt.toISOString() })
          .eq("id", s.id);
        if (updErr) throw new Error(updErr.message);
        const { error: insErr } = await supabaseAdmin
          .from("availability_slots")
          .insert({
            starts_at: endsAt.toISOString(),
            ends_at: s.ends_at,
            location: s.location,
            status: "open",
            buffer_minutes: s.buffer_minutes ?? 30,
            is_duo: s.is_duo ?? false,
            is_content_shoot: s.is_content_shoot ?? false,
            duo_partner: s.is_duo ? s.duo_partner ?? null : null,
            is_hidden: s.is_hidden ?? false,
          });
        if (insErr) throw new Error(insErr.message);
      } else if (leftKeep) {
        const { error: updErr } = await supabaseAdmin
          .from("availability_slots")
          .update({ ends_at: startsAt.toISOString() })
          .eq("id", s.id);
        if (updErr) throw new Error(updErr.message);
      } else if (rightKeep) {
        const { error: updErr } = await supabaseAdmin
          .from("availability_slots")
          .update({ starts_at: endsAt.toISOString() })
          .eq("id", s.id);
        if (updErr) throw new Error(updErr.message);
      } else {
        const { error: delErr } = await supabaseAdmin
          .from("availability_slots")
          .delete()
          .eq("id", s.id);
        if (delErr) throw new Error(delErr.message);
      }
    }

    // 1. Create the slot as already-booked so the calendar hides it.
    const { data: slot, error: slotErr } = await supabaseAdmin
      .from("availability_slots")
    .insert({
  starts_at: data.starts_at,
  ends_at: data.ends_at,
  location: data.location,
  status: "booked",
  is_hidden: true,
  is_duo: data.booking_type === "duo",
  is_content_shoot: data.booking_type === "content",
  duo_partner:
    data.booking_type === "duo"
      ? data.duo_partner?.trim() ?? null
      : null,
})
      .select("id")
      .single();
    if (slotErr || !slot) {
      throw new Error(slotErr?.message ?? "Termin konnte nicht angelegt werden.");
    }

    if (data.internal_note || context.userId) {
      await supabaseAdmin
        .from("availability_slot_admin_meta")
        .insert({
          slot_id: slot.id,
          internal_note: data.internal_note ?? null,
          created_by: context.userId,
        });
    }

    // 2. Create the confirmed booking that fills the whole window.
    const { error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .insert({
        slot_id: slot.id,
        guest_name: data.guest_name,
        guest_email: guestEmail,
        duration:
  data.booking_type === "duo"
    ? "Duo Session"
    : data.booking_type === "content"
      ? "Content Dreh"
      : `${durationMinutes} Minuten`,
        duration_minutes: durationMinutes,
        requested_start: data.starts_at,
        message,
        status: "confirmed",
        admin_note: data.internal_note ?? null,
      });
    if (bookingErr) {
      // Roll back the slot to avoid orphan blocked windows.
      await supabaseAdmin.from("availability_slots").delete().eq("id", slot.id);
      throw new Error(bookingErr.message);
    }

    return { ok: true, slot_id: slot.id };
  });

export const getBookingDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);

    const { data: booking, error } = await context.supabase
      .from("bookings")
      .select(
        "id, slot_id, guest_name, guest_email, guest_phone, duration, duration_minutes, requested_start, message, status, admin_note, confirmation_note, anzahlung, anzahlung_paid, anzahlung_method, bar, created_at, updated_at, availability_slots(starts_at, ends_at, location, is_duo, is_content_shoot, duo_partner)"
      )
      .eq("id", data.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!booking) throw new Error("Buchung nicht gefunden.");

    // Load email log entries related to this booking. We match by suffix on
    // message_id (idempotency keys end with the booking id) and recipient.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Query separately using parameterized filters to avoid PostgREST filter
    // injection via guest-controlled email. Merge results in code.
    const emailCols = "id, message_id, template_name, recipient_email, status, error_message, created_at";
    const [byMsgId, byRecipient] = await Promise.all([
      supabaseAdmin
        .from("email_send_log")
        .select(emailCols)
        .like("message_id", `%${booking.id}`)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("email_send_log")
        .select(emailCols)
        .eq("recipient_email", booking.guest_email)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    const emails = [...(byMsgId.data ?? []), ...(byRecipient.data ?? [])]
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
      .slice(0, 50);

    // Dedup by message_id, keep latest status
    const seen = new Set<string>();
    const dedupedEmails = (emails ?? []).filter((e) => {
      const key = e.message_id ?? e.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Extract optional Content-Dreh photo path from the message and mint a
    // short-lived signed URL so the admin UI can preview the private file.
    let photoUrl: string | null = null;
    let photoPath: string | null = null;
    const match = booking.message?.match(/Foto:\s*contentdreh-uploads\/([^\s\n]+)/);
    if (match?.[1]) {
      photoPath = match[1];
      const { data: signed } = await supabaseAdmin.storage
        .from("contentdreh-uploads")
        .createSignedUrl(photoPath, 60 * 30);
      photoUrl = signed?.signedUrl ?? null;
    }

    return { booking, emails: dedupedEmails, photoUrl, photoPath };
  });


export const previewEmail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ logId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: log, error } = await supabaseAdmin
      .from("email_send_log")
      .select("id, message_id, template_name, recipient_email, status, error_message, created_at, metadata")
      .eq("id", data.logId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!log) throw new Error("Email-Eintrag nicht gefunden.");

    let meta = (log.metadata as Record<string, any> | null) ?? {};
    // Queue processor writes a follow-up row (status=sent) without metadata.
    // Fall back to the earliest row for the same message_id which carries
    // the original template_data + subject.
    if ((!meta.template_data || !meta.subject) && log.message_id) {
      const { data: sibling } = await supabaseAdmin
        .from("email_send_log")
        .select("metadata")
        .eq("message_id", log.message_id)
        .not("metadata", "is", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (sibling?.metadata) meta = sibling.metadata as Record<string, any>;
    }
    const templateData = (meta.template_data as Record<string, any> | undefined) ?? {};

    let subject: string = typeof meta.subject === "string" ? meta.subject : "";
    let html = "";
    let renderError: string | null = null;

    try {
      const React = await import("react");
      const { render } = await import("@react-email/components");
      const { TEMPLATES } = await import("@/lib/email-templates/registry");
      const tpl = TEMPLATES[log.template_name as keyof typeof TEMPLATES];
      if (tpl) {
        const el = React.createElement(tpl.component as any, templateData);
        html = await render(el);
        if (!subject) {
          subject = typeof tpl.subject === "function"
            ? (tpl.subject as (d: any) => string)(templateData)
            : (tpl.subject as string);
        }
      } else {
        renderError = "Vorlage nicht gefunden.";
      }
    } catch (e) {
      renderError = e instanceof Error ? e.message : String(e);
    }

    return {
      id: log.id,
      template_name: log.template_name,
      recipient_email: log.recipient_email,
      status: log.status,
      error_message: log.error_message,
      created_at: log.created_at,
      subject,
      html,
      renderError,
    };
  });
