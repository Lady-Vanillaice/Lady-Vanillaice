import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { CalendarWaitlistAdmin } from "@/components/admin/calendar-waitlist-admin";

export const Route = createFileRoute("/_authenticated/admin/warteliste")({
  head: () => ({
    meta: [
      { title: "Warteliste — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminWaitlistPage,
});

function AdminWaitlistPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title={<>Kalender-<em className="font-script gold-text not-italic">Warteliste</em></>}
        intro="Interessenten für bereits belegte Tage mit ihrem möglichen Zeitfenster."
      />
      <section className="py-16">
        <div className="container-luxe max-w-3xl">
          <Link
            to="/admin"
            className="btn-outline-gold mb-6 !py-2 !px-4 !text-[0.65rem]"
          >
            <ArrowLeft size={12} /> Zum Admin-Bereich
          </Link>
          <CalendarWaitlistAdmin />
        </div>
      </section>
    </>
  );
}
