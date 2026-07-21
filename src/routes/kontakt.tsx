import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "../components/site/PageHeader";
import { Mail, MessageCircle, MapPin, Clock } from "lucide-react";
import { useTr } from "@/i18n";

export const Route = createFileRoute("/kontakt")({
  head: () => ({
    meta: [
      { title: "Kontakt — Lady Vanilla Ice" },
      { name: "description", content: "Kontaktmöglichkeiten zu Lady Vanilla Ice in München und ausgewählten Städten — E-Mail, Telegram, Termine nach Vereinbarung." },
      { property: "og:title", content: "Kontakt — Lady Vanilla Ice" },
      { property: "og:description", content: "Diskreter Kontakt — Termine nur nach Vereinbarung." },
      { property: "og:url", content: "https://lady-vanillaice.com/kontakt" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/kontakt" }],
  }),
  component: Kontakt,
});

function Kontakt() {
  const tr = useTr();
  const items = [
    { icon: Mail, label: tr("E-Mail", "Email"), value: "kontakt@ladyvanillaice.de", href: "mailto:kontakt@ladyvanillaice.de" },
    { icon: MessageCircle, label: tr("Telegram", "Telegram"), value: "@ladyvanillaice", href: "https://t.me/ladyvanillaice" },
    { icon: MapPin, label: tr("Standort", "Location"), value: tr("München und Umgebung", "Munich and surroundings") },
    { icon: Clock, label: tr("Verfügbarkeit", "Availability"), value: tr("Nach Vereinbarung", "By appointment") },
  ];

  return (
    <>
      <PageHeader
        eyebrow={tr("Kontakt", "Contact")}
        title={
          <>
            {tr("So ", "How to ")}
            <em className="font-script gold-text not-italic">{tr("erreichst", "reach")}</em>
            {tr(" Du mich", " me")}
          </>
        }
        intro={tr("Diskret, persönlich, ohne Umwege.", "Discreet, personal, without detours.")}
      />

      <section className="py-24">
        <div className="container-luxe max-w-4xl">
          <div className="grid sm:grid-cols-2 gap-px bg-champagne/15 border border-champagne/15">
            {items.map((it) => {
              const Body = (
                <>
                  <it.icon className="text-champagne mb-5" size={28} strokeWidth={1.2} />
                  <div className="eyebrow mb-2">{it.label}</div>
                  <div className="font-display text-2xl text-vanilla">{it.value}</div>
                </>
              );
              return it.href ? (
                <a
                  key={it.label}
                  href={it.href}
                  target={it.href.startsWith("http") ? "_blank" : undefined}
                  rel={it.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="bg-background p-10 hover:bg-card transition-colors"
                >
                  {Body}
                </a>
              ) : (
                <div key={it.label} className="bg-background p-10">{Body}</div>
              );
            })}
          </div>

          <div className="mt-16 text-center">
            <p className="text-vanilla/65 mb-8 max-w-xl mx-auto leading-relaxed">
              {tr(
                "Termine ausschließlich nach vorheriger Vereinbarung. Anfragen werden vertraulich behandelt.",
                "Appointments exclusively by prior arrangement. All inquiries are handled confidentially."
              )}
            </p>
            <Link to="/buchung" className="btn-gold">{tr("Termin anfragen", "Request appointment")}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
