import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/_authenticated/admin.index.tsx";
let text = readFileSync(path, "utf8");

if (!text.includes('listCashBookEntries')) {
  text = text.replace(
    'import { createStudio, deleteStudio, listStudios } from "@/lib/studio.functions";',
    'import { createStudio, deleteStudio, listStudios } from "@/lib/studio.functions";\nimport { listCashBookEntries } from "@/lib/cashbook.functions";',
  );
}

if (!text.includes('queryKey: ["admin-dashboard-cashbook"]')) {
  text = text.replace(
    'function DashboardOverview() {\n  const [detail, setDetail] = useState<DetailKind>(null);',
    'function DashboardOverview() {\n  const [detail, setDetail] = useState<DetailKind>(null);\n  const listCashbook = useServerFn(listCashBookEntries);\n  const cashbookQ = useQuery({\n    queryKey: ["admin-dashboard-cashbook"],\n    queryFn: () => listCashbook(),\n  });',
  );
}

const oldRevenue = `  const monthRevenue = (q.data ?? []).reduce((sum, booking) => {
    let received = 0;
    if (booking.anzahlung_paid && Number(booking.anzahlung ?? 0) > 0 && booking.anzahlung_paid_at && isWithinInterval(new Date(booking.anzahlung_paid_at), currentMonth)) {
      received += Number(booking.anzahlung);
    }
    const cashDate = booking.cash_received_at ?? (booking.fully_paid ? booking.completed_at : null);
    if (Number(booking.bar ?? 0) > 0 && cashDate && isWithinInterval(new Date(cashDate), currentMonth)) {
      received += Number(booking.bar);
    }
    return sum + received;
  }, 0);`;

const newRevenue = `  const monthKey = format(now, "yyyy-MM");
  const monthRevenue = (cashbookQ.data ?? [])
    .filter((entry) => entry.entry_type === "income")
    .reduce((sum, entry) => {
      if (entry.source === "manual") {
        return entry.payment_date?.startsWith(monthKey) ? sum + Number(entry.gesamt ?? 0) : sum;
      }
      const deposit = entry.anzahlung_datum?.startsWith(monthKey) ? Number(entry.anzahlung ?? 0) : 0;
      const cash = entry.bar_datum?.startsWith(monthKey) ? Number(entry.bar ?? 0) : 0;
      return sum + deposit + cash;
    }, 0);`;

if (text.includes(oldRevenue)) {
  text = text.replace(oldRevenue, newRevenue);
}

text = text.replace(
  '{q.isLoading ? <p className="text-sm text-vanilla/50">Offene Anfragen werden geladen…</p>',
  '{q.isLoading || cashbookQ.isLoading ? <p className="text-sm text-vanilla/50">Dashboard wird geladen…</p>',
);
text = text.replace(
  ': q.isError ? <p className="text-sm text-bordeaux">Offene Anfragen konnten nicht geladen werden.</p>',
  ': q.isError || cashbookQ.isError ? <p className="text-sm text-bordeaux">Dashboard konnte nicht vollständig geladen werden.</p>',
);

if (!text.includes('queryKey: ["admin-dashboard-cashbook"]') || !text.includes('const monthKey = format(now, "yyyy-MM")')) {
  throw new Error("Dashboard-Umsatz konnte nicht auf Kassenbuchdaten umgestellt werden.");
}

writeFileSync(path, text);
console.log("Admin dashboard revenue now uses cashbook totals.");
