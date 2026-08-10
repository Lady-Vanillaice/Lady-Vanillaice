import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { updateBookingStatus, deleteBooking } from "@/lib/booking.functions";
import { createCashBookEntry } from "@/lib/cashbook.functions";
import { updateBookingRestPaymentMethod } from "@/lib/rest-payment.functions";
import { PageHeader } from "@/components/site/PageHeader";
import { BookingCard, type Booking, type Slot } from "@/components/admin/admin-shared";
import { ArrowLeft, Plus, X, CheckCircle2 } from "lucide-react";

type StatusTab = "offen" | "wartend" | "geschlossen";

function statusBucket(b: Booking): StatusTab | null {
  const s = b.status;
  const appointmentIsPast = Boolean(
    b.requested_start && new Date(b.requested_start).getTime() < Date.now(),
  );
  if ((b.message ?? "").includes("[DUO PREISANTWORT AUSSTEHEND]")) return null;
  if (b.completed_at || b.fully_paid || b.cash_received_at) return "geschlossen";
  if (s === "cancelled" || s === "declined") return "geschlossen";
  if ((s === "confirmed" || s === "waiting_deposit") && appointmentIsPast) return "geschlossen";
  if (s === "waiting_deposit") return "wartend";
  if (s === "confirmed") return b.anzahlung_paid || b.deposit_exemption_reason ? null : "wartend";
  // pending / rescheduling / open: älter als 24h → geschlossen, sonst offen
  const ageMs = Date.now() - new Date(b.created_at).getTime();
  if (ageMs > 24 * 60 * 60 * 1000) return "geschlossen";
  return "offen";
}

const TAB_META: Record<StatusTab, { label: string; empty: string }> = {
  offen: { label: "Offen", empty: "Keine offenen Anfragen." },
  wartend: { label: "Wartend", empty: "Keine wartenden Anfragen." },
  geschlossen: { label: "Geschlossen", empty: "Keine geschlossenen Anfragen." },
};

