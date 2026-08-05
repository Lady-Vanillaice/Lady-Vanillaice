import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import { createCashBookEntry } from "@/lib/cashbook.functions";

const today = () => new Date().toISOString().slice(0, 10);

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

export function FinancialSlaveEntryForm() {
  const qc = useQueryClient();
  const create = useServerFn(createCashBookEntry);
  const [date, setDate] = useState(today());
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = parseEuroAmount(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Bitte gib einen gültigen Betrag größer als 0 € ein.");
      }

      return create({
        data: {
          studio: "Zahlsklave",
          datum: date,
          kunde: name.trim(),
          anzahlung: parsedAmount,
          anzahlung_method: paymentMethod.trim(),
          bar: 0,
          notiz: "Zahlsklave",
        },
      });
    },
    onSuccess: async () => {
      setName("");
      setAmount("");
      setPaymentMethod("");
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
        <h2 className="eyebrow">Zahlsklave</h2>
        <p className="mt-1 text-xs text-vanilla/50">Das ausgewählte Zahlungsdatum wird als Einnahmedatum im Kassenbuch gespeichert.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block space-y-1.5">
          <span className="block text-[10px] uppercase tracking-[.2em] text-vanilla/55">Datum</span>
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
          <span className="block text-[10px] uppercase tracking-[.2em] text-vanilla/55">Bezahlt mit</span>
          <input
            required
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
            placeholder="Bar, PayPal, Überweisung …"
            className="luxe-input"
          />
        </label>
      </div>
      <button disabled={mutation.isPending} className="btn-gold inline-flex gap-2">
        <Plus size={15} />
        {mutation.isPending ? "Speichere…" : "Zahlsklave speichern"}
      </button>
      {mutation.error && <p className="text-sm text-bordeaux">{(mutation.error as Error).message}</p>}
    </form>
  );
}
