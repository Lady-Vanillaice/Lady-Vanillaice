import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/_authenticated/admin.index.tsx";
let text = readFileSync(path, "utf8");

if (!text.includes(" Search,")) {
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
    { to: "/admin/umplanen", title: "Umplanen & Stornierungen", description: "Termine verschieben und stornierte Buchungen im Blick behalten.", Icon: RotateCcw },
  ]},
  { label: "2 · Neue Anfragen", hint: "Alle eingehenden Buchungsarten an einem Ort", cards: [
    { to: "/admin/termine", title: "Normale Terminanfragen", description: "Neue reguläre Buchungsanfragen prüfen und bearbeiten.", Icon: Mail },
    { to: "/admin/duo", title: "Duo-Anfragen", description: "Anfragen für Duo-Sessions.", Icon: Mail },
    { to: "/admin/contentdreh", title: "Content-Dreh-Anfragen", description: "Anfragen für Content-Dreh-Termine.", Icon: Camera },
    { to: "/admin/custom", title: "Custom-Content-Anfragen", description: "Individuelle Custom-Anfragen für Bilder und Videos.", Icon: Sparkles },
    { to: "/admin/fotoshooting", title: "Fotoshooting-Anfragen", description: "TFP- und Pay-Fotoshooting-Anfragen.", Icon: Camera },
  ]},
  { label: "3 · Kunden", hint: "Person finden, Verlauf öffnen, Daten pflegen", cards: [
    { to: "/admin/kunden", title: "Kunden suchen", description: "Aktuelle und ältere Kunden, Termine, Kontakt und Notizen durchsuchen.", Icon: Users },
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
const studioMarker = "function StudioManagement() {";
const hubEnd = text.indexOf(studioMarker, hubStart);
if (hubStart < 0 || hubEnd < 0) throw new Error("AdminHubPage not found");

const hub = `function AdminHubPage() { /* Weitere Admin-Bereiche */
  const navigate = useNavigate();
  const [adminSearch, setAdminSearch] = useState("");
  const query = adminSearch.trim().toLowerCase();
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

      <div className="mb-8 border border-champagne/30 bg-card p-4 sm:p-5">
        <label className="block">
          <span className="eyebrow block mb-2">Im Adminbereich suchen</span>
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-champagne/70" />
            <input
              value={adminSearch}
              onChange={event => setAdminSearch(event.target.value)}
              className="input-luxe w-full !pl-11"
              placeholder="z. B. Kunde, Zahlung, Custom, Newsletter, Kalender …"
            />
          </div>
        </label>
        <p className="mt-2 text-xs text-vanilla/45">Die Suche zeigt dir sofort den passenden Bereich – ohne Menüs durchklicken zu müssen.</p>
      </div>

      <section className="mb-10">
        <div className="mb-4">
          <div className="eyebrow">Heute wichtig</div>
          <h2 className="font-display text-2xl sm:text-3xl gold-text mt-1">Dein Tagesüberblick</h2>
        </div>
        <DashboardOverview />
      </section>

      {!query && <section className="mb-10">
        <div className="eyebrow mb-3">Direkt loslegen</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { to: "/admin/terminplan" as const, title: "Terminplan", subtitle: "Was steht an?", Icon: CalendarClock },
            { to: "/admin/termine" as const, title: "Anfragen", subtitle: "Was ist neu?", Icon: Mail },
            { to: "/admin/kunden" as const, title: "Kunden", subtitle: "Person suchen", Icon: Users },
            { to: "/admin/kassenbuch" as const, title: "Kassenbuch", subtitle: "Zahlungen prüfen", Icon: Wallet },
          ].map(({ to, title, subtitle, Icon }) => <Link key={to} to={to} className="group border border-champagne/30 bg-card p-4 sm:p-5 hover:border-champagne/70 transition">
            <Icon size={20} className="text-champagne mb-3" />
            <div className="font-display text-lg sm:text-xl text-vanilla group-hover:text-champagne transition">{title}</div>
            <div className="mt-1 text-xs text-vanilla/45">{subtitle}</div>
          </Link>)}
        </div>
      </section>}

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

writeFileSync(path, text);
console.log("Admin hub redesigned with clear A-to-Z workflow and search.");
