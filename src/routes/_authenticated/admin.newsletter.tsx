import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { listNewsletterSubscribers, sendNewsletter } from "@/lib/newsletter.functions";

export const Route = createFileRoute("/_authenticated/admin/newsletter")({ component: NewsletterAdmin });

function NewsletterAdmin() {
  const list = useServerFn(listNewsletterSubscribers); const send = useServerFn(sendNewsletter); const qc = useQueryClient();
  const q = useQuery({ queryKey: ["newsletter-subscribers"], queryFn: () => list() });
  const [subject, setSubject] = useState(""); const [message, setMessage] = useState(""); const [preview, setPreview] = useState(false);
  const confirmed = (q.data ?? []).filter((r: any) => r.status === "confirmed").length;
  const pending = (q.data ?? []).filter((r: any) => r.status === "pending").length;
  const mutation = useMutation({ mutationFn: () => send({ data: { subject, message } }), onSuccess: (r) => { alert(`${r.sent} E-Mail(s) versendet${r.failed ? `, ${r.failed} fehlgeschlagen` : ""}.`); qc.invalidateQueries({ queryKey: ["newsletter-subscribers"] }); }, onError: e => alert((e as Error).message) });
  return <><PageHeader eyebrow="Admin" title={<>Neue Termine <em className="font-script gold-text not-italic">versenden</em></>} intro="Nur bestätigte Newsletter-Empfänger erhalten diese Nachricht." />
    <section className="py-10"><div className="container-luxe max-w-5xl space-y-6">
      <Link to="/admin" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-champagne"><ArrowLeft size={14}/> Zurück zum Admin</Link>
      <div className="grid sm:grid-cols-3 gap-3"><Stat label="Bestätigte Empfänger" value={confirmed}/><Stat label="Bestätigung offen" value={pending}/><Stat label="Abgemeldet" value={(q.data ?? []).filter((r:any)=>r.status==="unsubscribed").length}/></div>
      <div className="bg-card border border-champagne/25 p-5 space-y-5">
        <label className="block"><span className="eyebrow block mb-2">Betreff</span><input value={subject} onChange={e=>setSubject(e.target.value)} maxLength={140} className="input-luxe" placeholder="Neue Termine im August"/></label>
        <label className="block"><span className="eyebrow block mb-2">Nachricht</span><textarea value={message} onChange={e=>setMessage(e.target.value)} maxLength={5000} rows={10} className="input-luxe resize-y" placeholder="Hallo, ich habe neue Termine freigeschaltet …"/></label>
        <div className="flex flex-wrap gap-3"><button type="button" onClick={()=>setPreview(v=>!v)} className="btn-outline-gold"><Mail size={14}/> {preview ? "Vorschau schließen" : "Vorschau"}</button><button type="button" disabled={mutation.isPending || confirmed===0 || subject.trim().length<3 || message.trim().length<10} onClick={()=>confirm(`Nachricht wirklich an ${confirmed} bestätigte Empfänger senden?`)&&mutation.mutate()} className="btn-gold"><Send size={14}/> {mutation.isPending ? "Wird versendet…" : `An ${confirmed} Empfänger senden`}</button></div>
      </div>
      {preview && <div className="bg-white text-neutral-900 p-7 max-w-2xl mx-auto"><h2 className="text-2xl font-serif mb-5">{subject || "Betreff"}</h2><p className="whitespace-pre-wrap leading-relaxed">Hallo,<br/><br/>{message || "Deine Nachricht"}</p><hr className="my-6"/><p className="text-xs text-neutral-500">Jede versendete E-Mail enthält automatisch einen persönlichen Abmeldelink.</p></div>}
      <div className="bg-card border border-champagne/20 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-[10px] uppercase text-vanilla/45">{["Name","E-Mail","Status","Einwilligung"].map(h=><th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{q.isLoading?<tr><td className="p-4" colSpan={4}>Lade…</td></tr>:(q.data??[]).map((r:any)=><tr key={r.id} className="border-t border-champagne/10"><td className="p-3">{r.name||"—"}</td><td className="p-3">{r.email}</td><td className="p-3">{r.status==="confirmed"?"Bestätigt":r.status==="pending"?"Bestätigung offen":"Abgemeldet"}</td><td className="p-3">{r.confirmed_at?new Date(r.confirmed_at).toLocaleDateString("de-DE"):"—"}</td></tr>)}</tbody></table></div>
    </div></section></>;
}
function Stat({label,value}:{label:string;value:number}){return <div className="bg-card border border-champagne/20 p-4"><div className="text-[10px] uppercase tracking-widest text-vanilla/45">{label}</div><div className="font-display text-3xl text-champagne mt-1">{value}</div></div>}
