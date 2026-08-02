import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/site/PageHeader";
import { confirmNewsletter } from "@/lib/newsletter.functions";

export const Route = createFileRoute("/newsletter-bestaetigen")({ validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === "string" ? s.token : "" }), component: ConfirmNewsletter });
function ConfirmNewsletter() {
  const { token } = useSearch({ from: "/newsletter-bestaetigen" });
  const confirm = useServerFn(confirmNewsletter);
  const [state, setState] = useState<"ready"|"busy"|"done"|"error">(token ? "ready" : "error");
  return <><PageHeader eyebrow="E-Mail" title={<>Termine <em className="font-script gold-text not-italic">abonnieren</em></>} /><section className="py-20"><div className="container-luxe max-w-xl text-center space-y-5">
    {state === "done" ? <p className="text-champagne">Deine Anmeldung ist bestätigt. Du erhältst künftig E-Mails zu neuen Terminen.</p> : state === "error" ? <p className="text-bordeaux">Dieser Bestätigungslink ist ungültig.</p> : <><p className="text-vanilla/70">Bestätige hier Deine freiwillige Anmeldung für neue verfügbare Termine.</p><button className="btn-gold" disabled={state === "busy"} onClick={async()=>{setState("busy");try{await confirm({data:{token}});setState("done");}catch{setState("error");}}}>{state === "busy" ? "Wird bestätigt…" : "Anmeldung bestätigen"}</button></>}
  </div></section></>;
}
