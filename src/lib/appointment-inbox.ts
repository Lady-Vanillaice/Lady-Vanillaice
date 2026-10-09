export const APPOINTMENT_FILTERS = {
  alle: { label: "Alle", empty: "Keine Termine vorhanden." },
  neu: { label: "Neu", empty: "Keine neuen Anfragen." },
  umplanen: { label: "Umplanen", empty: "Keine Termine zum Umplanen." },
  storniert: { label: "Storniert", empty: "Keine stornierten Termine." },
  bestaetigt: { label: "Bestätigt", empty: "Keine bestätigten Termine." },
  wartend: { label: "Anzahlung offen", empty: "Keine offenen Anzahlungen." },
  abgelehnt: { label: "Abgelehnt", empty: "Keine abgelehnten Anfragen." },
} as const;

export type AppointmentFilter = keyof typeof APPOINTMENT_FILTERS;

type InboxBooking = {
  status: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  anzahlung_paid?: boolean | null;
  deposit_exemption_reason?: string | null;
};

export function matchesAppointmentFilter(booking: InboxBooking, filter: AppointmentFilter) {
  if (filter === "alle") return true;
  switch (filter) {
    case "neu": return booking.status === "pending";
    case "umplanen": return booking.status === "rescheduling" || booking.status === "open";
    case "storniert": return booking.status === "cancelled";
    case "bestaetigt": return booking.status === "confirmed";
    case "wartend": return booking.status === "waiting_deposit" ||
      (booking.status === "confirmed" && !booking.anzahlung_paid && !booking.deposit_exemption_reason);
    case "abgelehnt": return booking.status === "declined";
  }
}

export function matchesAppointmentSearch(booking: InboxBooking, query: string) {
  const normalized = query.trim().toLocaleLowerCase("de-DE");
  if (!normalized) return true;
  return [booking.guest_name, booking.guest_email, booking.guest_phone ?? ""]
    .some(value => value.toLocaleLowerCase("de-DE").includes(normalized));
}
