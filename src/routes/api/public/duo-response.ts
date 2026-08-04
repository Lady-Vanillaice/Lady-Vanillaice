import { createFileRoute } from "@tanstack/react-router";

const PENDING_MARKER = "[DUO PREISANTWORT AUSSTEHEND]";
const ACCEPTED_MARKER = "[DUO PREIS AKZEPTIERT]";
const DECLINED_MARKER = "[DUO PREIS ABGELEHNT]";

function responsePage(title: string, message: string, success = true) {
  return new Response(
    `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — Lady Vanilla Ice</title>
  <style>
    body{margin:0;background:#09090a;color:#f4ead8;font-family:Georgia,serif;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box}
    main{width:min(560px,100%);border:1px solid #8f7448;background:#12100e;padding:42px 28px;text-align:center;box-sizing:border-box}
    h1{color:#d8b676;font-weight:400;letter-spacing:2px;font-size:28px}
    p{font-family:Arial,sans-serif;color:#d8cdbc;line-height:1.7;font-size:16px}
    .status{color:${success ? "#9fc8a8" : "#e7a0a8"};text-transform:uppercase;letter-spacing:3px;font-family:Arial,sans-serif;font-size:12px}
    a{display:inline-block;margin-top:18px;color:#d8b676;text-decoration:none;border:1px solid #8f7448;padding:12px 18px;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:2px;font-size:11px}
  </style>
</head>
<body><main><div class="status">${success ? "Antwort gespeichert" : "Antwort nicht gespeichert"}</div><h1>${title}</h1><p>${message}</p><a href="https://www.lady-vanillaice.com">Zur Website</a></main></body>
</html>`,
    { status: success ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/duo-response")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id") ?? "";
        const decision = url.searchParams.get("decision");
        const token = url.searchParams.get("token") ?? "";

        if (!/^[0-9a-f-]{36}$/i.test(id) || (decision !== "accept" && decision !== "decline") || !token) {
          return responsePage("Ungültiger Link", "Dieser Antwortlink ist unvollständig oder ungültig.", false);
        }

        const { verifyDuoResponseToken } = await import("@/lib/duo-response.server");
        if (!(await verifyDuoResponseToken(id, decision, token))) {
          return responsePage("Ungültiger Link", "Dieser Antwortlink konnte nicht bestätigt werden.", false);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: booking, error } = await supabaseAdmin
          .from("bookings")
          .select("id, status, duration, message")
          .eq("id", id)
          .maybeSingle();

        if (error || !booking || booking.duration !== "Duo Session") {
          return responsePage("Anfrage nicht gefunden", "Die zugehörige Duo-Anfrage wurde nicht gefunden.", false);
        }

        const currentMessage = booking.message ?? "";
        if (currentMessage.includes(ACCEPTED_MARKER)) {
          return responsePage("Vielen Dank", "Deine Zustimmung wurde bereits gespeichert. Deine Anfrage wird nun persönlich geprüft.");
        }
        if (currentMessage.includes(DECLINED_MARKER)) {
          return responsePage("Vielen Dank", "Deine Ablehnung wurde bereits gespeichert. Es ist nichts weiter zu tun.");
        }
        if (!currentMessage.includes(PENDING_MARKER)) {
          return responsePage("Antwort nicht möglich", "Diese Anfrage wartet nicht mehr auf eine Preisantwort.", false);
        }

        const accepted = decision === "accept";
        const nextMessage = currentMessage.replace(
          PENDING_MARKER,
          accepted ? ACCEPTED_MARKER : DECLINED_MARKER,
        );
        const { error: updateError } = await supabaseAdmin
          .from("bookings")
          .update({ status: accepted ? "open" : "declined", message: nextMessage })
          .eq("id", id)
          .eq("status", booking.status);

        if (updateError) {
          console.error("Failed to store duo price response", updateError);
          return responsePage("Fehler beim Speichern", "Bitte versuche es später erneut oder kontaktiere mich direkt.", false);
        }

        return accepted
          ? responsePage("Vielen Dank für Deine Zustimmung", "Deine Duo-Anfrage ist jetzt als offen eingetragen und wird persönlich geprüft.")
          : responsePage("Vielen Dank für Deine Rückmeldung", "Deine Duo-Anfrage wurde geschlossen.");
      },
    },
  },
});

