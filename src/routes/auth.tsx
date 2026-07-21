import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { PageHeader } from "../components/site/PageHeader";
import { Crown, Mail, Lock } from "lucide-react";

function isSafeRelative(path: string): boolean {
  return /^\/[^/\\]/.test(path);
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && isSafeRelative(s.next) ? s.next : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Anmelden — Lady Vanilla Ice" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const search = Route.useSearch();
  const next = search.next;
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goPostAuth() {
    if (next && isSafeRelative(next)) {
      window.location.href = next;
      return;
    }
    navigate({ to: "/admin" });
  }

  // If already signed in, send to next (if any) or /admin
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted && data.user) goPostAuth();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.invalidate();
        goPostAuth();
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, router, next]);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const emailRedirectTo =
          window.location.origin + (next && isSafeRelative(next) ? next : "/admin");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo },
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    setError(null);
    const redirect_uri =
      window.location.origin + (next && isSafeRelative(next) ? next : "/admin");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri,
    });
    if (result.error) {
      setError(result.error.message);
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Interner Bereich"
        title={<>Admin <em className="font-script gold-text not-italic">Login</em></>}
        intro="Nur für die Inhaberin. Gäste buchen direkt über den Kalender."
      />

      <section className="py-20">
        <div className="container-luxe max-w-md">
          <div className="bg-card border border-champagne/20 p-8 space-y-6">
            <button
              type="button"
              onClick={onGoogle}
              disabled={busy}
              className="btn-outline-gold w-full !text-[0.7rem]"
            >
              <Crown size={14} />
              Mit Google anmelden
            </button>

            <div className="flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.3em] text-vanilla/40">
              <span className="h-px bg-champagne/20 flex-1" />
              oder
              <span className="h-px bg-champagne/20 flex-1" />
            </div>

            <form onSubmit={onEmail} className="space-y-4">
              <div>
                <label className="eyebrow block mb-2"><Mail size={11} className="inline mr-1" />E-Mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-luxe"
                  placeholder="deine@email.de"
                />
              </div>
              <div>
                <label className="eyebrow block mb-2"><Lock size={11} className="inline mr-1" />Passwort</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-luxe"
                  placeholder="Mindestens 8 Zeichen"
                />
              </div>

              {error && (
                <div className="text-sm text-destructive/90 bg-destructive/10 border border-destructive/30 px-4 py-3">
                  {error}
                </div>
              )}

              <button type="submit" disabled={busy} className="btn-gold w-full">
                {mode === "signin" ? "Anmelden" : "Konto erstellen"}
              </button>
            </form>

            <div className="text-center text-xs text-vanilla/55">
              {mode === "signin" ? (
                <>Noch kein Konto?{" "}
                  <button type="button" onClick={() => setMode("signup")} className="text-champagne hover:underline">
                    Jetzt registrieren
                  </button>
                </>
              ) : (
                <>Bereits registriert?{" "}
                  <button type="button" onClick={() => setMode("signin")} className="text-champagne hover:underline">
                    Anmelden
                  </button>
                </>
              )}
            </div>
          </div>

        </div>
      </section>
    </>
  );
}
