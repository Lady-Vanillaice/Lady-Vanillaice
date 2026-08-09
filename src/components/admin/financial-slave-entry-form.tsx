import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import { createCashBookEntry } from "@/lib/cashbook.functions";

const today = () => new Date().toISOString().slice(0, 10);
const PAYMENT_METHODS = ["PayPal", "Überweisung", "Bar", "Kreditkarte", "EC-/Debitkarte", "Sofortüberweisung", "Sonstiges"] as const;

type SpecialPaymentType = "Zahlsklave" | "Keuschhaltung";

function parseEuroAmount(value: string) {
  const compact = value.trim().replace(/[\s€]/g, "");
  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  const decimalSeparator = lastComma > lastDot ? "," : lastDot >= 0 ? "." : null;

  let normalized = compact;
  if (decimalSeparator) {
    const separatorIndex = compact.lastIndexOf(decimalSeparator);
    const integerPart = compact.slice(0, separatorIndex).replace(/[.,]/g, "");
    const decimalPart = compact.slice(separatorIndex + 1).replace(/[.,]/g, "");
    normalized = `${integerPart}.${decimalPart}`;
  } else {
    normalized = compact.replace(/[.,]/g, "");
  }

  return Number(normalized);
}

function SpecialPaymentEntryForm({ type }: { type: SpecialPaymentType }) {
  const qc = useQueryClient();
  const create = useServerFn(createCashBookEntry);
  const [date, setDate] = useState(today());
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [customPaymentMethod, setCustomPaymentMethod] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = parseEuroAmount(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Bitte gib einen gültigen Betrag größer als 0 € ein.");
      }

      const selectedPaymentMethod = paymentMethod === "Sonstiges" ? customPaymentMethod.trim() : paymentMethod;
      if (!selectedPaymentMethod) {
        throw new Error("Bitte wähle eine Zahlungsart aus.");
      }

      return create({
        data: {
          studio: type,
          datum: date,
          kunde: name.trim(),
          anzahlung: parsedAmount,
          anzahlung_method: selectedPaymentMethod,
          bar: 0,
          notiz: type,
        },
      });
    },
    onSuccess: async () => {
      setName("");
      setAmount("");
      setPaymentMethod("");
      setCustomPaymentMethod("");
      await qc.invalidateQueries({ queryKey: ["cashbook"] });
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
      className="bg-card border border-champagne/40 p-4 space-y-4"
    >
      <div>
        <h2 className="eyebrow">{type}</h2>
        <p className="mt-1 text-xs text-vanilla/50">Das ausgewählte Zahlungsdatum wird als Einnahmedatum im Kassenbuch gespeichert.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block space-y-1.5">
          <span className="block text-[10px] uppercase tracking-[.2em] text-vanilla/55">Bezahlt am</span>
          <input
            required
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="luxe-input"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="block text-[10px] uppercase tracking-[.2em] text-vanilla/55">Name</span>
          <input required value={name} onChange={(event) => setName(event.target.value)} className="luxe-input" />
        </label>
        <label className="block space-y-1.5">
          <span className="block text-[10px] uppercase tracking-[.2em] text-vanilla/55">Betrag (€)</span>
          <input
            required
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="z. B. 100,00"
            className="luxe-input"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="block text-[10px] uppercase tracking-[.2em] text-vanilla/55">Wie bezahlt</span>
          <select
            required
            value={paymentMethod}
            onChange={(event) => {
              setPaymentMethod(event.target.value);
              if (event.target.value !== "Sonstiges") setCustomPaymentMethod("");
            }}
            className="luxe-input"
          >
            <option value="">Bitte auswählen</option>
            {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
          </select>
        </label>
        {paymentMethod === "Sonstiges" && (
          <label className="block space-y-1.5 sm:col-span-2 lg:col-start-4">
            <span className="block text-[10px] uppercase tracking-[.2em] text-vanilla/55">Andere Zahlungsart</span>
            <input
              required
              value={customPaymentMethod}
              onChange={(event) => setCustomPaymentMethod(event.target.value)}
              placeholder="Zahlungsart eingeben"
              className="luxe-input"
            />
          </label>
        )}
      </div>
      <button disabled={mutation.isPending} className="btn-gold inline-flex gap-2">
        <Plus size={15} />
        {mutation.isPending ? "Speichere…" : `${type} speichern`}
      </button>
      {mutation.error && <p className="text-sm text-bordeaux">{(mutation.error as Error).message}</p>}
    </form>
  );
}

export function FinancialSlaveEntryForm() {
  return (
    <>
      <SpecialPaymentEntryForm type="Zahlsklave" />
      <SpecialPaymentEntryForm type="Keuschhaltung" />
    </>
  );
}
