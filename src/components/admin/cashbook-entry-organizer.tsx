import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, MinusCircle, Plus, PlusCircle } from "lucide-react";
import { createAdvertisingExpense, createCashBookEntry, createOtherExpense, createStudioRentExpense } from "@/lib/cashbook.functions";

const today = () => new Date().toISOString().slice(0, 10);
const METHODS = ["Bar", "PayPal", "Überweisung", "Karte", "Sonstige"] as const;
type IncomeKind = "external" | "financial_slave" | "custom";
type ExpenseKind = "studio" | "advertising" | "other";
const parseAmount = (value: string) => Number(value.trim().replace(/\s/g, "").replace(",", "."));

export function CashbookEntryOrganizer() {
  const qc = useQueryClient();
  const createIncome = useServerFn(createCashBookEntry);
  const createStudioExpense = useServerFn(createStudioRentExpense);
  const createAdvertising = useServerFn(createAdvertisingExpense);
  const createOther = useServerFn(createOtherExpense);
  const [mode, setMode] = useState<"income" | "expense" | null>(null);
  const [incomeKind, setIncomeKind] = useState<IncomeKind | null>(null);
  const [expenseKind, setExpenseKind] = useState<ExpenseKind | null>(null);
  const [date, setDate] = useState(today());
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [value, setValue] = useState("");
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");
  const [purpose, setPurpose] = useState("");

  const reset = () => { setDate(today()); setName(""); setPlace(""); setValue(""); setMethod(""); setNote(""); setPurpose(""); };
  const title = useMemo(() => mode === "income"
    ? incomeKind === "external" ? "Externer Termin" : incomeKind === "financial_slave" ? "Zahlsklave" : incomeKind === "custom" ? "Custom" : ""
    : expenseKind === "studio" ? "Studiomiete" : expenseKind === "advertising" ? "Werbung" : expenseKind === "other" ? "Sonstige Ausgabe" : "", [mode, incomeKind, expenseKind]);

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = parseAmount(value);
      if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("Bitte einen gültigen Betrag größer als 0 € eingeben.");
      if (!method.trim()) throw new Error("Bitte eine Zahlungsart auswählen.");

      if (mode === "income") {
        if (!incomeKind || !name.trim()) throw new Error("Bitte Kategorie und Name ausfüllen.");
        const studio = incomeKind === "financial_slave" ? "Zahlsklave" : incomeKind === "custom" ? "Custom Content" : place.trim() || "Externer Termin";
        const categoryNote = incomeKind === "financial_slave" ? "Zahlsklave" : incomeKind === "custom" ? ["Custom Content", note.trim()].filter(Boolean).join(" · ") : note.trim() || null;
        return createIncome({ data: { studio, datum: date, kunde: name.trim(), anzahlung: parsed, anzahlung_method: method.trim(), anzahlung_datum: date, bar: 0, restzahlung_method: null, restzahlung_datum: null, notiz: categoryNote } });
      }

      if (expenseKind === "studio") {
        if (!place.trim()) throw new Error("Bitte das Studio eintragen.");
        return createStudioExpense({ data: { studio: place.trim(), datum: date, betrag: parsed, zahlungsart: method.trim(), notiz: note.trim() || null } });
      }
      if (expenseKind === "advertising") {
        if (!place.trim()) throw new Error("Bitte Anbieter oder Kanal eintragen.");
        return createAdvertising({ data: { studio: place.trim(), datum: date, betrag: parsed, zahlungsart: method.trim(), notiz: note.trim() || null } });
      }
      if (expenseKind === "other") {
        if (!purpose.trim()) throw new Error("Bitte eintragen, wofür die Ausgabe war.");
        return createOther({ data: { purpose: purpose.trim(), datum: date, betrag: parsed, zahlungsart: method.trim(), notiz: note.trim() || null } });
      }
      throw new Error("Bitte eine Kategorie auswählen.");
    },
    onSuccess: async () => { reset(); await qc.invalidateQueries({ queryKey: ["cashbook"] }); },
  });

  return <div className="bg-card border border-champagne/25 p-3 md:p-4 space-y-3">
    <div className="flex items-center justify-between gap-3"><div className="eyebrow text-champagne">Eintrag hinzufügen</div><span className="hidden sm:inline text-[11px] text-vanilla/45">Einnahme oder Ausgabe wählen</span></div>
    <div className="grid grid-cols-2 gap-2">
      <button type="button" onClick={() => { setMode(mode === "income" ? null : "income"); setIncomeKind(null); setExpenseKind(null); reset(); }} className={`flex items-center justify-between border px-3 py-2.5 text-sm ${mode === "income" ? "border-champagne bg-champagne/10 text-champagne" : "border-champagne/25"}`}><span className="flex items-center gap-2"><PlusCircle size={16}/><span>Einnahme</span></span><ChevronDown size={14}/></button>
      <button type="button" onClick={() => { setMode(mode === "expense" ? null : "expense"); setIncomeKind(null); setExpenseKind(null); reset(); }} className={`flex items-center justify-between border px-3 py-2.5 text-sm ${mode === "expense" ? "border-bordeaux/70 bg-bordeaux/10 text-champagne" : "border-bordeaux/30"}`}><span className="flex items-center gap-2"><MinusCircle size={16}/><span>Ausgabe</span></span><ChevronDown size={14}/></button>
    </div>

    {mode === "income" && <div className="space-y-3 border-t border-champagne/15 pt-3">
      <div className="grid grid-cols-3 gap-1.5">{([['external','Extern'],['financial_slave','Zahlsklave'],['custom','Custom']] as const).map(([key,label]) => <button key={key} type="button" onClick={() => { setIncomeKind(key); reset(); }} className={`border px-2 py-2 text-[10px] uppercase tracking-[0.08em] ${incomeKind === key ? "border-champagne bg-champagne/10 text-champagne" : "border-champagne/20 text-vanilla/65"}`}>{label}</button>)}</div>
      {incomeKind && <EntryForm mode="income" title={title} date={date} setDate={setDate} name={name} setName={setName} place={place} setPlace={setPlace} value={value} setValue={setValue} method={method} setMethod={setMethod} note={note} setNote={setNote} showPlace={incomeKind === "external"} placeLabel="Studio / Ort" pending={mutation.isPending} error={mutation.error} onSubmit={() => mutation.mutate()} />}
    </div>}

    {mode === "expense" && <div className="space-y-3 border-t border-champagne/15 pt-3">
      <div className="grid grid-cols-3 gap-1.5">{([['studio','Studio'],['advertising','Werbung'],['other','Sonstiges']] as const).map(([key,label]) => <button key={key} type="button" onClick={() => { setExpenseKind(key); reset(); }} className={`border px-2 py-2 text-[10px] uppercase tracking-[0.08em] ${expenseKind === key ? "border-bordeaux/70 bg-bordeaux/10 text-champagne" : "border-bordeaux/25 text-vanilla/65"}`}>{label}</button>)}</div>
      {expenseKind && <EntryForm mode="expense" title={title} date={date} setDate={setDate} name={name} setName={setName} place={place} setPlace={setPlace} value={value} setValue={setValue} method={method} setMethod={setMethod} note={note} setNote={setNote} showPlace={expenseKind !== "other"} placeLabel={expenseKind === "studio" ? "Studio" : "Anbieter / Kanal"} showPurpose={expenseKind === "other"} purpose={purpose} setPurpose={setPurpose} pending={mutation.isPending} error={mutation.error} onSubmit={() => mutation.mutate()} />}
    </div>}
  </div>;
}

