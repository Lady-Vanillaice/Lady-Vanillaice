import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/_authenticated/admin.index.tsx";
let text = readFileSync(path, "utf8");

if (!text.includes("Trash2, Search,")) {
  text = text.replace(
    "  CircleAlert, ArrowRight, ChevronDown, Download, Share, Bell, BellOff, Send, Building2, Plus, Trash2,",
    "  CircleAlert, ArrowRight, ChevronDown, Download, Share, Bell, BellOff, Send, Building2, Plus, Trash2, Search,",
  );
}

const groupsStart = text.indexOf("const HUB_GROUPS: HubGroup[] = [");
const groupsEndMarker = "];\n\nfunction bookingStart";
const groupsEnd = text.indexOf(groupsEndMarker, groupsStart);
if (groupsStart < 0 || groupsEnd < 0) throw new Error("Admin groups not found");
const groups = `const HUB_GROUPS: HubGroup[] = [
  { label: "1 · Heute & Planung", hint: "Alles rund um deinen Arbeitstag", cards: [
    { to: "/admin/terminplan", title: "Terminplan", description: "Deine bestätigten Termine – nach Datum und Uhrzeit.", Icon: CalendarClock },
    { to: "/admin/kalender", title: "Kalender & Verfügbarkeit", description: "Freie Zeiten, Sperren und neue Slots verwalten.", Icon: Calendar },
    { to: "/admin/warteliste", title: "Warteliste", description: "Interessenten für belegte Tage mit Name, E-Mail und möglichem Zeitfenster.", Icon: Users },
  ]},
  { label: "2 · Anfragen & Termine", hint: "Alle eingehenden Buchungsarten an einem Ort", cards: [
    { to: "/admin/termine", title: "Termin-Anfragen", description: "Neu, Umplanen und Storniert – mit Namenssuche. Bestätigte Termine stehen im Terminplan.", Icon: Mail },
    { to: "/admin/duo", title: "Duo-Anfragen", description: "Anfragen für Duo-Sessions.", Icon: Mail },
    { to: "/admin/contentdreh", title: "Content-Dreh-Anfragen", description: "Anfragen für Content-Dreh-Termine.", Icon: Camera },
    { to: "/admin/custom", title: "Custom-Content-Anfragen", description: "Individuelle Custom-Anfragen für Bilder und Videos.", Icon: Sparkles },
    { to: "/admin/fotoshooting", title: "Fotoshooting-Anfragen", description: "TFP- und Pay-Fotoshooting-Anfragen.", Icon: Camera },
  ]},
  { label: "3 · Kunden", hint: "Person finden, Verlauf öffnen, Daten pflegen", cards: [
    { to: "/admin/kunden", title: "Kunden / CRM", description: "Session-Historie, persönliche Notizen, Vorlieben und Tabus.", Icon: Users },
  ]},
  { label: "4 · Geld & Kassenbuch", hint: "Zahlungen und Buchhaltung", cards: [
    { to: "/admin/kassenbuch", title: "Kassenbuch & Zahlungen", description: "Vorauszahlungen, Anzahlungen, Restzahlungen, Ausgaben und Zahlungsarten.", Icon: Wallet },
  ]},
  { label: "5 · Kommunikation & Website", hint: "Nachrichten und Inhalte", cards: [
    { to: "/admin/newsletter", title: "Neue Termine versenden", description: "Neue verfügbare Termine per Newsletter verschicken.", Icon: Send },
    { to: "/admin/erfahrungsberichte", title: "Erfahrungsberichte", description: "Eingegangene Erfahrungsberichte prüfen und freigeben.", Icon: Quote },
    { to: "/admin/agb", title: "AGB bearbeiten", description: "AGB-Text der Website verwalten.", Icon: MessageSquare },
  ]},
];`;
text = text.slice(0, groupsStart) + groups + text.slice(groupsEnd + 2);

const hubStart = text.indexOf("function AdminHubPage() {");
const visitorStatsMarker = "function HomepageVisitorStats() {";
const studioMarker = "function StudioManagement() {";
const visitorStatsStart = text.indexOf(visitorStatsMarker, hubStart);
const hubEnd = visitorStatsStart >= 0 ? visitorStatsStart : text.indexOf(studioMarker, hubStart);
if (hubStart < 0 || hubEnd < 0) throw new Error("AdminHubPage not found");