export const Route = createFileRoute("/_authenticated/admin/termine")({
  head: () => ({ meta: [{ title: "Termin-Anfragen — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminTerminePage,
});

function AdminTerminePage() {
  return <BookingsList kind="standard" />;
}

export type BookingKind = "standard" | "custom" | "duo" | "contentdreh";

const KIND_META: Record<BookingKind, { accent: string; rest: string; intro: string; empty: string }> = {
  standard: {
    accent: "Termin",
    rest: "Anfragen",
    intro: "Alle regulären Buchungsanfragen aus dem Kalender.",
    empty: "Keine Termin-Anfragen.",
  },
  custom: {
    accent: "Custom",
    rest: "Anfragen",
    intro: "Anfragen für Custom Content (Bilder, Videos, Outfits).",
    empty: "Keine Custom-Anfragen.",
  },
  duo: {
    accent: "Duo",
    rest: "Anfragen",
    intro: "Anfragen für Duo Sessions.",
    empty: "Keine Duo-Anfragen.",
  },
  contentdreh: {
    accent: "Content Dreh",
    rest: "Anfragen",
    intro: "Anfragen für Content-Dreh-Termine.",
    empty: "Keine Content-Dreh-Anfragen.",
  },
};

function matchKind(b: Booking, kind: BookingKind): boolean {
  const isCustom = b.duration === "Custom Content";
  const isContentdreh = b.duration === "Content Dreh";
  const isDuo = (b.message ?? "").startsWith("[DUO SESSION ANFRAGE]") || b.duration === "Duo Session";
  if (kind === "custom") return isCustom;
  if (kind === "contentdreh") return isContentdreh;
  if (kind === "duo") return isDuo;
  return !isCustom && !isContentdreh && !isDuo;
}

export function BookingsList({ kind }: { kind: BookingKind }) {
  const qc = useQueryClient();
  const updateBookingFn = useServerFn(updateBookingStatus);
  const updateRestPaymentFn = useServerFn(updateBookingRestPaymentMethod);
  const deleteBookingFn = useServerFn(deleteBooking);
  const createCashBookEntryFn = useServerFn(createCashBookEntry);

  const slotsQ = useQuery({
    queryKey: ["admin-slots"],
    queryFn: async (): Promise<Slot[]> => {
      const { data, error } = await supabase
        .from("availability_slots")
        .select(
          "id, starts_at, ends_at, location, is_duo, is_content_shoot, duo_partner, status, availability_slot_admin_meta(internal_note)",
        )
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const meta = row.availability_slot_admin_meta as
          | { internal_note: string | null }
          | { internal_note: string | null }[]
          | null;
        const metaRow = Array.isArray(meta) ? meta[0] ?? null : meta;
        return {
          id: row.id,
          starts_at: row.starts_at,
          ends_at: row.ends_at,
          location: row.location,
          is_duo: row.is_duo,
          is_content_shoot: row.is_content_shoot,
          duo_partner: row.duo_partner,
          status: row.status,
          internal_note: metaRow?.internal_note ?? null,
        } as Slot;
      });
    },
  });

  const bookingsQ = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async (): Promise<Booking[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, slot_id, guest_name, guest_email, guest_phone, duration, duration_minutes, requested_start, message, status, admin_note, anzahlung_paid, deposit_exemption_reason, completed_at, cash_received_at, fully_paid, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
  });

  const statusMut = useMutation({
    mutationFn: async (v: {
      id: string;
      status: Booking["status"];
      decline_reason?: "services_not_offered" | "slot_taken" | "not_yet_offered" | "no_response";
      anzahlung?: number;
      bar?: number;
      confirmation_note?: string;
      anzahlung_method?: string | null;
      anzahlung_paid_at?: string | null;
      restzahlung_method?: string | null;
      deposit_exemption_reason?: "regular_customer" | "trust" | "exception" | "colleague_guarantees" | "spontaneous" | null;
    }) => {
      const { restzahlung_method, ...bookingData } = v;
      await updateBookingFn({ data: bookingData });
      if (restzahlung_method !== undefined) {
        await updateRestPaymentFn({ data: { id: v.id, restzahlung_method } });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-slots"] });
      qc.invalidateQueries({ queryKey: ["cashbook"] });
      qc.invalidateQueries({ queryKey: ["booking-rest-payment-methods"] });
    },
  });

  const deleteBookingMut = useMutation({
    mutationFn: (id: string) => deleteBookingFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-slots"] });
      qc.invalidateQueries({ queryKey: ["cashbook"] });
    },
  });

  const customCashbookMut = useMutation({
    mutationFn: (input: { name: string; wish: string; amount: number }) =>
      createCashBookEntryFn({
        data: {
          studio: "Custom Content",
          datum: new Date().toISOString().slice(0, 10),
          kunde: input.name,
          anzahlung: 0,
          anzahlung_method: null,
          bar: input.amount,
          notiz: input.wish,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cashbook"] }),
  });

  const [fixing, setFixing] = useState<Booking | null>(null);

  const [tab, setTab] = useState<StatusTab>("offen");
  const kindFiltered = (bookingsQ.data ?? []).filter((b) => matchKind(b, kind));
  const counts: Record<StatusTab, number> = { offen: 0, wartend: 0, geschlossen: 0 };
  for (const b of kindFiltered) {
    const bucket = statusBucket(b);
    if (bucket) counts[bucket]++;
  }
  const filtered = kindFiltered.filter((b) => statusBucket(b) === tab);
  const meta = KIND_META[kind];

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title={
          <>
            {meta.accent} <em className="font-script gold-text not-italic">{meta.rest}</em>
          </>
        }
        intro={meta.intro}
      />
      <section className="py-16">
        <div className="container-luxe max-w-3xl">
          <div className="mb-8">
            <Link to="/admin" className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]">
              <ArrowLeft size={12} /> Zum Admin-Bereich
            </Link>
          </div>

          {kind === "custom" && (
            <CustomCashbookForm
              onCreate={(v) => customCashbookMut.mutateAsync(v)}
              pending={customCashbookMut.isPending}
            />
          )}

          <div className="mb-6 flex flex-wrap gap-2">
            {(Object.keys(TAB_META) as StatusTab[]).map((t) => {
              const active = t === tab;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={
                    active
                      ? "btn-gold !py-2 !px-4 !text-[0.65rem]"
                      : "btn-outline-gold !py-2 !px-4 !text-[0.65rem]"
                  }
                >
                  {TAB_META[t].label} ({counts[t]})
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {bookingsQ.isLoading && <p className="text-vanilla/50 text-sm">Lade…</p>}
            {!bookingsQ.isLoading && filtered.length === 0 && (
              <p className="text-vanilla/50 text-sm border border-dashed border-champagne/20 p-6 text-center">
                {TAB_META[tab].empty}
              </p>
            )}
            {filtered.map((b) => {
              const slot = slotsQ.data?.find((s) => s.id === b.slot_id);
              return (
                <BookingCard
                  key={b.id}
                  b={b}
                  slot={slot}
                  pending={statusMut.isPending || deleteBookingMut.isPending}
                  onConfirm={() => setFixing(b)}
                  onDecline={(reason) =>
                    statusMut.mutate({ id: b.id, status: "declined", decline_reason: reason })
                  }
                  onDelete={() => deleteBookingMut.mutate(b.id)}

                />
              );
            })}
          </div>
          {fixing && <FixBookingDialog booking={fixing} pending={statusMut.isPending} onClose={() => setFixing(null)} onSave={(values) => statusMut.mutate({ id: fixing.id, status: "confirmed", ...values }, { onSuccess: () => setFixing(null) })} />}
        </div>
      </section>
    </>
  );
}

const PAYMENT_METHODS = ["Bar", "PayPal", "Überweisung", "Karte", "Sonstige"] as const;

function FixBookingDialog({
  booking,
  pending,
  onClose,
  onSave,
}: {
  booking: Booking;
  pending: boolean;
  onClose: () => void;
  onSave: (values: { anzahlung: number; bar: number; anzahlung_method: string | null; anzahlung_paid_at: string | null; restzahlung_method: string | null; deposit_exemption_reason: "regular_customer" | "trust" | "exception" | "colleague_guarantees" | "spontaneous" | null }) => void;
}) {
  const [total, setTotal] = useState("");
  const [deposit, setDeposit] = useState("");
  const [shortSessionPrice, setShortSessionPrice] = useState("");
  const [depositExemptionReason, setDepositExemptionReason] = useState<"regular_customer" | "trust" | "exception" | "colleague_guarantees" | "spontaneous" | "">("");
  const [depositMethod, setDepositMethod] = useState("Überweisung");
  const [restMethod, setRestMethod] = useState("Bar");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const totalValue = Number(total.replace(",", ".")) || 0;
  const depositValue = Number(deposit.replace(",", ".")) || 0;
  const rest = depositExemptionReason ? totalValue : Math.max(0, totalValue - depositValue);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (totalValue <= 0) return setError("Bitte den Gesamtpreis eintragen.");
    if (!depositExemptionReason && (depositValue <= 0 || depositValue > totalValue)) return setError("Die erhaltene Anzahlung muss größer als 0 € und höchstens so hoch wie der Gesamtpreis sein.");
    if (!depositExemptionReason && (!depositMethod.trim() || !paidAt)) return setError("Bitte Zahlungsart und Eingangsdatum der Anzahlung angeben.");
    if (rest > 0 && !restMethod.trim()) return setError("Bitte die Zahlungsart der Restzahlung angeben.");
    onSave({
      anzahlung: depositExemptionReason ? 0 : depositValue,
      bar: rest,
      anzahlung_method: depositExemptionReason ? null : depositMethod.trim(),
      anzahlung_paid_at: depositExemptionReason ? null : paidAt,
      restzahlung_method: rest > 0 ? restMethod.trim() : null,
      deposit_exemption_reason: depositExemptionReason || null,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-3">
      <form onSubmit={submit} className="w-full max-w-lg bg-card border border-champagne/40 p-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div><div className="eyebrow">Termin fixieren</div><h2 className="font-display text-2xl text-vanilla">{booking.guest_name}</h2></div>
          <button type="button" onClick={onClose} aria-label="Schließen"><X size={20} /></button>
        </div>
        <p className="text-sm text-vanilla/60">Anzahlung und Restzahlung werden getrennt erfasst. Für beide kannst du unabhängig die Zahlungsart auswählen; die Restzahlung muss also nicht automatisch Bar sein.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="space-y-1"><span className="eyebrow block">Kurzsession</span><select value={shortSessionPrice} onChange={(e) => { const value = e.target.value; setShortSessionPrice(value); if (value) setTotal(value); }} className="input-luxe"><option value="">Preis auswählen</option><option value="60">60 €</option><option value="75">75 €</option><option value="100">100 €</option></select></label>
          <label className="space-y-1"><span className="eyebrow block">Anzahlungsregel</span><select value={depositExemptionReason} onChange={(e) => { const value = e.target.value as typeof depositExemptionReason; setDepositExemptionReason(value); if (value) setDeposit("0"); }} className="input-luxe"><option value="">Normale Anzahlung</option><option value="regular_customer">Keine Anzahlung – Stammkunde</option><option value="trust">Keine Anzahlung – Vertrauensbasis</option><option value="exception">Keine Anzahlung – Ausnahme</option><option value="colleague_guarantees">Keine Anzahlung – Kollegin bürgt</option><option value="spontaneous">Keine Anzahlung – Spontaner Termin</option></select></label>
          <label className="space-y-1"><span className="eyebrow block">Gesamtpreis (€)</span><input autoFocus required inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="z. B. 450" className="input-luxe" /></label>
          <label className="space-y-1"><span className="eyebrow block">Anzahlung erhalten (€)</span><input required={!depositExemptionReason} disabled={Boolean(depositExemptionReason)} inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="z. B. 150" className="input-luxe disabled:opacity-40" /></label>
          <label className="space-y-1"><span className="eyebrow block">Zahlungsart Anzahlung</span><select disabled={Boolean(depositExemptionReason)} value={depositMethod} onChange={(e) => setDepositMethod(e.target.value)} className="input-luxe disabled:opacity-40">{PAYMENT_METHODS.map((v) => <option key={v}>{v}</option>)}</select></label>
          <label className="space-y-1"><span className="eyebrow block">Anzahlung eingegangen am</span><input required={!depositExemptionReason} disabled={Boolean(depositExemptionReason)} type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="input-luxe disabled:opacity-40" /></label>
          <div className="space-y-1"><span className="eyebrow block">Restzahlung (€)</span><div className="input-luxe opacity-80">{rest.toLocaleString("de-DE")} €</div></div>
          <label className="space-y-1"><span className="eyebrow block">Zahlungsart Rest / vor Ort</span><select disabled={rest <= 0} value={restMethod} onChange={(e) => setRestMethod(e.target.value)} className="input-luxe disabled:opacity-40">{PAYMENT_METHODS.map((v) => <option key={v}>{v}</option>)}</select></label>
        </div>
        <div className="grid grid-cols-2 gap-3 border border-champagne/25 bg-champagne/[0.05] p-4 text-sm"><div><span className="text-vanilla/50 block">Anzahlung</span><strong>{depositExemptionReason ? "0" : depositValue.toLocaleString("de-DE")} € · {depositExemptionReason ? "entfällt" : depositMethod}</strong></div><div><span className="text-vanilla/50 block">Restzahlung</span><strong>{rest.toLocaleString("de-DE")} €{rest > 0 ? ` · ${restMethod}` : ""}</strong></div></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2"><button type="button" onClick={onClose} className="btn-outline-gold">Abbrechen</button><button disabled={pending} className="btn-gold"><CheckCircle2 size={14} />{pending ? "Wird gespeichert…" : "Termin fixieren"}</button></div>
      </form>
    </div>
  );
}

function CustomCashbookForm({
  onCreate,
  pending,
}: {
  onCreate: (input: { name: string; wish: string; amount: number }) => Promise<unknown>;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  const [wish, setWish] = useState("");
  const [amount, setAmount] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError("");
    const parsedAmount = Number(amount.replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Bitte einen Betrag größer als 0 € eintragen.");
      return;
    }
    try {
      await onCreate({ name: name.trim(), wish: wish.trim(), amount: parsedAmount });
      setName("");
      setWish("");
      setAmount("");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Der Eintrag konnte nicht gespeichert werden.");
    }
  }

  return (
    <details className="mb-6 bg-card border border-champagne/15">
      <summary className="cursor-pointer px-5 py-3 text-sm text-vanilla/80 hover:text-champagne flex items-center gap-2">
        <Plus size={16} className="text-champagne" />
        Custom-Wunsch manuell eintragen
      </summary>
      <form onSubmit={submit} className="p-5 pt-4 border-t border-champagne/10 space-y-4">
        <div>
          <label className="eyebrow block mb-2" htmlFor="custom-customer-name">Name</label>
          <input
            id="custom-customer-name"
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-anthracite/60 border border-champagne/25 px-3 py-2.5 text-vanilla outline-none focus:border-champagne"
            placeholder="Name des Kunden"
          />
        </div>
        <div>
          <label className="eyebrow block mb-2" htmlFor="custom-wish">Gewünschter Inhalt</label>
          <textarea
            id="custom-wish"
            required
            maxLength={2000}
            rows={4}
            value={wish}
            onChange={(e) => setWish(e.target.value)}
            className="w-full bg-anthracite/60 border border-champagne/25 px-3 py-2.5 text-vanilla outline-none focus:border-champagne resize-y"
            placeholder="Was wurde gewünscht?"
          />
        </div>
        <div>
          <label className="eyebrow block mb-2" htmlFor="custom-amount">Betrag (€)</label>
          <input
            id="custom-amount"
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-anthracite/60 border border-champagne/25 px-3 py-2.5 text-vanilla outline-none focus:border-champagne"
            placeholder="z. B. 150,00"
          />
        </div>
        {saved && <p className="text-sm text-green-300">Gespeichert und ins Kassenbuch übernommen.</p>}
        {error && <p className="text-sm text-bordeaux">{error}</p>}
        <button
          type="submit"
          disabled={pending || !name.trim() || !wish.trim() || !amount.trim()}
          className="btn-gold inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Plus size={15} />
          {pending ? "Speichere…" : "Speichern & ins Kassenbuch"}
        </button>
      </form>
    </details>
  );
}