function EntryForm(props: { mode:"income"|"expense"; title:string; date:string; setDate:(v:string)=>void; name:string; setName:(v:string)=>void; place:string; setPlace:(v:string)=>void; value:string; setValue:(v:string)=>void; method:string; setMethod:(v:string)=>void; note:string; setNote:(v:string)=>void; showPlace:boolean; placeLabel:string; showPurpose?:boolean; purpose?:string; setPurpose?:(v:string)=>void; pending:boolean; error:unknown; onSubmit:()=>void }) {
  return <form onSubmit={e => { e.preventDefault(); props.onSubmit(); }} className="border border-champagne/15 p-3 space-y-3"><div className="font-display text-lg text-champagne">{props.title}</div><div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
    <Field label={props.mode === "income" ? "Bezahlt am" : "Datum"}><input required type="date" value={props.date} onChange={e=>props.setDate(e.target.value)} className="luxe-input"/></Field>
    {props.mode === "income" && <Field label="Name"><input required value={props.name} onChange={e=>props.setName(e.target.value)} className="luxe-input"/></Field>}
    {props.showPlace && <Field label={props.placeLabel}><input required value={props.place} onChange={e=>props.setPlace(e.target.value)} className="luxe-input"/></Field>}
    {props.showPurpose && <Field label="Wofür?"><input required value={props.purpose ?? ""} onChange={e=>props.setPurpose?.(e.target.value)} placeholder="z. B. Deko" className="luxe-input"/></Field>}
    <Field label="Betrag (€)"><input required inputMode="decimal" value={props.value} onChange={e=>props.setValue(e.target.value)} placeholder="0,00" className="luxe-input"/></Field>
    <Field label={props.mode === "income" ? "Zahlungsart" : "Bezahlt mit"}><select required value={props.method} onChange={e=>props.setMethod(e.target.value)} className="luxe-input"><option value="">Auswählen</option>{METHODS.map(m=><option key={m}>{m}</option>)}</select></Field>
    <div className="col-span-2 lg:col-span-4"><Field label="Notiz (optional)"><input value={props.note} onChange={e=>props.setNote(e.target.value)} className="luxe-input"/></Field></div>
  </div><button disabled={props.pending} className="btn-gold inline-flex gap-2 !px-3 !py-2 text-sm"><Plus size={14}/>{props.pending ? "Speichere…" : "Speichern"}</button>{props.error instanceof Error && <p className="text-sm text-bordeaux">{props.error.message}</p>}</form>;
}

function Field({ label, children }: { label:string; children:ReactNode }) { return <label className="block space-y-1"><span className="block text-[9px] uppercase tracking-[.16em] text-vanilla/55">{label}</span>{children}</label>; }
