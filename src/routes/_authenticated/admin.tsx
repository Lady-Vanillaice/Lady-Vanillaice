import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/booking.functions";
import {
  requestAdminAccess,
  getMyAdminRequest,
} from "@/lib/admin-access.functions";
import { PageHeader } from "@/components/site/PageHeader";
import { AdminWorkspaceBar } from "@/components/admin/AdminWorkspaceBar";
import { ShieldAlert, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Lady Vanilla Ice" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const checkRole = useServerFn(getMyRole);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [diag, setDiag] = useState<Awaited<ReturnType<typeof getMyRole>> | null>(null);
  const [diagError, setDiagError] = useState<string | null>(null);

  useEffect(() => {
    checkRole()
      .then((r) => {
        setDiag(r);
        setIsAdmin(r.isAdmin);
      })
      .catch(() => setIsAdmin(false));
  }, [checkRole]);

  async function verifyRole() {
    setChecking(true);
    setDiagError(null);
    try {
      const r = await checkRole();
      setDiag(r);
      setIsAdmin(r.isAdmin);
    } catch (e) {
      setDiagError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setChecking(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (isAdmin === null) {
    return <div className="min-h-screen pt-40 text-center text-vanilla/60">Wird geladen…</div>;
  }

  if (!isAdmin) {
    return (
      <>
        <PageHeader eyebrow="Zugriff" title={<>Kein <em className="font-script gold-text not-italic">Admin-Zugriff</em></>} />
        <section className="py-20">
          <div className="container-luxe max-w-md text-center bg-card border border-champagne/20 p-10">
            <ShieldAlert className="mx-auto text-bordeaux mb-4" size={32} />
            <p className="text-vanilla/70 mb-6 leading-relaxed">
              Dein Konto hat keine Admin-Rechte. Bitte den bestehenden Admin um Freischaltung.
            </p>
            <button onClick={verifyRole} disabled={checking} className="btn-outline-gold w-full mt-3">
              {checking ? "Prüfe…" : "Admin prüfen"}
            </button>

            {diag && (
              <div className="mt-5 text-left text-xs bg-anthracite/40 border border-champagne/15 p-4 space-y-2">
                <div className={diag.isAdmin ? "text-green-300" : "text-vanilla/80"}>
                  {diag.reason}
                </div>
                <div className="text-vanilla/45 pt-2 border-t border-champagne/10 space-y-1">
                  <div>E-Mail: {diag.email ?? "—"}</div>
                  <div>User-ID: <span className="font-mono">{diag.userId}</span></div>
                  <div>Rollen: {diag.roles.length ? diag.roles.join(", ") : "keine"}</div>
                  <div>Admins gesamt: {diag.adminCount}</div>
                </div>
              </div>
            )}
            {diagError && (
              <div className="mt-5 text-left text-xs bg-bordeaux/20 border border-bordeaux/40 text-vanilla p-4">
                {diagError}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-champagne/10">
              <AccessRequestForm onApproved={() => verifyRole()} />
            </div>

            <button onClick={logout} className="mt-4 text-xs text-vanilla/50 hover:text-champagne uppercase tracking-widest">
              Abmelden
            </button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <AdminWorkspaceBar />
      <Outlet />
    </>
  );
}

function AccessRequestForm({ onApproved }: { onApproved: () => void }) {
  const request = useServerFn(requestAdminAccess);
  const getMine = useServerFn(getMyAdminRequest);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mine, setMine] = useState<Awaited<ReturnType<typeof getMyAdminRequest>>["request"]>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getMine()
      .then((r) => setMine(r.request))
      .finally(() => setLoaded(true));
  }, [getMine]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      const r = await request({ data: { message: message.trim() || undefined } });
      if (r.alreadyAdmin) {
        onApproved();
        return;
      }
      setMine(r.request);
      setMessage("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler beim Senden.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) return <div className="text-xs text-vanilla/40">Lade…</div>;

  if (mine && mine.status === "pending") {
    return (
      <div className="text-left text-xs bg-anthracite/40 border border-champagne/15 p-4 space-y-2">
        <div className="text-champagne font-medium uppercase tracking-[0.2em]">
          Anfrage gesendet
        </div>
        <p className="text-vanilla/70 leading-relaxed">
          Deine Freischaltungsanfrage ist beim bestehenden Admin eingegangen.
          Du wirst per E-Mail benachrichtigt, sobald entschieden wurde.
        </p>
        <div className="text-vanilla/45">
          Gesendet:{" "}
          {format(new Date(mine.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
        </div>
      </div>
    );
  }

  if (mine && mine.status === "approved") {
    return (
      <div className="text-left text-xs bg-green-900/30 border border-green-700/40 p-4">
        <div className="text-green-300 font-medium uppercase tracking-[0.2em] mb-1">
          Freigeschaltet
        </div>
        <p className="text-vanilla/75">
          Deine Anfrage wurde angenommen. Lade die Seite neu, um das Dashboard zu sehen.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="text-left space-y-3">
      <label className="eyebrow block">Freischaltung anfragen</label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Kurze Nachricht an den bestehenden Admin (optional)"
        className="input-luxe !py-2 min-h-[80px] resize-y w-full"
        maxLength={1000}
      />
      {mine?.status === "rejected" && (
        <div className="text-xs text-bordeaux">
          Deine letzte Anfrage wurde abgelehnt. Du kannst eine neue senden.
        </div>
      )}
      {err && <div className="text-xs text-destructive">{err}</div>}
      <button type="submit" disabled={submitting} className="btn-outline-gold w-full">
        <UserPlus size={14} /> {submitting ? "Wird gesendet…" : "Anfrage senden"}
      </button>
    </form>
  );
}
