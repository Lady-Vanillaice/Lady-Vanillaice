// Standorte, die öffentlich nicht angezeigt werden sollen, werden im Feld
// `availability_slots.location` mit diesem Präfix gespeichert. So bleibt die
// Markierung erhalten, wenn Zeitfenster geteilt oder umgebaut werden.
// Öffentlich wird nur das Präfix ohne Adresse ausgeliefert; im Adminbereich
// und in E-Mails an Kunden wird der echte Standort ohne Präfix angezeigt.
export const PRIVATE_LOCATION_PREFIX = "__PRIVAT__::";

export const PRIVATE_LOCATION_PUBLIC_TEXT = {
  de: "Ort wird nach der Buchungsbestätigung bekannt gegeben",
  en: "Location will be shared once your booking is confirmed",
} as const;

export function isPrivateLocation(location: string | null | undefined): boolean {
  return typeof location === "string" && location.startsWith(PRIVATE_LOCATION_PREFIX);
}

/** Echter Standort ohne Markierung – für Admin, Kundenbestätigung und Belege. */
export function realLocation<T extends string | null | undefined>(location: T): T {
  if (typeof location !== "string" || !location.startsWith(PRIVATE_LOCATION_PREFIX)) return location;
  return location.slice(PRIVATE_LOCATION_PREFIX.length) as T;
}

/** Für öffentliche Ausgaben: private Standorte verlieren ihre Adresse. */
export function publicLocation(location: string): string {
  return isPrivateLocation(location) ? PRIVATE_LOCATION_PREFIX : location;
}

export function markPrivateLocation(location: string, hidden: boolean): string {
  const plain = realLocation(location);
  return hidden ? `${PRIVATE_LOCATION_PREFIX}${plain}` : plain;
}
