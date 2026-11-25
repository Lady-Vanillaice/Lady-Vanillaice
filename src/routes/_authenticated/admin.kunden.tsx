import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminTabBar } from "@/components/admin/AdminTabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CustomerSessionHistory } from "@/components/admin/CustomerSessionHistory";
import { PageHeader } from "@/components/site/PageHeader";
import { ArrowLeft, Search, Mail, Phone, User, Save, X, CalendarCheck, Star, ShieldAlert, HeartPulse, KeyRound, FileDown } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { listCustomers, listCustomerVisitRecords, upsertCustomerNote, type CustomerRow } from "@/lib/customers.functions";

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
  const visitRecordsFn = useServerFn(listCustomerVisitRecords);

  const [search, setSearch] = useState("");
  const [openEmail, setOpenEmail] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => listFn(),
    retry: false,
  });


  const downloadCustomerReport = async () => {
    if (!listQ.data) return;
    setExportingPdf(true);
    setPdfError(null);
    try {
      const visits = await visitRecordsFn();
      const customers = [...listQ.data]
        .filter((customer) => customer.visits_count > 0)
        .sort((a, b) => {
          const countOrder = b.visits_count - a.visits_count;
          if (countOrder) return countOrder;
          return (a.note?.pseudonym || a.names[0] || a.email)
            .localeCompare(b.note?.pseudonym || b.names[0] || b.email, "de");
        });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(19);
      pdf.setTextColor(36, 29, 22);
      pdf.text("Lady Vanillaice — Kundenübersicht", 14, 18);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(110, 97, 78);
      pdf.text(`Erstellt am ${new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", dateStyle: "medium" }).format(new Date())}`, 14, 25);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(118, 88, 47);
      pdf.text("Besuchshäufigkeit", 14, 35);
      autoTable(pdf, {
        startY: 39,
        head: [["Rang", "Name", "Besuche"]],
        body: customers.length
          ? customers.map((customer, index) => [
              String(index + 1),
              customer.note?.pseudonym || customer.names[0] || customer.email.split("@")[0],
              String(customer.visits_count),
            ])
          : [["—", "Noch keine Besuche erfasst", "0"]],
        theme: "grid",
        styles: { font: "helvetica", fontSize: 9, cellPadding: 2.5, textColor: [45, 39, 32], lineColor: [220, 210, 190] },
        headStyles: { fillColor: [188, 151, 91], textColor: [20, 18, 15], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [250, 247, 241] },
        columnStyles: { 0: { cellWidth: 18 }, 2: { cellWidth: 28, halign: "right" } },
      });

      const tableEnd = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 45;
      let sectionY = tableEnd + 11;
      if (sectionY > 260) {
        pdf.addPage();
        sectionY = 20;
      }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(118, 88, 47);
      pdf.text("Terminübersicht — neueste Termine zuerst", 14, sectionY);

      const dateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
      const dateText = (value: string) => {
        if (dateOnly(value)) {
          const [year, month, day] = value.split("-");
          return `${day}.${month}.${year}`;
        }
        return new Intl.DateTimeFormat("de-DE", {
          timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric",
        }).format(new Date(value));
      };
      const timeText = (value: string) =>
        dateOnly(value)
          ? "—"
          : new Intl.DateTimeFormat("de-DE", {
              timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
            }).format(new Date(value));

      autoTable(pdf, {
        startY: sectionY + 4,
        head: [["Datum", "Uhrzeit", "Name"]],
        body: visits.map((visit) => [dateText(visit.occurredAt), timeText(visit.occurredAt), visit.displayName]),
        theme: "grid",
        styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2.2, textColor: [45, 39, 32], lineColor: [220, 210, 190] },
        headStyles: { fillColor: [188, 151, 91], textColor: [20, 18, 15], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [250, 247, 241] },
        columnStyles: { 0: { cellWidth: 33 }, 1: { cellWidth: 25 }, 2: { cellWidth: "auto" } },
        showHead: "everyPage",
      });

      const pageCount = pdf.getNumberOfPages();
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        pdf.setPage(pageNumber);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(125, 115, 101);
        pdf.text(`Seite ${pageNumber} von ${pageCount}`, 196, 287, { align: "right" });
      }
      pdf.save(`kundenuebersicht-${new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date())}.pdf`);
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "Der PDF-Bericht konnte nicht erstellt werden.");
    } finally {
      setExportingPdf(false);
    }
  };

  const upsertMut = useMutation({
    mutationFn: (v: {
      email: string;
      pseudonym?: string | null;
      phone?: string | null;
      vorlieben?: string | null;
      tabus?: string | null;
      gesundheit?: string | null;
      safeword?: string | null;
      admin_note?: string | null;
      special_rules?: string | null;
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
        c.note?.gesundheit ?? "",
        c.note?.safeword ?? "",
        c.booking_profile.gesundheit ?? "",
        c.booking_profile.safeword ?? "",
        c.note?.admin_note ?? "",
        c.note?.special_rules ?? "",
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
        intro="Deine Kunden, ihre Session-Historie und persönliche Hinweise – nur für dich im Adminbereich."
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
            <button
              type="button"
              onClick={downloadCustomerReport}
              disabled={!listQ.data || exportingPdf}
              className="btn-outline-gold !py-2 !px-4 !text-[0.65rem] disabled:opacity-40"
            >
              <FileDown size={13} /> {exportingPdf ? "PDF wird erstellt…" : "Kundenbericht als PDF"}
            </button>
          </div>

          {pdfError && <p role="alert" className="mb-4 text-sm text-bordeaux">{pdfError}</p>}
          {listQ.isLoading && <p className="text-vanilla/50 text-sm">Lade…</p>}
          {listQ.isError && (
            <div className="border border-bordeaux/50 bg-bordeaux/10 p-4 text-sm text-vanilla/80">
              <p>Die Kunden konnten nicht geladen werden: {(listQ.error as Error).message}</p>
              <button type="button" onClick={() => listQ.refetch()} className="btn-outline-gold !py-2 !px-3 !text-[0.65rem] mt-3">Erneut laden</button>
            </div>
          )}
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
                            {c.visits_count}× dagewesen
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
    gesundheit: string | null;
    safeword: string | null;
    admin_note: string | null;
    special_rules: string | null;
  }) => void | Promise<void>;
  onClose: () => void;
}) {
  const [pseudonym, setPseudonym] = useState(
    customer.note?.pseudonym ?? customer.names[0] ?? "",
  );
  const [phone, setPhone] = useState(
    customer.note?.phone ?? customer.phones[0] ?? "",
  );
  const [vorlieben, setVorlieben] = useState(customer.note?.vorlieben ?? customer.booking_profile.vorlieben ?? "");
  const [tabus, setTabus] = useState(customer.note?.tabus ?? customer.booking_profile.tabus ?? "");
  const [gesundheit, setGesundheit] = useState(customer.note?.gesundheit ?? customer.booking_profile.gesundheit ?? "");
  const [safeword, setSafeword] = useState(customer.note?.safeword ?? customer.booking_profile.safeword ?? "");
  const [adminNote, setAdminNote] = useState(customer.note?.admin_note ?? "");
  const [specialRules, setSpecialRules] = useState(customer.note?.special_rules ?? "");
  const [customerTab, setCustomerTab] = useState("profil");
  const customerTabs = [
    { id: "profil", label: "Profil" },
    { id: "vorlieben", label: "Vorlieben & Tabus" },
    { id: "termine", label: "Termine", badge: customer.bookings_count || null },
  ];

  return (
    <div className="border-t border-champagne/10 p-5 space-y-4">
      <AdminTabBar tabs={customerTabs} active={customerTab} onChange={setCustomerTab} sticky={false} />
      {customerTab === "termine" && (
      <CustomerSessionHistory key={customer.email.toLowerCase()} email={customer.email} />
      )}
      {customerTab === "profil" && <>
      <h2 className="font-display text-2xl text-champagne">Kundenprofil</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="border border-champagne/20 bg-anthracite/20 p-3">
          <div className="flex items-center gap-2 text-champagne text-xs uppercase tracking-[0.16em]">
            <CalendarCheck size={14} /> Besuche
          </div>
          <div className="mt-2 font-display text-2xl text-vanilla">{customer.visits_count}</div>
          <div className="text-[0.65rem] text-vanilla/45">{customer.bookings_count} bestätigte Termine insgesamt</div>
        </div>
        <div className="border border-champagne/20 bg-anthracite/20 p-3 sm:col-span-1 lg:col-span-2">
          <div className="flex items-center gap-2 text-champagne text-xs uppercase tracking-[0.16em]">
            <Star size={14} /> Rezension auf der Homepage
          </div>
          <div className="mt-2 text-sm text-vanilla">
            {customer.testimonial
              ? customer.testimonial.status === "approved"
                ? "Ja — veröffentlicht"
                : customer.testimonial.status === "pending"
                  ? "Eingereicht — wartet auf Freigabe"
                  : "Eingereicht — abgelehnt"
              : "Keine eindeutig zugeordnete Rezension"}
          </div>
          <div className="mt-1 text-[0.65rem] text-vanilla/45">
            Zuordnung über das gleiche Pseudonym.
          </div>
        </div>
      </div>
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
      </>}
      {customerTab === "vorlieben" && <>
      <div>
        <label className="eyebrow flex items-center gap-2 mb-1.5 text-champagne"><Star size={12} /> Vorlieben</label>
        <textarea
          rows={4}
          value={vorlieben}
          onChange={(e) => setVorlieben(e.target.value)}
          className="input-luxe resize-none"
          placeholder="Was mag der Gast? Rollen, Praktiken, Stimmungen …"
        />
      </div>
      <div>
        <label className="eyebrow flex items-center gap-2 mb-1.5 text-bordeaux"><ShieldAlert size={12} /> Tabus</label>
        <textarea
          rows={3}
          value={tabus}
          onChange={(e) => setTabus(e.target.value)}
          className="input-luxe resize-none"
          placeholder="Was ist absolut zu vermeiden?"
        />
      </div>
      <div>
        <label className="eyebrow flex items-center gap-2 mb-1.5"><HeartPulse size={12} /> Gesundheitliche Hinweise</label>
        <textarea
          rows={3}
          value={gesundheit}
          onChange={(e) => setGesundheit(e.target.value)}
          className="input-luxe resize-none"
          placeholder="Verletzungen, Allergien, Kreislauf oder andere wichtige Hinweise …"
        />
      </div>
      <div>
        <label className="eyebrow flex items-center gap-2 mb-1.5"><KeyRound size={12} /> Safeword</label>
        <input
          value={safeword}
          onChange={(e) => setSafeword(e.target.value)}
          className="input-luxe"
          placeholder="z. B. Rot"
        />
      </div>
      </>}
      {customerTab === "profil" && <>
      <div className="border border-champagne/30 bg-champagne/5 p-4">
        <label className="eyebrow block mb-1.5 text-champagne">Dauerhafte Sonderregelungen</label>
        <p className="text-xs text-vanilla/55 mb-2">Diese Hinweise bleiben beim Kunden gespeichert und erscheinen automatisch in jedem Termin-Detail.</p>
        <textarea
          rows={3}
          value={specialRules}
          onChange={(e) => setSpecialRules(e.target.value)}
          className="input-luxe resize-y"
          maxLength={4000}
          placeholder="z. B. vereinbarter Sonderpreis, abweichender Zahlbetrag oder Anzahlung aus Vertrauensbasis"
        />
      </div>
      <div>
        <label className="eyebrow block mb-1.5">Wichtig & Persönliches (intern)</label>
        <textarea
          rows={2}
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          className="input-luxe resize-none"
          placeholder="Nur für dich."
        />
      </div>
      </>}
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
              gesundheit: gesundheit.trim() || null,
              safeword: safeword.trim() || null,
              admin_note: adminNote.trim() || null,
              special_rules: specialRules.trim() || null,
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
