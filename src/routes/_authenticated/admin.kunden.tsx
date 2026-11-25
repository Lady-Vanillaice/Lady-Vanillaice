import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminTabBar } from "@/components/admin/AdminTabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CustomerSessionHistory } from "@/components/admin/CustomerSessionHistory";
import { PageHeader } from "@/components/site/PageHeader";
import { ArrowLeft, Search, Mail, Phone, User, Save, X, CalendarCheck, Star, ShieldAlert, HeartPulse, KeyRound, FileDown, MessageCircle, Crown, NotebookPen, Pencil } from "lucide-react";
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
  const [sortBy, setSortBy] = useState<"recent" | "visits" | "name">("recent");
  const [group, setGroup] = useState<"all" | "regular" | "new" | "never">("all");
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

  const nameOf = (c: CustomerRow) => c.note?.pseudonym || c.names[0] || c.email.split("@")[0];
  const all = listQ.data ?? [];
  const groupCounts = {
    all: all.length,
    regular: all.filter((c) => c.visits_count >= 3).length,
    new: all.filter((c) => c.visits_count >= 1 && c.visits_count < 3).length,
    never: all.filter((c) => c.visits_count === 0).length,
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (listQ.data ?? []).filter((c) => {
      if (group === "regular" && c.visits_count < 3) return false;
      if (group === "new" && (c.visits_count < 1 || c.visits_count >= 3)) return false;
      if (group === "never" && c.visits_count !== 0) return false;
      if (!q) return true;
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
    return [...list].sort((a, b) => {
      if (sortBy === "visits") return b.visits_count - a.visits_count || nameOf(a).localeCompare(nameOf(b), "de");
      if (sortBy === "name") return nameOf(a).localeCompare(nameOf(b), "de");
      return (b.last_booking_at ?? "").localeCompare(a.last_booking_at ?? "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listQ.data, search, sortBy, group]);

  const chip = (active: boolean) =>
    `px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.14em] border transition ${active ? "border-champagne bg-champagne/15 text-champagne" : "border-champagne/20 text-vanilla/60 hover:border-champagne/50"}`;

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
      <section className="py-10 md:py-16">
        <div className="container-luxe max-w-5xl">
          <div className="mb-6 flex flex-wrap gap-3 items-center justify-between">
            <Link to="/admin" className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]">
              <ArrowLeft size={12} /> Zum Admin-Bereich
            </Link>
            <button
              type="button"
              onClick={downloadCustomerReport}
              disabled={!listQ.data || exportingPdf}
              className="btn-outline-gold !py-2 !px-4 !text-[0.65rem] disabled:opacity-40"
            >
              <FileDown size={13} /> {exportingPdf ? "PDF wird erstellt…" : "Kundenbericht als PDF"}
            </button>
          </div>

          <div className="sticky top-0 z-20 -mx-4 mb-5 space-y-3 border-b border-champagne/15 bg-background/95 px-4 py-3 backdrop-blur">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-vanilla/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kunde suchen: Name, E-Mail, Telefon …"
                className="w-full bg-anthracite/40 border border-champagne/25 pl-9 pr-9 py-2.5 text-vanilla text-sm"
              />
              {search && (
                <button type="button" aria-label="Suche löschen" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-vanilla/50">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={chip(group === "all")} onClick={() => setGroup("all")}>Alle {groupCounts.all}</button>
              <button type="button" className={chip(group === "regular")} onClick={() => setGroup("regular")}>Stammkunden {groupCounts.regular}</button>
              <button type="button" className={chip(group === "new")} onClick={() => setGroup("new")}>1–2× da {groupCounts.new}</button>
              <button type="button" className={chip(group === "never")} onClick={() => setGroup("never")}>Noch nie da {groupCounts.never}</button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[0.62rem] uppercase tracking-[0.14em] text-vanilla/45">
              Sortieren:
              <button type="button" className={chip(sortBy === "recent")} onClick={() => setSortBy("recent")}>Zuletzt da</button>
              <button type="button" className={chip(sortBy === "visits")} onClick={() => setSortBy("visits")}>Meiste Besuche</button>
              <button type="button" className={chip(sortBy === "name")} onClick={() => setSortBy("name")}>A–Z</button>
            </div>
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
              Keine passenden Kunden oder Buchungen gefunden.
            </p>
          )}

          <div className="space-y-3">
            {filtered.map((c) => {
              const displayName = nameOf(c);
              const phone = c.note?.phone || c.phones[0] || null;
              const isOpen = openEmail === c.email.toLowerCase();
              const safeword = c.note?.safeword || c.booking_profile.safeword || null;
              const tabus = c.note?.tabus || c.booking_profile.tabus || null;
              const regular = c.visits_count >= 3;
              return (
                <div
                  key={c.email.toLowerCase()}
                  className={`bg-card border ${isOpen ? "border-champagne/60" : "border-champagne/15"}`}
                >
                  <button
                    onClick={() =>
                      setOpenEmail(isOpen ? null : c.email.toLowerCase())
                    }
                    className="w-full text-left p-4 sm:p-5 hover:bg-anthracite/20 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {regular ? <Crown size={14} className="text-champagne" /> : <User size={14} className="text-champagne" />}
                          <span className="font-display text-lg text-vanilla">{displayName}</span>
                          {regular && <span className="text-[0.55rem] uppercase tracking-[0.18em] bg-champagne/15 text-champagne px-2 py-0.5">Stammkunde</span>}
                        </div>
                        <div className="mt-1 text-xs text-vanilla/55">
                          {c.visits_count}× dagewesen
                          {c.last_booking_at && <> · zuletzt {format(new Date(c.last_booking_at), "dd.MM.yyyy", { locale: de })}</>}
                        </div>
                      </div>
                      <span className="shrink-0 text-[0.6rem] uppercase tracking-[0.16em] text-champagne/80">{isOpen ? "Schließen" : "Öffnen"}</span>
                    </div>
                    {!isOpen && (safeword || tabus || c.note?.special_rules) && (
                      <div className="mt-3 space-y-1 border-l-2 border-bordeaux/60 pl-3 text-xs text-vanilla/75">
                        {safeword && <div className="line-clamp-1"><span className="text-bordeaux">Safeword: </span>{safeword}</div>}
                        {tabus && <div className="line-clamp-1"><span className="text-bordeaux">Tabus: </span>{tabus}</div>}
                        {c.note?.special_rules && <div className="line-clamp-1"><span className="text-champagne">Sonderregel: </span>{c.note.special_rules}</div>}
                      </div>
                    )}
                    {!isOpen && (
                      <div className="mt-2 text-xs text-vanilla/45 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="inline-flex items-center gap-1.5"><Mail size={11} /> {c.email}</span>
                        {phone && <span className="inline-flex items-center gap-1.5"><Phone size={11} /> {phone}</span>}
                      </div>
                    )}
                  </button>
                  {isOpen && (
                    <CustomerEditor
                      customer={c}
                      pending={upsertMut.isPending}
                      error={upsertMut.error instanceof Error ? upsertMut.error.message : null}
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
  error,
  onSave,
  onClose,
}: {
  customer: CustomerRow;
  pending: boolean;
  error: string | null;
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
  const [customerTab, setCustomerTab] = useState("ueberblick");
  const customerTabs = [
    { id: "ueberblick", label: "Überblick" },
    { id: "sicherheit", label: "Sicherheit" },
    { id: "vorlieben", label: "Vorlieben & Notizen" },
    { id: "termine", label: "Termine", badge: customer.bookings_count || null },
  ];
  const digits = phone.replace(/[^\d+]/g, "");
  const waNumber = digits.replace(/^\+/, "").replace(/^00/, "").replace(/^0/, "49");
  const lastVisit = customer.last_booking_at ? format(new Date(customer.last_booking_at), "dd.MM.yyyy", { locale: de }) : "—";
  const review = customer.testimonial
    ? customer.testimonial.status === "approved"
      ? "Veröffentlicht"
      : customer.testimonial.status === "pending"
        ? "Wartet auf Freigabe"
        : "Abgelehnt"
    : "Keine";

  const summaryRow = (label: string, value: string, tone: "danger" | "gold" | "plain", tab: string) => (
    <button type="button" onClick={() => setCustomerTab(tab)} className="w-full text-left border-b border-champagne/10 py-2 last:border-0">
      <div className={`flex items-center justify-between text-[0.6rem] uppercase tracking-[0.16em] ${tone === "danger" ? "text-bordeaux" : tone === "gold" ? "text-champagne" : "text-vanilla/50"}`}>
        {label} <Pencil size={10} className="opacity-60" />
      </div>
      <div className={`whitespace-pre-wrap text-sm ${value ? "text-vanilla/90" : "text-vanilla/35 italic"}`}>{value || "nicht eingetragen"}</div>
    </button>
  );

  return (
    <div className="border-t border-champagne/10 p-4 sm:p-5 space-y-4">
      <AdminTabBar tabs={customerTabs} active={customerTab} onChange={setCustomerTab} sticky={false} />

      {customerTab === "ueberblick" && <>
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-champagne/20 bg-anthracite/20 p-3">
          <div className="flex items-center gap-1.5 text-champagne text-[0.6rem] uppercase tracking-[0.14em]"><CalendarCheck size={12} /> Besuche</div>
          <div className="mt-1 font-display text-2xl text-vanilla">{customer.visits_count}</div>
          <div className="text-[0.6rem] text-vanilla/45">{customer.bookings_count} Termine gesamt</div>
        </div>
        <div className="border border-champagne/20 bg-anthracite/20 p-3">
          <div className="text-champagne text-[0.6rem] uppercase tracking-[0.14em]">Zuletzt da</div>
          <div className="mt-1 font-display text-lg text-vanilla">{lastVisit}</div>
        </div>
        <div className="border border-champagne/20 bg-anthracite/20 p-3">
          <div className="flex items-center gap-1.5 text-champagne text-[0.6rem] uppercase tracking-[0.14em]"><Star size={12} /> Rezension</div>
          <div className="mt-1 text-sm text-vanilla">{review}</div>
        </div>
      </div>

      <div className="border border-bordeaux/40 bg-bordeaux/5 px-3 py-1">
        {summaryRow("Safeword", safeword, "danger", "sicherheit")}
        {summaryRow("Tabus", tabus, "danger", "sicherheit")}
        {summaryRow("Gesundheit", gesundheit, "plain", "sicherheit")}
        {summaryRow("Sonderregeln", specialRules, "gold", "vorlieben")}
      </div>

      <div className="space-y-3">
        <h3 className="eyebrow text-champagne">Kontakt</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="eyebrow block mb-1.5">Vollständiger Name / Pseudonym</label>
            <input value={pseudonym} onChange={(e) => setPseudonym(e.target.value)} className="input-luxe" placeholder="z. B. Sklave M." />
          </div>
          <div>
            <label className="eyebrow block mb-1.5">Telefon / WhatsApp</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-luxe" placeholder="+49 …" inputMode="tel" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {waNumber.length > 6 && <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="btn-outline-gold !py-2 !px-3 !text-[0.6rem]"><MessageCircle size={12} /> WhatsApp</a>}
          {digits.length > 6 && <a href={`tel:${digits}`} className="btn-outline-gold !py-2 !px-3 !text-[0.6rem]"><Phone size={12} /> Anrufen</a>}
          {!customer.email.endsWith("@intern.local") && <a href={`mailto:${customer.email}`} className="btn-outline-gold !py-2 !px-3 !text-[0.6rem]"><Mail size={12} /> {customer.email}</a>}
        </div>
      </div>
      </>}

      {customerTab === "sicherheit" && <>
      <p className="text-xs text-vanilla/55">Das Wichtigste vor jeder Session – erscheint auch im Terminplan unter „Kunden-Info“.</p>
      <div>
        <label className="eyebrow flex items-center gap-2 mb-1.5 text-bordeaux"><KeyRound size={12} /> Safeword</label>
        <input value={safeword} onChange={(e) => setSafeword(e.target.value)} className="input-luxe" placeholder="z. B. Rot" />
      </div>
      <div>
        <label className="eyebrow flex items-center gap-2 mb-1.5 text-bordeaux"><ShieldAlert size={12} /> Tabus</label>
        <textarea rows={4} value={tabus} onChange={(e) => setTabus(e.target.value)} className="input-luxe resize-y" placeholder="Was ist absolut zu vermeiden?" />
      </div>
      <div>
        <label className="eyebrow flex items-center gap-2 mb-1.5"><HeartPulse size={12} /> Gesundheitliche Hinweise</label>
        <textarea rows={3} value={gesundheit} onChange={(e) => setGesundheit(e.target.value)} className="input-luxe resize-y" placeholder="Verletzungen, Allergien, Kreislauf oder andere wichtige Hinweise …" />
      </div>
      </>}

      {customerTab === "vorlieben" && <>
      <div>
        <label className="eyebrow flex items-center gap-2 mb-1.5 text-champagne"><Star size={12} /> Vorlieben</label>
        <textarea rows={5} value={vorlieben} onChange={(e) => setVorlieben(e.target.value)} className="input-luxe resize-y" placeholder="Was mag der Gast? Rollen, Praktiken, Stimmungen …" />
      </div>
      <div className="border border-champagne/30 bg-champagne/5 p-4">
        <label className="eyebrow block mb-1.5 text-champagne">Dauerhafte Sonderregelungen</label>
        <p className="text-xs text-vanilla/55 mb-2">Bleiben beim Kunden gespeichert und erscheinen automatisch in jedem Termin-Detail.</p>
        <textarea rows={3} value={specialRules} onChange={(e) => setSpecialRules(e.target.value)} className="input-luxe resize-y" maxLength={4000} placeholder="z. B. vereinbarter Sonderpreis, abweichender Zahlbetrag oder Anzahlung aus Vertrauensbasis" />
      </div>
      <div>
        <label className="eyebrow flex items-center gap-2 mb-1.5"><NotebookPen size={12} /> Wichtig & Persönliches (intern)</label>
        <textarea rows={3} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className="input-luxe resize-y" placeholder="Nur für dich." />
      </div>
      </>}

      {customerTab === "termine" && (
        <CustomerSessionHistory key={customer.email.toLowerCase()} email={customer.email} />
      )}

      {error && <p className="text-xs text-bordeaux">Speichern fehlgeschlagen: {error}</p>}
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
          <Save size={12} /> {pending ? "Speichere…" : "Speichern"}
        </button>
        <button
          onClick={onClose}
          className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]"
        >
          <X size={12} /> Schließen
        </button>
      </div>
    </div>
  );
}
