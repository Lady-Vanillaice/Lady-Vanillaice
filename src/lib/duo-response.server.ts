const SITE_URL = "https://www.lady-vanillaice.com";

type DuoDecision = "accept" | "decline";

function getSecret(): string {
  const secret = process.env.DUO_RESPONSE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Duo response signing secret is not configured.");
  return secret;
}

async function signValue(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createDuoResponseToken(bookingId: string, decision: DuoDecision): Promise<string> {
  return signValue(`${bookingId}:${decision}`);
}

export async function verifyDuoResponseToken(
  bookingId: string,
  decision: DuoDecision,
  token: string,
): Promise<boolean> {
  const expected = await createDuoResponseToken(bookingId, decision);
  if (token.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < token.length; index += 1) {
    mismatch |= token.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function createDuoResponseLinks(bookingId: string) {
  const acceptToken = await createDuoResponseToken(bookingId, "accept");
  const declineToken = await createDuoResponseToken(bookingId, "decline");
  const makeUrl = (decision: DuoDecision, token: string) =>
    `${SITE_URL}/api/public/duo-response?id=${encodeURIComponent(bookingId)}&decision=${decision}&token=${token}`;
  return {
    acceptUrl: makeUrl("accept", acceptToken),
    declineUrl: makeUrl("decline", declineToken),
  };
}

