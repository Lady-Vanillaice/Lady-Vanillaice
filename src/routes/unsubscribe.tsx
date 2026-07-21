import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "../components/site/PageHeader";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
  }),
  component: Unsubscribe,
});

type State =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "success" }
  | { kind: "error"; message: string };

function Unsubscribe() {
  const { token } = useSearch({ from: "/unsubscribe" });
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    (async () => {
      try {
        const r = await fetch(
          `/email/unsubscribe?token=${encodeURIComponent(token)}`,
        );
        const j = await r.json();
        if (!r.ok) {
          setState({ kind: "invalid" });
          return;
        }
        if (j.valid === false && j.reason === "already_unsubscribed") {
          setState({ kind: "already" });
        } else if (j.valid) {
          setState({ kind: "ready" });
        } else {
          setState({ kind: "invalid" });
        }
      } catch {
        setState({ kind: "error", message: "Netzwerkfehler" });
      }
    })();
  }, [token]);

  async function confirm() {
    setBusy(true);
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await r.json();
      if (j.success) setState({ kind: "success" });
      else if (j.reason === "already_unsubscribed") setState({ kind: "already" });
      else setState({ kind: "error", message: j.error ?? "Fehler" });
    } catch {
      setState({ kind: "error", message: "Netzwerkfehler" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="E-Mail"
        title={<>Newsletter <em className="font-script gold-text not-italic">abbestellen</em></>}
        intro="Verwalte Deine E-Mail-Einstellungen."
      />
      <section className="py-20">
        <div className="container-luxe max-w-xl text-center space-y-6">
          {state.kind === "loading" && (
            <p className="text-vanilla/70">Einen Moment bitte…</p>
          )}
          {state.kind === "invalid" && (
            <p className="text-vanilla/70">
              Dieser Abmelde-Link ist ungültig oder abgelaufen.
            </p>
          )}
          {state.kind === "already" && (
            <p className="text-vanilla/70">
              Diese E-Mail-Adresse wurde bereits abgemeldet.
            </p>
          )}
          {state.kind === "ready" && (
            <>
              <p className="text-vanilla/80">
                Möchtest Du keine E-Mails mehr von dieser Adresse erhalten?
              </p>
              <button
                onClick={confirm}
                disabled={busy}
                className="btn-gold"
              >
                {busy ? "Wird abgemeldet…" : "Abmeldung bestätigen"}
              </button>
            </>
          )}
          {state.kind === "success" && (
            <p className="text-champagne">
              Du wurdest erfolgreich abgemeldet.
            </p>
          )}
          {state.kind === "error" && (
            <p className="text-red-400">{state.message}</p>
          )}
        </div>
      </section>
    </>
  );
}
