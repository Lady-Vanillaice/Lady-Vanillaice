export const CURRENT_SESSION_PRICES = {
  30: 200,
  60: 300,
  90: 500,
  120: 600,
} as const;

export function sessionPriceForMinutes(minutes: number | null | undefined): number | null {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return null;

  const fixedPrice =
    CURRENT_SESSION_PRICES[minutes as keyof typeof CURRENT_SESSION_PRICES];

  // Nicht öffentlich gelistete Sonderdauern bleiben individuell auf Basis
  // des regulären Stundenpreises berechenbar.
  return fixedPrice ?? Math.round((minutes / 60) * 300);
}
