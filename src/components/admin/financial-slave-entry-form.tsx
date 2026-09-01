import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, MinusCircle, Plus, PlusCircle } from "lucide-react";
import { createCashBookEntry, createStudioRentExpense } from "@/lib/cashbook.functions";

const today = () => new Date().toISOString().slice(0, 10);
const PAYMENT_METHODS = ["PayPal", "Überweisung", "Bar", "Kreditkarte", "EC-/Debitkarte", "Sofortüberweisung", "Sonstiges"] as const;
type IncomeKind = "external" | "financial_slave" | "custom";
type ExpenseKind = "studio" | "advertising" | "other";

function parseEuroAmount(value: string) {
  const compact = value.trim().replace(/[\s€]/g, "");
  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  const decimalSeparator = lastComma > lastDot ? "," : lastDot >= 0 ? "." : null;
  if (!decimalSeparator) return Number(compact.replace(/[.,]/g, ""));
  const separatorIndex = compact.lastIndexOf(decimalSeparator);
  const integerPart = compact.slice(0, separatorIndex).replace(/[.,]/g, "");
  const decimalPart = compact.slice(separatorIndex + 1).replace(/[.,]/g, "");
  return Number(`${integerPart}.${decimalPart}`);
}

export function FinancialSlaveEntryForm() {
  const qc = useQueryClient();
  const createIncome = useServerFn(createCashBookEntry);
  const createExpense = useServerFn(createStudioRentExpense);
  const [mode, setMode] = useState<"income" | "expense" | null>(null);
  const [incomeKind, setIncomeKind] = useState<IncomeKind | null>(null);
  const [expenseKind, setExpenseKind] = useState<ExpenseKind | null>(null);
  const [date, setDate] = useState(today());
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [customPaymentMethod, setCustomPaymentMethod] = useState("");
  const [note, setNote] = useState("");
  const [purpose, setPurpose] = useState("");

  const reset = () => {
    setDate(today()); setName(""); setPlace(""); setAmount(""); setPaymentMethod("");
    setCustomPaymentMethod(""); setNote(""); setPurpose("");
  };

  const title = useMemo(() => mode === "income"
    ? incomeKind === "external" ? "Externer Termin" : incomeKind === "financial_slave" ? "Zahlsklave" : incomeKind === "custom" ? "Custom" : ""
    : expenseKind === "studio" ? "Studiomiete" : expenseKind === "advertising" ? "Werbung" : expenseKind === "other" ? "Sonstige Ausgabe" : "",
  [mode, incomeKind, expenseKind]);

  const mutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = parseEuroAmount(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) throw new Error("Bitte gib einen gültigen Betrag größer als 0 € ein.");
      const method = paymentMethod === "Sonstiges" ? customPaymentMethod.trim() : paymentMethod;
      if (!method) throw new Error("Bitte wähle eine Zahlungsart aus.");

      if (mode === "income") {
        if (!incomeKind || !name.trim()) throw new Error("Bitte Kategorie und Name ausfüllen.");
        if (incomeKind === "external" && !place.trim()) throw new Error("Bitte Studio oder Ort eintragen.");
        const studio = incomeKind === "financial_slave" ? "Zahlsklave" : incomeKind === "custom" ? "Custom Content" : place.trim();
        const categoryNote = incomeKind === "financial_slave"
          ? ["Zahlsklave", note.trim()].filter(Boolean).join(" · ")
          : incomeKind === "custom"
            ? ["Custom Content", note.trim()].filter(Boolean).join(" · ")
            : note.trim();
        return createIncome({ data: {
          studio, datum: date, kunde: name.trim(), anzahlung: parsedAmount, anzahlung_method: method,
          anzahlung_datum: date, bar: 0, restzahlung_method: null, restzahlung_datum: null,
          notiz: categoryNote || null,
        } });
      }

      if (!expenseKind) throw new Error("Bitte eine Ausgabenkategorie auswählen.");
      let studio = "";
      let categoryNote = note.trim();
      if (expenseKind === "studio") {
        if (!place.trim()) throw new Error("Bitte das Studio eintragen.");
        studio = place.trim();
      } else if (expenseKind === "advertising") {
        if (!place.trim()) throw new Error("Bitte Anbieter oder Kanal eintragen.");
        studio = `Werbung · ${place.trim()}`;
        categoryNote = [`[KATEGORIE:Werbung]`, note.trim()].filter(Boolean).join(" ");
      } else {
        if (!purpose.trim()) throw new Error("Bitte eintragen, wofür die Ausgabe war.");
        studio = `Sonstiges · ${purpose.trim()}`;
        categoryNote = [`[KATEGORIE:Sonstiges]`, note.trim()].filter(Boolean).join(" ");
      }
      return createExpense({ data: { studio, datum: date, betrag: parsedAmount, zahlungsart: method, notiz: categoryNote || null } });
    },
    onSuccess: async () => {
      reset();
      await qc.invalidateQueries({ queryKey: ["cashbook"] });
    },
  });

  return (
    <div className="cashbook-organizer-anchor bg-card border border-champagne/30 p-4 md:p-5 space-y-4">
      <style>{`.cashbook-organizer-anchor ~ form{display:none!important}`}</style>
      <div>
        <div className="eyebrow text-champagne">Eintrag hinzufügen</div>
        <p className="mt-1 text-xs text-vanilla/50">Einnahmen und Ausgaben sind klar getrennt und öffnen sich erst nach Auswahl.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <button type="button" onClick={() => { setMode(mode === "income" ? null : "income"); setIncomeKind(null); setExpenseKind(null); reset(); }} className={`flex items-center justify-between border px-4 py-4 ${mode === "income" ? "border-champagne bg-champagne/10 text-champagne" : "border-champagne/25"}`}>
          <span className="flex items-center gap-2"><PlusCircle size={18} />Einnahmen hinzufügen</span><ChevronDown size={16} />
        </button>
        <button type="button" onClick={() => { setMode(mode === "expense" ? null : "expense"); setIncomeKind(null); setExpenseKind(null); reset(); }} className={`flex items-center justify-between border px-4 py-4 ${mode === "expense" ? "border-bordeaux/70 bg-bordeaux/10 text-champagne" : "border-bordeaux/30"}`}>
          <span className="flex items-center gap-2"><MinusCircle size={18} />Ausgaben hinzufügen</span><ChevronDown size={16} />
        </button>
      </div>

      {mode === "income" && <div className="space-y-4 border-t border-champagne/15 pt-4">
        <div className="grid grid-cols-3 gap-2">{([['external','Externer Termin'],['financial_slave','Zahlsklave'],['custom','Custom']] as const).map(([key,label]) => (
          <button key={key} type="button" onClick={() => { setIncomeKind(key); reset(); }} className={`border px-2 py-3 text-[10px] sm:text-xs uppercase tracking-[0.08em] ${incomeKind === key ? "border-champagne bg-champagne/10 text-champagne" : "border-champagne/20 text-vanilla/65"}`}>{label}</button>
        ))}</div>
        {incomeKind && <EntryFields title={title} mode="income" date={date} setDate={setDate} name={name} setName={setName} place={place} setPlace={setPlace} amount={amount} setAmount={setAmount} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} customPaymentMethod={customPaymentMethod} setCustomPaymentMethod={setCustomPaymentMethod} note={note} setNote={setNote} showPlace={incomeKind === "external"} placeLabel="Studio / Ort" pending={mutation.isPending} error={mutation.error} onSubmit={() => mutation.mutate()} />}
      </div>}

      {mode === "expense" && <div className="space-y-4 border-t border-champagne/15 pt-4">
        <div className="grid grid-cols-3 gap-2">{([['studio','Studiomiete'],['advertising','Werbung'],['other','Sonstiges']] as const).map(([key,label]) => (
          <button key={key} type="button" onClick={() => { setExpenseKind(key); reset(); }} className={`border px-2 py-3 text-[10px] sm:text-xs uppercase tracking-[0.08em] ${expenseKind === key ? "border-bordeaux/70 bg-bordeaux/10 text-champagne" : "border-bordeaux/25 text-vanilla/65"}`}>{label}</button>
        ))}</div>
        {expenseKind && <EntryFields title={title} mode="expense" date={date} setDate={setDate} name={name} setName={setName} place={place} setPlace={setPlace} amount={amount} setAmount={setAmount} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} customPaymentMethod={customPaymentMethod} setCustomPaymentMethod={setCustomPaymentMethod} note={note} setNote={setNote} showPlace={expenseKind !== "other"} placeLabel={expenseKind === "studio" ? "Studio" : "Anbieter / Kanal"} purpose={purpose} setPurpose={setPurpose} showPurpose={expenseKind === "other"} pending={mutation.isPending} error={mutation.error} onSubmit={() => mutation.mutate()} />}
      </div>}
    </div>
  );
}

