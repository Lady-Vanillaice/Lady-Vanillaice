import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/site/PageHeader";
import { Crown } from "lucide-react";

// Local typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthResult = {
  data:
    | ({
        redirect_url?: string;
        redirect_to?: string;
        client?: { name?: string; client_uri?: string };
        scope?: string;
        scopes?: string[];
      } | null);
  error: { message: string } | null;
};
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
function oauthApi(): OAuthApi {
  const authAny = supabase.auth as unknown as { oauth: OAuthApi };
  return authAny.oauth;
}


export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="container-luxe py-20">
      <h1 className="text-xl mb-4">Autorisierung fehlgeschlagen</h1>
      <p className="text-vanilla/70">{String((error as Error)?.message ?? error)}</p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "eine externe App";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauthApi().approveAuthorization(authorization_id)
      : await oauthApi().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Keine Weiterleitungs-URL vom Autorisierungsserver erhalten.");
      return;
    }
    window.location.href = target;
  }

  return (
    <>
      <PageHeader
        eyebrow="Verbindung erlauben"
        title={
          <>
            Zugriff <em className="font-script gold-text not-italic">gewähren</em>
          </>
        }
        intro={`${clientName} möchte diese App in deinem Namen nutzen.`}
      />
      <section className="py-16">
        <div className="container-luxe max-w-md">
          <div className="bg-card border border-champagne/20 p-8 space-y-6">
            <p className="text-sm text-vanilla/80">
              <strong>{clientName}</strong> erhält Zugriff auf die Admin-Tools dieser App
              (Buchungen, Verfügbarkeit, Erfahrungsberichte, Kassenbuch) und handelt in
              deinem Namen. Die App-Berechtigungen (RLS) bleiben unverändert bestehen.
            </p>
            {error && (
              <div className="text-sm text-destructive/90 bg-destructive/10 border border-destructive/30 px-4 py-3">
                {error}
              </div>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => decide(true)}
              className="btn-gold w-full"
            >
              <Crown size={14} />
              Zugriff erlauben
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => decide(false)}
              className="btn-outline-gold w-full !text-[0.7rem]"
            >
              Ablehnen
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
