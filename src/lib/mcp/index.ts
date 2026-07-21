import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listBookings from "./tools/list-bookings";
import listAvailabilitySlots from "./tools/list-availability-slots";
import listTestimonials from "./tools/list-testimonials";
import listCashbook from "./tools/list-cashbook";

// The OAuth issuer must be the direct Supabase host (not the .lovable.cloud proxy).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "lady-vanillaice-mcp",
  title: "Lady Vanilla Ice Admin MCP",
  version: "0.1.0",
  instructions:
    "Tools für den internen Adminbereich von Lady Vanilla Ice: Buchungen, Verfügbarkeits-Slots, Erfahrungsberichte und Kassenbuch abfragen. Alle Tools laufen als angemeldeter Nutzer (RLS greift).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listBookings, listAvailabilitySlots, listTestimonials, listCashbook],
});
