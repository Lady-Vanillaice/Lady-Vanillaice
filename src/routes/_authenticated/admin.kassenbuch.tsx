import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/site/PageHeader";
import {
  listCashBookEntries,
  createCashBookEntry,
  deleteCashBookEntry,
} from "@/lib/cashbook.functions";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, Plus, Trash2, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/admin/kassenbuch")({
  head: () => ({ meta: [{ title: "Kassenbuch — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: KassenbuchPage,
});

function formatEUR(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function KassenbuchPage() {
  const qc = useQueryClient();
  const list = useServerFn(listCashBookEntries);
  const create = useServerFn(createCashBookEntry);
  const del = useServerFn(deleteCashBookEntry);

  const { data, isLoading, error } = useQuery({
    queryKey: ["cashbook"],
    queryFn: () => list(),
  });

  const [studio, setStudio] = useState("");
  const [datum, setDatum] = useState(todayISO());
  const [kunde, setKunde] = useState("");
  const [anzahlung, setAnzahlung] = useState("0");
  const [anzahlungMethod, setAnzahlungMethod] = useState("");
  const [bar, setBar] = useState("0");
  const [notiz, setNotiz] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Export: default to previous month (Anfang nächsten Monats für Vormonat)
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [exportMonth, setExportMonth] = useState(
    `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`,
  );

  const createMut = useMutation({
    mutationFn: () =>
      create({
        data: {
          studio: studio.trim(),
          datum,
          kunde: kunde.trim(),
          anzahlung: Number(anzahlung.replace(",", ".")) || 0,
          anzahlung_method: anzahlungMethod.trim() || null,
          bar: Number(bar.replace(",", ".")) || 0,
          notiz: notiz.trim() || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cashbook"] });
      setKunde("");
      setAnzahlung("0");
      setAnzahlungMethod("");
      setBar("0");
      setNotiz("");
      setFormError(null);
    },
    onError: (e: unknown) => setFormError(e instanceof Error ? e.message : "Fehler beim Speichern"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cashbook"] }),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!studio.trim() || !kunde.trim()) {
      setFormError("Studio und Kunde sind Pflichtfelder.");
      return;
    }
    createMut.mutate();
  }

  const entries = data ?? [];
  const totals = entries.reduce(
    (acc, e) => {
      acc.anzahlung += Number(e.anzahlung);
      acc.bar += Number(e.bar);
      acc.gesamt += Number(e.gesamt);
      return acc;
    },
    { anzahlung: 0, bar: 0, gesamt: 0 },
  );

  function exportMonthPdf() {
    const [yStr, mStr] = exportMonth.split("-");
    const year = Number(yStr);
    const month = Number(mStr); // 1-12
    const monthEntries = entries
      .filter((e) => {
        const d = parseISO(e.datum);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      })
      .slice()
      .sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));

    const monthLabel = format(new Date(year, month - 1, 1), "LLLL yyyy", { locale: de });
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Logo: goldenes "V"-Monogramm in anthrazitfarbenem Quadrat + Wortmarke
    const gold: [number, number, number] = [212, 175, 122];
    const anthracite: [number, number, number] = [11, 11, 13];
    doc.setFillColor(...anthracite);
    doc.roundedRect(40, 30, 40, 40, 6, 6, "F");
    doc.setTextColor(...gold);
    doc.setFont("times", "italic");
    doc.setFontSize(28);
    doc.text("V", 60, 60, { align: "center" });

    doc.setTextColor(...gold);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("LADY VANILLA ICE", 92, 50);
    doc.setTextColor(90, 90, 90);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("lady-vanillaice.com", 92, 64);

    // Titel
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Kassenbuch", 40, 100);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(monthLabel, 40, 118);
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(
      `Erstellt am ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: de })}`,
      pageWidth - 40,
      50,
      { align: "right" },
    );
    doc.setTextColor(0, 0, 0);

    const sums = monthEntries.reduce(
      (acc, e) => {
        acc.anzahlung += Number(e.anzahlung);
        acc.bar += Number(e.bar);
        acc.gesamt += Number(e.gesamt);
        return acc;
      },
      { anzahlung: 0, bar: 0, gesamt: 0 },
    );

    autoTable(doc, {
      startY: 135,
      head: [["Datum", "Studio", "Kunde", "Anzahlung", "Zahlungsart", "Bar", "Gesamt", "Notiz"]],
      body: monthEntries.map((e) => [
        format(parseISO(e.datum), "dd.MM.yyyy", { locale: de }),
        e.studio,
        e.kunde,
        formatEUR(Number(e.anzahlung)),
        e.anzahlung_method ?? "—",
        formatEUR(Number(e.bar)),
        formatEUR(Number(e.gesamt)),
        e.notiz ?? "",
      ]),
      foot: [[
        "",
        "",
        "Summe",
        formatEUR(sums.anzahlung),
        "",
        formatEUR(sums.bar),
        formatEUR(sums.gesamt),
        "",
      ]],
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255 },
      footStyles: { fillColor: [230, 220, 190], textColor: 20, fontStyle: "bold" },
      columnStyles: {
        3: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right" },
      },
      margin: { left: 40, right: 40 },
    });

    doc.save(`kassenbuch-${exportMonth}.pdf`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title={<><em className="font-script gold-text not-italic">Kassenbuch</em></>}
      />
      <section className="py-12">
        <div className="container-luxe max-w-6xl space-y-10">
          <div>
            <Link to="/admin" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-vanilla/60 hover:text-champagne">
              <ArrowLeft size={14} /> Zurück zum Admin
            </Link>
          </div>

          {/* Monats-Export für Buchhaltung */}
          <div className="bg-card border border-champagne/20 p-6 md:p-8 flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <h2 className="text-xs uppercase tracking-[0.25em] text-champagne mb-2">
                Monats-PDF für Buchhaltung
              </h2>
              <p className="text-xs text-vanilla/60">
                Wähle den Monat und lade das Kassenbuch als PDF herunter.
              </p>
            </div>
            <Field label="Monat">
              <input
                type="month"
                value={exportMonth}
                onChange={(e) => setExportMonth(e.target.value)}
                className="luxe-input"
              />
            </Field>
            <button
              type="button"
              onClick={exportMonthPdf}
              disabled={isLoading}
              className="btn-gold inline-flex items-center gap-2"
            >
              <FileDown size={16} /> PDF herunterladen
            </button>
          </div>


          {/* Neuer Eintrag */}
          <form onSubmit={submit} className="bg-card border border-champagne/20 p-6 md:p-8 space-y-5">
            <h2 className="text-xs uppercase tracking-[0.25em] text-champagne">Neuer Eintrag</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Studio">
                <input
                  required
                  value={studio}
                  onChange={(e) => setStudio(e.target.value)}
                  className="luxe-input"
                  placeholder="z. B. Studio Berlin"
                />
              </Field>
              <Field label="Datum">
                <input
                  required
                  type="date"
                  value={datum}
                  onChange={(e) => setDatum(e.target.value)}
                  className="luxe-input"
                />
              </Field>
              <Field label="Kunde">
                <input
                  required
                  value={kunde}
                  onChange={(e) => setKunde(e.target.value)}
                  className="luxe-input"
                  placeholder="Name / Pseudonym"
                />
              </Field>
              <Field label="Anzahlung (€)">
                <input
                  inputMode="decimal"
                  value={anzahlung}
                  onChange={(e) => setAnzahlung(e.target.value)}
                  className="luxe-input"
                />
              </Field>
              <Field label="Zahlungsart Anzahlung">
                <input
                  list="anzahlung-method-list"
                  value={anzahlungMethod}
                  onChange={(e) => setAnzahlungMethod(e.target.value)}
                  className="luxe-input"
                  placeholder="Bank, PayPal, Bar …"
                />
                <datalist id="anzahlung-method-list">
                  <option value="Bank" />
                  <option value="PayPal" />
                  <option value="Bar" />
                  <option value="Revolut" />
                  <option value="Sonstige" />
                </datalist>
              </Field>
              <Field label="Bar (€)">
                <input
                  inputMode="decimal"
                  value={bar}
                  onChange={(e) => setBar(e.target.value)}
                  className="luxe-input"
                />
              </Field>
              <Field label="Gesamt (€)">
                <input
                  readOnly
                  value={formatEUR(
                    (Number(anzahlung.replace(",", ".")) || 0) + (Number(bar.replace(",", ".")) || 0),
                  )}
                  className="luxe-input opacity-70"
                />
              </Field>
              <div className="md:col-span-2 lg:col-span-3">
                <Field label="Notiz (optional)">
                  <input
                    value={notiz}
                    onChange={(e) => setNotiz(e.target.value)}
                    className="luxe-input"
                    placeholder="z. B. Session 2 Std., Duo, etc."
                  />
                </Field>
              </div>
            </div>

            {formError && (
              <div className="text-sm text-bordeaux bg-bordeaux/10 border border-bordeaux/30 p-3">{formError}</div>
            )}

            <button type="submit" disabled={createMut.isPending} className="btn-gold inline-flex items-center gap-2">
              <Plus size={16} />
              {createMut.isPending ? "Speichere…" : "Eintrag speichern"}
            </button>
          </form>

          {/* Liste */}
          <div className="bg-card border border-champagne/20">
            <div className="p-6 md:p-8 border-b border-champagne/15 flex items-baseline justify-between gap-4 flex-wrap">
              <h2 className="text-xs uppercase tracking-[0.25em] text-champagne">Einträge</h2>
              <div className="text-xs text-vanilla/60">
                Summe Anzahlung <span className="text-vanilla">{formatEUR(totals.anzahlung)}</span>
                <span className="mx-2 text-champagne/40">·</span>
                Bar <span className="text-vanilla">{formatEUR(totals.bar)}</span>
                <span className="mx-2 text-champagne/40">·</span>
                Gesamt <span className="text-champagne">{formatEUR(totals.gesamt)}</span>
              </div>
            </div>

            {isLoading ? (
              <div className="p-8 text-vanilla/60">Lade…</div>
            ) : error ? (
              <div className="p-8 text-bordeaux">
                Fehler: {error instanceof Error ? error.message : "Unbekannt"}
              </div>
            ) : entries.length === 0 ? (
              <div className="p-8 text-vanilla/60">Noch keine Einträge.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-widest text-vanilla/50">
                    <tr className="border-b border-champagne/15">
                      <th className="text-left p-4">Datum</th>
                      <th className="text-left p-4">Studio</th>
                      <th className="text-left p-4">Kunde</th>
                      <th className="text-right p-4">Anzahlung</th>
                      <th className="text-right p-4">Bar</th>
                      <th className="text-right p-4">Gesamt</th>
                      <th className="text-left p-4">Notiz</th>
                      <th className="p-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} className="border-b border-champagne/10 hover:bg-anthracite/40">
                        <td className="p-4 whitespace-nowrap">
                          {format(parseISO(e.datum), "dd.MM.yyyy", { locale: de })}
                        </td>
                        <td className="p-4">
                          {e.studio}
                          {e.source === "booking" && (
                            <span className="ml-2 align-middle text-[9px] uppercase tracking-widest text-champagne/80 border border-champagne/30 px-1.5 py-0.5">
                              Termin
                            </span>
                          )}
                        </td>
                        <td className="p-4">{e.kunde}</td>
                        <td className="p-4 text-right tabular-nums">
                          {formatEUR(Number(e.anzahlung))}
                          {e.anzahlung_method && (
                            <div className="text-[0.65rem] uppercase tracking-widest text-champagne/70 mt-0.5">
                              {e.anzahlung_method}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right tabular-nums">{formatEUR(Number(e.bar))}</td>
                        <td className="p-4 text-right tabular-nums text-champagne">{formatEUR(Number(e.gesamt))}</td>
                        <td className="p-4 text-vanilla/70">{e.notiz ?? "—"}</td>
                        <td className="p-4 text-right">
                          {e.source === "manual" ? (
                            <button
                              onClick={() => {
                                if (confirm("Eintrag wirklich löschen?")) deleteMut.mutate(e.id);
                              }}
                              className="text-vanilla/50 hover:text-bordeaux"
                              title="Löschen"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <span className="text-vanilla/30 text-xs">auto</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      <style>{`
        .luxe-input {
          width: 100%;
          background: color-mix(in oklab, var(--color-anthracite) 60%, transparent);
          border: 1px solid color-mix(in oklab, var(--color-champagne) 25%, transparent);
          color: var(--color-vanilla);
          padding: 0.6rem 0.75rem;
          font-size: 0.9rem;
          outline: none;
        }
        .luxe-input:focus {
          border-color: var(--color-champagne);
        }
      `}</style>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="block text-[10px] uppercase tracking-[0.25em] text-vanilla/55">{label}</span>
      {children}
    </label>
  );
}
