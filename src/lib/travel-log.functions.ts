import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const HOME_ADDRESS = "Tiefendoblstraße 24, 94508 Schöllnach";

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

type Coordinates = { lat: number; lon: number };

function normalizeGeocodingAddress(address: string) {
  return address
    .replace(/\s+[—–-]\s+(?:Raum|Zimmer|Suite|Lounge|Studio)\b.*$/iu, "")
    .replace(/,\s*(?:Raum|Zimmer|Suite|Lounge|Studio)\b.*$/iu, "")
    .trim();
}

async function geocode(address: string): Promise<Coordinates> {
  const normalizedAddress = normalizeGeocodingAddress(address);
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", normalizedAddress);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "de");
  const response = await fetch(url, {
    headers: { "User-Agent": "Lady-Vanillaice-Fahrtenbuch/1.0" },
  });
  if (!response.ok) throw new Error(`Adresse konnte nicht geprüft werden (${response.status})`);
  const results = await response.json() as Array<{ lat: string; lon: string }>;
  if (!results[0]) throw new Error(`Adresse nicht gefunden: ${normalizedAddress}`);
  return { lat: Number(results[0].lat), lon: Number(results[0].lon) };
}

async function drivingKilometres(from: Coordinates, to: Coordinates) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fahrstrecke konnte nicht berechnet werden (${response.status})`);
  const result = await response.json() as { routes?: Array<{ distance: number }> };
  const metres = result.routes?.[0]?.distance;
  if (!metres) throw new Error("Für diese Adressen wurde keine Fahrstrecke gefunden");
  return Math.round(metres / 1000);
}

export const calculateStudioDistances = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    destinations: z.array(z.object({
      key: z.string().min(1).max(500),
      address: z.string().min(1).max(500),
    })).max(30),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const home = await geocode(HOME_ADDRESS);
    const unique = [...new Map(data.destinations.map(destination => [destination.key, destination])).values()];
    const distances = await Promise.all(unique.map(async destination => {
      const coordinates = await geocode(destination.address);
      return {
        key: destination.key,
        kilometres: await drivingKilometres(home, coordinates),
      };
    }));
    return { homeAddress: HOME_ADDRESS, distances };
  });
