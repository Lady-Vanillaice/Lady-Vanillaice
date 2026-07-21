import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Lock, LogOut, Mail, ShieldCheck } from "lucide-react";

export function AdminLoginWidget() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      setLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    setBusy(true);
    try {
      await supabase.auth.signOut();
      navigate({ to: "/" });
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return null;

  return (
    <section className="py-20 border-t border-champagne/15">
      <div className="container-luxe max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <ShieldCheck size={18} className="text-champagne" />
            <div className="eyebrow">Interner Bereich</div>
          </div>
          <h2 className="font-display text-3xl gold-text">Admin</h2>
        </div>

        <div className="bg-card border border-champagne/20 p-8">
          {userEmail ? (
            <div className="space-y-5 text-center">
              <p className="text-sm text-vanilla/70">
                Angemeldet als{" "}
                <span className="text-champagne font-medium">{userEmail}</span>
              </p>
              <Link to="/admin" className="btn-gold w-full">
                <Crown size={14} />
                Zum Dashboard
              </Link>
              <button
                type="button"
                onClick={onLogout}
                disabled={busy}
                className="btn-outline-gold w-full"
              >
                <LogOut size={14} />
                {busy ? "Wird abgemeldet…" : "Abmelden"}
              </button>
            </div>
          ) : (
            <form onSubmit={onLogin} className="space-y-4">
              <div>
                <label className="eyebrow block mb-2">
                  <Mail size={11} className="inline mr-1" />
                  E-Mail
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-luxe"
                  placeholder="deine@email.de"
                />
              </div>
              <div>
                <label className="eyebrow block mb-2">
                  <Lock size={11} className="inline mr-1" />
                  Passwort
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="current-password"
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
                <Crown size={14} />
                {busy ? "Anmelden…" : "Anmelden"}
              </button>

              <p className="text-center text-xs text-vanilla/45 pt-2">
                Erweiterte Optionen unter{" "}
                <Link to="/auth" search={{}} className="text-champagne hover:underline">
                  Login-Seite
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
