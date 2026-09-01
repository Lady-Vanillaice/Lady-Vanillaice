import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/_authenticated/admin.index.tsx";
let text = readFileSync(path, "utf8");
const marker = "const [adminSearch, setAdminSearch] = useState(\"\");";

if (!text.includes(marker)) {
  text = text.replace(
    "  CircleAlert, ArrowRight, ChevronDown, Download, Share, Bell, BellOff, Send, Building2, Plus, Trash2,",
    "  CircleAlert, ArrowRight, ChevronDown, Download, Share, Bell, BellOff, Send, Building2, Plus, Trash2, Search,",
  );

  text = text.replace(
    "function AdminHubPage() {\n  const navigate = useNavigate();",
    `function AdminHubPage() {\n  const navigate = useNavigate();\n  const [adminSearch, setAdminSearch] = useState(\"\");\n  const normalizedAdminSearch = adminSearch.trim().toLowerCase();\n  const searchedGroups = normalizedAdminSearch\n    ? HUB_GROUPS.map((group) => ({\n        ...group,\n        cards: group.cards.filter((card) =>\n          [group.label, group.hint, card.title, card.description]\n            .join(\" \" )\n            .toLowerCase()\n            .includes(normalizedAdminSearch),\n        ),\n      })).filter((group) => group.cards.length > 0)\n    : HUB_GROUPS;`,
  );

  text = text.replace(
    "      <DashboardOverview />\n\n      <section className=\"mb-10\">",
    `      <DashboardOverview />\n\n      <section className=\"mb-8\">\n        <label className=\"block\">\n          <span className=\"eyebrow block mb-2\">Admin durchsuchen</span>\n          <div className=\"relative\">\n            <Search size={16} className=\"absolute left-3 top-1/2 -translate-y-1/2 text-vanilla/40 pointer-events-none\" />\n            <input\n              type=\"search\"\n              value={adminSearch}\n              onChange={(event) => setAdminSearch(event.target.value)}\n              placeholder=\"z. B. Kalender, Kassenbuch, Custom, Newsletter …\"\n              className=\"input-luxe !pl-10\"\n            />\n          </div>\n        </label>\n        {normalizedAdminSearch && searchedGroups.length === 0 && (\n          <p className=\"mt-3 border border-dashed border-champagne/20 p-4 text-sm text-vanilla/55\">Keine Admin-Funktion zu „{adminSearch}“ gefunden.</p>\n        )}\n      </section>\n\n      <section className=\"mb-10\">`,
  );

  text = text.replace(
    '<div className="space-y-9 mb-12">{HUB_GROUPS.map(group => <div key={group.label}>',
    '<div className="space-y-9 mb-12">{searchedGroups.map(group => <div key={group.label}>',
  );

  writeFileSync(path, text);
}

console.log("Admin hub search applied.");