const hub = `function AdminHubPage() { /* Weitere Admin-Bereiche */
  const navigate = useNavigate();
  // Die Suche wurde auf Wunsch entfernt; alle Bereiche sind immer sichtbar.
  // Die folgende Zeile bleibt als Markierung stehen, damit fix-admin-hub-search.mjs
  // die alte Suche nicht wieder einbaut: const [adminSearch, setAdminSearch] = useState("");
  const adminSearch = "";
  const query = adminSearch;
  const visibleGroups = HUB_GROUPS.map(group => ({
    ...group,
    cards: group.cards.filter(card =>
      !query || \`${'${group.label}'} ${'${group.hint}'} ${'${card.title}'} ${'${card.description}'}\`.toLowerCase().includes(query),
    ),
  })).filter(group => group.cards.length > 0);

  async function onLogout() { await supabase.auth.signOut(); navigate({ to: "/" }); }

  return <>
    <PageHeader
      eyebrow="Admin-Bereich"
      title={<>Alles auf <em className="font-script gold-text not-italic">einen Blick</em></>}
      intro="Einfach von oben nach unten: Heute planen, Anfragen bearbeiten, Kunden finden, Zahlungen verwalten und Website pflegen."
    />
    <section className="py-8 sm:py-12"><div className="container-luxe max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link to="/" className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]">Zur Website</Link>
        <button onClick={onLogout} className="btn-outline-gold !py-2 !px-4 !text-[0.65rem]"><LogOut size={12} /> Abmelden</button>
      </div>

      <section className="mb-10">
        <div className="mb-4">
          <div className="eyebrow">Heute wichtig</div>
          <h2 className="font-display text-2xl sm:text-3xl gold-text mt-1">Dein Tagesüberblick</h2>
        </div>
        <DashboardOverview />
        <HomepageVisitorStats />
        <BusinessStatisticsDashboard />
      </section>

      <section className="mb-12">
        <div className="mb-5 border-b border-champagne/20 pb-4">
          <div className="eyebrow">Alle Funktionen</div>
          <h2 className="font-display text-2xl sm:text-3xl gold-text mt-1">Von A bis Z geordnet</h2>
          <p className="mt-2 text-sm text-vanilla/55 max-w-2xl">Nichts wurde entfernt oder versteckt. Jeder Bereich bleibt direkt sichtbar und ist nach deinem Arbeitsablauf sortiert.</p>
        </div>
        {visibleGroups.length === 0 ? (
          <div className="border border-dashed border-champagne/25 p-6 text-center text-sm text-vanilla/55">Kein Bereich passt zu „{adminSearch}“.</div>
        ) : (
          <div className="space-y-8">{visibleGroups.map(group => <div key={group.label} className="border border-champagne/20 bg-card/40 p-4 sm:p-6">
            <div className="mb-4">
              <h3 className="font-display text-xl sm:text-2xl text-champagne">{group.label}</h3>
              <p className="text-xs text-vanilla/50 mt-1">{group.hint}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{group.cards.map(({ to, title, description, Icon }) => <Link key={to} to={to} className="group border border-champagne/15 bg-anthracite/35 p-4 hover:border-champagne/55 transition">
              <div className="flex items-start gap-3">
                <Icon size={19} className="text-champagne mt-0.5 shrink-0" />
                <div><div className="font-display text-lg text-vanilla group-hover:text-champagne transition">{title}</div><p className="mt-1 text-xs leading-relaxed text-vanilla/50">{description}</p></div>
              </div>
            </Link>)}</div>
          </div>)}</div>
        )}
      </section>

      {!query && <section className="mb-12">
        <div className="mb-5 border-b border-champagne/20 pb-4">
          <div className="eyebrow">Einstellungen & Technik</div>
          <h2 className="font-display text-2xl sm:text-3xl gold-text mt-1">Nur wenn du etwas ändern musst</h2>
          <p className="mt-2 text-sm text-vanilla/55">Studios, App, Benachrichtigungen und Admin-Zugänge – klar getrennt vom Tagesgeschäft.</p>
        </div>
        <StudioManagement />
        <InstallAdminApp />
        <PushNotificationsCard />
        <AdminAccessRequestsPanel />
      </section>}
    </div></section>
  </>;
}

`;
text = text.slice(0, hubStart) + hub + text.slice(hubEnd);

// Preserve the Journal entry after the admin hub redesign; this script runs during Vercel postinstall.
const reviewCard = `    { to: "/admin/erfahrungsberichte", title: "Erfahrungsberichte", description: "Eingegangene Erfahrungsberichte prüfen und freigeben.", Icon: Quote },
    { to: "/admin/journal", title: "Journal", description: "Journalbeiträge als WhatsApp-Statusbild herunterladen.", Icon: BookOpen },`;
const oldReviewCard = `    { to: "/admin/erfahrungsberichte", title: "Erfahrungsberichte", description: "Eingegangene Erfahrungsberichte prüfen und freigeben.", Icon: Quote },`;
if (!text.includes('to: "/admin/journal"')) {
  if (!text.includes(oldReviewCard)) throw new Error("Journal insertion point not found in admin group");
  text = text.replace(oldReviewCard, reviewCard);
}
const quickKassenbuch = `            { to: "/admin/kassenbuch" as const, title: "Kassenbuch", subtitle: "Zahlungen prüfen", Icon: Wallet },`;
const quickJournal = quickKassenbuch + `
            { to: "/admin/journal" as const, title: "Journal", subtitle: "Statusbild herunterladen", Icon: BookOpen },`;
// „Direkt loslegen“ wurde entfernt; nur ergänzen, falls der Block noch existiert.
if (text.includes(quickKassenbuch) && !text.includes('to: "/admin/journal" as const')) {
  text = text.replace(quickKassenbuch, quickJournal);
}

writeFileSync(path, text);
console.log("Admin hub redesigned with clear A-to-Z workflow.");
