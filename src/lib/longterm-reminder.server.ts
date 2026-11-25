/**
 * Erinnert per Push 3 Tage bevor eine Langzeiterziehung ausläuft.
 * Jede Erinnerung wird nur einmal verschickt (Merker in site_content).
 */
export async function sendLongtermExpiryReminders(supabaseAdmin: any) {
  const { data, error } = await supabaseAdmin
    .from("cash_book_entries")
    .select("kunde, datum, notiz")
    .eq("studio", "Langzeiterziehung")
    .order("datum", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);

  const addOneMonth = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    const t = new Date(Date.UTC(y, m, d));
    if (t.getUTCDate() !== d) t.setUTCDate(0);
    return t.toISOString().slice(0, 10);
  };
  const latest = new Map<string, { kunde: string; bis: string; paket: string }>();
  for (const row of data ?? []) {
    const note = String(row.notiz ?? "");
    const m = note.match(/Laufzeit bis\s+(\d{2})\.(\d{2})\.(\d{4})/);
    const bis = m ? `${m[3]}-${m[2]}-${m[1]}` : addOneMonth(row.datum);
    const paket = note.match(/Paket\s+([^·\n]+)/)?.[1]?.trim() ?? "Individuell";
    const kunde = String(row.kunde ?? "").trim();
    if (!kunde) continue;
    const key = kunde.toLowerCase();
    const prev = latest.get(key);
    if (!prev || bis > prev.bis) latest.set(key, { kunde, bis, paket });
  }

  const todayKey = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const days = (key: string) => Math.round((Date.parse(`${key}T12:00:00Z`) - Date.parse(`${todayKey}T12:00:00Z`)) / 86_400_000);
  const due = [...latest.values()].filter((c) => { const d = days(c.bis); return d >= 0 && d <= 3; });
  if (!due.length) return { sent: 0 };

  const { sendAdminPush } = await import("./push-notifications.server");
  let sent = 0;
  for (const c of due) {
    const slug = `longterm-reminder:${c.kunde.toLowerCase().replace(/\s+/g, "-")}:${c.bis}`;
    const { data: marker } = await supabaseAdmin.from("site_content").select("slug").eq("slug", slug).maybeSingle();
    if (marker) continue;
    const [y, m, d] = c.bis.split("-");
    const left = days(c.bis);
    await sendAdminPush({
      title: "Langzeiterziehung läuft aus",
      body: `${c.kunde} (${c.paket}) · ${left === 0 ? "endet heute" : `noch ${left} Tag${left === 1 ? "" : "e"}`} – bis ${d}.${m}.${y}`,
      url: "/admin/terminplan",
      tag: slug,
    });
    await supabaseAdmin.from("site_content").upsert({ slug, body: new Date().toISOString(), updated_at: new Date().toISOString() });
    sent++;
  }
  return { sent };
}