function EntryFields(props: {
  title:string; mode:"income"|"expense"; date:string; setDate:(v:string)=>void; name:string; setName:(v:string)=>void;
  place:string; setPlace:(v:string)=>void; amount:string; setAmount:(v:string)=>void; paymentMethod:string; setPaymentMethod:(v:string)=>void;
  customPaymentMethod:string; setCustomPaymentMethod:(v:string)=>void; note:string; setNote:(v:string)=>void; showPlace:boolean; placeLabel:string;
  purpose?:string; setPurpose?:(v:string)=>void; showPurpose?:boolean; pending:boolean; error:unknown; onSubmit:()=>void;
}) {
  return <form onSubmit={(event) => { event.preventDefault(); props.onSubmit(); }} className="border border-champagne/15 p-4 space-y-4">
    <div className="font-display text-xl text-champagne">{props.title}</div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Field label={props.mode === "income" ? "Bezahlt am" : "Datum"}><input required type="date" value={props.date} onChange={e => props.setDate(e.target.value)} className="luxe-input" /></Field>
      {props.mode === "income" && <Field label="Name"><input required value={props.name} onChange={e => props.setName(e.target.value)} className="luxe-input" /></Field>}
      {props.showPlace && <Field label={props.placeLabel}><input required value={props.place} onChange={e => props.setPlace(e.target.value)} className="luxe-input" /></Field>}
      {props.showPurpose && <Field label="Wofür war die Ausgabe?"><input required value={props.purpose ?? ""} onChange={e => props.setPurpose?.(e.target.value)} placeholder="z. B. Deko, Fahrt, Software" className="luxe-input" /></Field>}
      <Field label="Betrag (€)"><input required inputMode="decimal" value={props.amount} onChange={e => props.setAmount(e.target.value)} placeholder="0,00" className="luxe-input" /></Field>
      <Field label={props.mode === "income" ? "Zahlungsart" : "Bezahlt mit"}><select required value={props.paymentMethod} onChange={e => { props.setPaymentMethod(e.target.value); if (e.target.value !== "Sonstiges") props.setCustomPaymentMethod(""); }} className="luxe-input"><option value="">Auswählen</option>{PAYMENT_METHODS.map(method => <option key={method}>{method}</option>)}</select></Field>
      {props.paymentMethod === "Sonstiges" && <Field label="Andere Zahlungsart"><input required value={props.customPaymentMethod} onChange={e => props.setCustomPaymentMethod(e.target.value)} className="luxe-input" /></Field>}
      <div className="sm:col-span-2 lg:col-span-4"><Field label="Notiz (optional)"><input value={props.note} onChange={e => props.setNote(e.target.value)} className="luxe-input" /></Field></div>
    </div>
    <button disabled={props.pending} className="btn-gold inline-flex gap-2"><Plus size={15} />{props.pending ? "Speichere…" : `${props.title} speichern`}</button>
    {props.error instanceof Error && <p className="text-sm text-bordeaux">{props.error.message}</p>}
  </form>;
}

function Field({ label, children }: { label:string; children:ReactNode }) {
  return <label className="block space-y-1.5"><span className="block text-[10px] uppercase tracking-[.2em] text-vanilla/55">{label}</span>{children}</label>;
}
