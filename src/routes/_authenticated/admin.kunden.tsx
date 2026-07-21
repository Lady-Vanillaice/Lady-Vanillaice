import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/site/PageHeader";
import { ArrowLeft, Search, Mail, Phone, User, Save, X } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { listCustomers, upsertCustomerNote, type CustomerRow } from "@/lib/customers.functions";

export const Route = createFileRoute("/_authenticated/admin/kunden")({
  head: () => ({
    meta: [{ title: "Kunden — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminKundenPage,
});

function AdminKundenPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCustomers);
  const upsertFn = useServerFn(upsertCustomerNote);

  const [search, setSearch] = useState("");
  const [openEmail, setOpenEmail] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => listFn(),
  });

  const upsertMut = useMutation({
    mutationFn: (v: {
      email: string;
      pseudonym?: string | null;
      phone?: string | null;
      vorlieben?: string | null;
      tabus?: string | null;
      admin_note?: string | null;
    }) => upsertFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-customers"] }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listQ.data ?? [];
    return (listQ.data ?? []).filter((c) => {
      const hay = [
        c.email,
        c.note?.pseudonym ?? "",
        ...c.names,
        ...c.phones,
        c.note?.phone ?? "",
        c.note?.vorlieben ?? "",
        c.note?.tabus ?? "",
        c.note?.admin_note ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [listQ.data, search]);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title={
          <>
            Kunden<em className="font-script gold-text not-italic">liste</em>
          </>
        }
        intro="Alle Gäste mit bestätigten Terminen — mit Pseudonym, Kontakt, Vorlieben und Tabus."
      />
      <section className="py-16">
        <div className="container-luxe max-w-5xl">
          <div className="mb-8 flex flex-wrap gap-3 items-center justify-between">
            <Link to="/admin" className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]">
              <ArrowLeft size={12} /> Zum Admin-Bereich
            </Link>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-vanilla/40"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suchen (Name, E-Mail, Vorlieben…)"
                className="bg-anthracite/40 border border-champagne/20 pl-8 pr-3 py-2 text-vanilla text-sm w-72 max-w-full"
              />
            </div>
          </div>

          {listQ.isLoading && <p className="text-vanilla/50 text-sm">Lade…</p>}
          {listQ.data && filtered.length === 0 && (
            <p className="text-vanilla/50 text-sm border border-dashed border-champagne/20 p-6 text-center">
              Noch keine bestätigten Kunden.
            </p>
          )}

          <div className="space-y-3">
            {filtered.map((c) => {
              const displayName =
                c.note?.pseudonym || c.names[0] || c.email.split("@")[0];
              const phone = c.note?.phone || c.phones[0] || null;
              const isOpen = openEmail === c.email.toLowerCase();
              return (
                <div
                  key={c.email.toLowerCase()}
                  className="bg-card border border-champagne/15"
                >
                  <button
                    onClick={() =>
                      setOpenEmail(isOpen ? null : c.email.toLowerCase())
                    }
                    className="w-full text-left p-5 flex flex-wrap items-start justify-between gap-4 hover:bg-anthracite/20 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <User size={14} className="text-champagne" />
                        <span className="font-display text-lg text-vanilla">
                          {displayName}
                        </span>
                        {c.bookings_count > 0 && (
                          <span className="text-[0.6rem] uppercase tracking-[0.2em] text-champagne/80 border border-champagne/30 px-2 py-0.5">
                            {c.bookings_count}× bestätigt
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-vanilla/60 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="inline-flex items-center gap-1.5">
                          <Mail size={11} /> {c.email}
                        </span>
                        {phone && (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone size={11} /> {phone}
                          </span>
                        )}
                        {c.last_booking_at && (
                          <span className="text-vanilla/45">
                            zuletzt{" "}
                            {format(new Date(c.last_booking_at), "dd.MM.yyyy", {
                              locale: de,
                            })}
                          </span>
                        )}
                      </div>
                      {c.note?.vorlieben && !isOpen && (
                        <div className="mt-2 text-xs text-vanilla/70 line-clamp-1">
                          <span className="text-champagne">Vorlieben: </span>
                          {c.note.vorlieben}
                        </div>
                      )}
                      {c.note?.tabus && !isOpen && (
                        <div className="mt-1 text-xs text-vanilla/70 line-clamp-1">
                          <span className="text-bordeaux">Tabus: </span>
                          {c.note.tabus}
                        </div>
                      )}
                    </div>
                  </button>
                  {isOpen && (
                    <CustomerEditor
                      customer={c}
                      pending={upsertMut.isPending}
                      onSave={async (v) => {
                        await upsertMut.mutateAsync(v);
                        setOpenEmail(null);
                      }}
                      onClose={() => setOpenEmail(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

function CustomerEditor({
  customer,
  pending,
  onSave,
  onClose,
}: {
  customer: CustomerRow;
  pending: boolean;
  onSave: (v: {
    email: string;
    pseudonym: string | null;
    phone: string | null;
    vorlieben: string | null;
    tabus: string | null;
    admin_note: string | null;
  }) => void | Promise<void>;
  onClose: () => void;
}) {
  const [pseudonym, setPseudonym] = useState(
    customer.note?.pseudonym ?? customer.names[0] ?? "",
  );
  const [phone, setPhone] = useState(
    customer.note?.phone ?? customer.phones[0] ?? "",
  );
  const [vorlieben, setVorlieben] = useState(customer.note?.vorlieben ?? "");
  const [tabus, setTabus] = useState(customer.note?.tabus ?? "");
  const [adminNote, setAdminNote] = useState(customer.note?.admin_note ?? "");

  return (
    <div className="border-t border-champagne/10 p-5 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="eyebrow block mb-1.5">Pseudonym / Name</label>
          <input
            value={pseudonym}
            onChange={(e) => setPseudonym(e.target.value)}
            className="input-luxe"
            placeholder="z. B. Sklave M."
          />
        </div>
        <div>
          <label className="eyebrow block mb-1.5">Telefon / WhatsApp</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-luxe"
            placeholder="+49 …"
          />
        </div>
      </div>
      <div>
        <label className="eyebrow block mb-1.5 text-champagne">Vorlieben</label>
        <textarea
          rows={4}
          value={vorlieben}
          onChange={(e) => setVorlieben(e.target.value)}
          className="input-luxe resize-none"
          placeholder="Was mag der Gast? Rollen, Praktiken, Stimmungen …"
        />
      </div>
      <div>
        <label className="eyebrow block mb-1.5 text-bordeaux">Tabus</label>
        <textarea
          rows={3}
          value={tabus}
          onChange={(e) => setTabus(e.target.value)}
          className="input-luxe resize-none"
          placeholder="Was ist absolut zu vermeiden?"
        />
      </div>
      <div>
        <label className="eyebrow block mb-1.5">Interne Notiz</label>
        <textarea
          rows={2}
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          className="input-luxe resize-none"
          placeholder="Nur für dich."
        />
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          disabled={pending}
          onClick={() =>
            onSave({
              email: customer.email,
              pseudonym: pseudonym.trim() || null,
              phone: phone.trim() || null,
              vorlieben: vorlieben.trim() || null,
              tabus: tabus.trim() || null,
              admin_note: adminNote.trim() || null,
            })
          }
          className="btn-gold !py-2 !px-4 !text-[0.65rem] disabled:opacity-40"
        >
          <Save size={12} /> Speichern
        </button>
        <button
          onClick={onClose}
          className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]"
        >
          <X size={12} /> Abbrechen
        </button>
      </div>
    </div>
  );
}
