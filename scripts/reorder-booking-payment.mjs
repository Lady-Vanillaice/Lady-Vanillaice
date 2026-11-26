// Läuft als letzter Patch vor dem Build: ordnet im Reiter „Zahlung“ der
// Buchungsdetails die Felder neu – erst alles zur Anzahlung, darunter alles
// zur Restzahlung. Logik und Zustände bleiben unverändert.
import fs from "node:fs";

const path = "src/routes/_authenticated/admin.buchung.$id.tsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes("data-payment-layout=\"split\"")) {
  console.log("[payment-layout] already applied");
  process.exit(0);
}

const section = source.indexOf("{/* ZAHLUNG — normale Sessions */}");
const startMarker = `            <div className="grid grid-cols-2 gap-3">\n              <div className="col-span-2">`;
const endMarker = `            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">`;
const start = section >= 0 ? source.indexOf(startMarker, section) : -1;
const end = start >= 0 ? source.indexOf(endMarker, start) : -1;

if (start < 0 || end < 0) {
  console.warn("[payment-layout] skipped: payment fields not found");
  process.exit(0);
}

const label = `text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/45 block mb-1`;

const layout = `            <div data-payment-layout="split" className="space-y-4">
              {/* ANZAHLUNG */}
              <div className="border border-champagne/25 bg-anthracite/30 p-4 space-y-3">
                <div className="eyebrow text-champagne">1 · Anzahlung</div>
                <div>
                  <label className="${label}">Anzahlungsregel</label>
                  <select
                    value={depositExemptionReason}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDepositExemptionReason(value);
                      if (value) {
                        setAnzahlungInput("0");
                        setAnzahlungMethod("");
                        setAnzahlungPaidDate("");
                      }
                    }}
                    className="input-luxe w-full"
                  >
                    <option value="">Normale Anzahlung</option>
                    <option value="regular_customer">Keine Anzahlung – Stammkunde</option>
                    <option value="trust">Keine Anzahlung – Vertrauensbasis</option>
                    <option value="exception">Keine Anzahlung – Ausnahme</option>
                    <option value="colleague_guarantees">Keine Anzahlung – Kollegin bürgt</option>
                    <option value="spontaneous">Keine Anzahlung – Spontaner Termin</option>
                  </select>
                </div>
                {depositExemptionReason ? (
                  <div className="border border-green-700/40 bg-green-700/10 px-3 py-3 text-sm text-green-200">
                    Nicht erforderlich – für diesen Termin wurde keine Anzahlung vereinbart.
                  </div>
                ) : (<>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="${label}">Betrag (€)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={anzahlungInput}
                        onChange={(e) => changeDepositAmount(e.target.value)}
                        placeholder="0"
                        className="input-luxe w-full"
                      />
                    </div>
                    <div>
                      <label className="${label}">Erhalten am</label>
                      <input
                        type="date"
                        value={anzahlungPaidDate}
                        onChange={(e) => setAnzahlungPaidDate(e.target.value)}
                        className="input-luxe w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="${label}">Zahlungsart</label>
                    <div className="flex flex-wrap gap-2">
                      {["Bank", "PayPal", "Bar", "Sonstige"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnzahlungMethod(opt)}
                          className={\`text-[0.65rem] uppercase tracking-[0.15em] px-3 py-1.5 border transition \${
                            anzahlungMethod === opt
                              ? "border-champagne bg-champagne/15 text-champagne"
                              : "border-champagne/30 text-vanilla/60 hover:border-champagne/60 hover:text-vanilla"
                          }\`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {!["Bank", "PayPal", "Bar", "Sonstige", ""].includes(anzahlungMethod) && (
                      <input
                        type="text"
                        value={anzahlungMethod}
                        onChange={(e) => setAnzahlungMethod(e.target.value)}
                        className="input-luxe w-full mt-2"
                      />
                    )}
                  </div>
                </>)}
              </div>

              {/* RESTZAHLUNG */}
              <div className="border border-champagne/25 bg-anthracite/30 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="eyebrow text-champagne">2 · Restzahlung</div>
                  {booking.cash_received_at ? (
                    <span className="text-[0.6rem] uppercase tracking-[0.14em] bg-green-700/30 text-green-200 px-2 py-1">✓ bezahlt am {format(new Date(booking.cash_received_at), "dd.MM.yyyy", { locale: de })}</span>
                  ) : null}
                </div>
                <p className="text-[0.65rem] text-vanilla/45">Kann auch schon vor dem Termin bezahlt werden – einfach Datum eintragen und speichern.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="${label}">Betrag (€)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={barInput}
                      onChange={(e) => { setBarInput(e.target.value); setPaymentTotalInput(String((Number(anzahlungInput.replace(",", ".")) || 0) + (Number(e.target.value.replace(",", ".")) || 0))); setShortSessionPrice(""); }}
                      placeholder="0"
                      className="input-luxe w-full"
                    />
                  </div>
                  <div>
                    <label className="${label}">Erhalten am</label>
                    <input type="date" value={barPaidDate} onChange={(e) => setBarPaidDate(e.target.value)} className="input-luxe w-full" />
                  </div>
                </div>
                <div>
                  <label className="${label}">Zahlungsart</label>
                  <div className="flex flex-wrap gap-2">
                    {["Bar", "PayPal", "Überweisung", "Karte", "Sonstige"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setRestPaymentMethod(opt)}
                        className={\`text-[0.65rem] uppercase tracking-[0.15em] px-3 py-1.5 border transition \${
                          restPaymentMethod === opt
                            ? "border-champagne bg-champagne/15 text-champagne"
                            : "border-champagne/30 text-vanilla/60 hover:border-champagne/60 hover:text-vanilla"
                        }\`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="${label}">Latex-Aufpreis (€, optional)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={latexInput}
                    onChange={(e) => {
                      const before = parseEuroInput(latexInput);
                      const after = parseEuroInput(e.target.value);
                      const delta = after - before;
                      setLatexInput(e.target.value);
                      if (delta !== 0) {
                        const bar = Number((barInput || "0").replace(",", ".")) || 0;
                        const nextBar = Math.max(0, Math.round((bar + delta) * 100) / 100);
                        setBarInput(String(nextBar));
                        setPaymentTotalInput(String((Number(anzahlungInput.replace(",", ".")) || 0) + nextBar));
                        setShortSessionPrice("");
                      }
                    }}
                    placeholder="z. B. 50"
                    className="input-luxe w-full"
                  />
                  <p className="mt-1 text-[0.65rem] text-vanilla/50">
                    {parseEuroInput(latexInput) > 0
                      ? \`Ist in der Restzahlung enthalten · im Kassenbuch: „+ Latex \${formatEuro(parseEuroInput(latexInput))}“\`
                      : "Wird automatisch zur Restzahlung addiert."}
                  </p>
                </div>
              </div>

              {total ? (
                <p className="text-[0.65rem] text-vanilla/40 leading-relaxed">
                  Standard: {total.toLocaleString("de-DE")} € gesamt ({deposit!.toLocaleString("de-DE")} € Anzahlung + {rest!.toLocaleString("de-DE")} € Restzahlung).
                </p>
              ) : null}
            </div>
`;

source = source.slice(0, start) + layout + source.slice(end);
fs.writeFileSync(path, source);
console.log("[payment-layout] Anzahlung oben, Restzahlung darunter");
