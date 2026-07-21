import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star, Quote, Send, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { de as deLocale, enUS } from "date-fns/locale";
import { PageHeader } from "../components/site/PageHeader";
import {
  listApprovedTestimonials,
  submitTestimonial,
} from "../lib/testimonials.functions";
import { useTr, useLang } from "@/i18n";

export const Route = createFileRoute("/erfahrungsberichte")({
  head: () => ({
    meta: [
      { title: "Erfahrungsberichte — Lady Vanilla Ice" },
      {
        name: "description",
        content:
          "Echte Stimmen von Gästen über ihre Sessions bei Lady Vanilla Ice. Teile auch deine Erfahrung anonym mit einem Pseudonym.",
      },
      { property: "og:title", content: "Erfahrungsberichte — Lady Vanilla Ice" },
      {
        property: "og:description",
        content:
          "Diskrete, ehrliche Erfahrungsberichte von Gästen — und Raum für deine eigene Stimme.",
      },
      { property: "og:url", content: "https://lady-vanillaice.com/erfahrungsberichte" },
    ],
    links: [{ rel: "canonical", href: "https://lady-vanillaice.com/erfahrungsberichte" }],
  }),
  component: TestimonialsPage,
  errorComponent: () => (
    <div className="min-h-screen pt-40 text-center text-vanilla/60">
      Diese Seite konnte nicht geladen werden. / This page could not be loaded.
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen pt-40 text-center text-vanilla/60">
      Seite nicht gefunden. / Page not found.
    </div>
  ),
});

type ApprovedTestimonial = {
  id: string;
  pseudonym: string;
  content: string;
  rating: number | null;
  created_at: string;
};

function TestimonialsPage() {
  const listFn = useServerFn(listApprovedTestimonials);
  const tr = useTr();
  const { lang } = useLang();
  const q = useQuery({
    queryKey: ["approved-testimonials"],
    queryFn: () => listFn() as Promise<ApprovedTestimonial[]>,
  });

  return (
    <>
      <PageHeader
        eyebrow={tr("Erfahrungsberichte", "Reviews")}
        title={
          <>
            {tr("Stimmen aus ", "Voices from ")}
            <em className="font-script gold-text not-italic">{tr("meinen Sessions", "my sessions")}</em>
          </>
        }
        intro={tr(
          "Ehrliche Worte von Gästen, die ihren Weg zu mir gefunden haben. Jede Stimme wird vor Veröffentlichung von mir persönlich gelesen — anonym, respektvoll, ohne Klarnamen.",
          "Honest words from guests who have found their way to me. Every voice is read by me personally before it goes online — anonymous, respectful, no real names."
        )}
      />

      <section className="py-20">
        <div className="container-luxe grid lg:grid-cols-[1.4fr_1fr] gap-12">
          <div>
            <h2 className="font-display text-3xl gold-text mb-8">{tr("Was Gäste sagen", "What guests say")}</h2>
            {q.isLoading && (
              <p className="text-vanilla/50 text-sm">{tr("Lade Berichte…", "Loading reviews…")}</p>
            )}
            {!q.isLoading && (q.data?.length ?? 0) === 0 && (
              <div className="border border-dashed border-champagne/20 p-10 text-center text-vanilla/55">
                {tr(
                  "Noch sind keine Erfahrungsberichte freigegeben.",
                  "No reviews have been published yet."
                )}
                <br />
                {tr("Du kannst der erste sein, der seine Stimme teilt.", "You can be the first to share your voice.")}
              </div>
            )}
            <div className="space-y-6">
              {q.data?.map((t) => (
                <article
                  key={t.id}
                  className="bg-card border border-champagne/15 p-6 md:p-8 relative"
                >
                  <Quote
                    size={28}
                    className="absolute -top-3 left-6 text-champagne bg-anthracite px-1"
                  />
                  {t.rating !== null && (
                    <div className="flex gap-1 mb-3" aria-label={tr(`${t.rating} von 5 Sternen`, `${t.rating} out of 5 stars`)}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={
                            i < (t.rating ?? 0)
                              ? "fill-champagne text-champagne"
                              : "text-vanilla/20"
                          }
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-vanilla/85 leading-relaxed whitespace-pre-line italic">
                    {t.content}
                  </p>
                  <div className="mt-5 pt-4 border-t border-champagne/10 flex items-center justify-between text-xs">
                    <span className="font-display text-champagne tracking-wide">
                      — {t.pseudonym}
                    </span>
                    <span className="text-vanilla/40">
                      {format(new Date(t.created_at), "MMMM yyyy", { locale: lang === "en" ? enUS : deLocale })}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside>
            <div className="sticky top-28">
              <h2 className="font-display text-3xl gold-text mb-4">
                {tr("Teile deine Erfahrung", "Share your experience")}
              </h2>
              <p className="text-vanilla/65 text-sm leading-relaxed mb-6">
                {tr(
                  "Schreibe unter einem Pseudonym — kein Klarname, keine E-Mail nötig. Dein Bericht erscheint erst online, nachdem ich ihn persönlich gelesen und freigegeben habe.",
                  "Write under a pseudonym — no real name, no email required. Your review only appears online after I have personally read and approved it."
                )}
              </p>
              <SubmitForm />
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function SubmitForm() {
  const qc = useQueryClient();
  const submit = useServerFn(submitTestimonial);
  const tr = useTr();
  const [pseudonym, setPseudonym] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mut = useMutation({
    mutationFn: () =>
      submit({
        data: {
          pseudonym: pseudonym.trim(),
          content: content.trim(),
          rating: rating > 0 ? rating : undefined,
        },
      }),
    onSuccess: () => {
      setDone(true);
      setPseudonym("");
      setContent("");
      setRating(0);
      qc.invalidateQueries({ queryKey: ["approved-testimonials"] });
    },
    onError: (e) => setErr(e instanceof Error ? e.message : tr("Bitte später erneut versuchen.", "Please try again later.")),
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setDone(false);
    if (pseudonym.trim().length < 2) {
      setErr(tr("Bitte ein Pseudonym mit mindestens 2 Zeichen wählen.", "Please choose a pseudonym with at least 2 characters."));
      return;
    }
    if (content.trim().length < 20) {
      setErr(tr("Dein Bericht sollte mindestens 20 Zeichen umfassen.", "Your review should be at least 20 characters long."));
      return;
    }
    mut.mutate();
  }

  if (done) {
    return (
      <div className="bg-card border border-champagne/30 p-8 text-center">
        <CheckCircle2 className="mx-auto text-champagne mb-3" size={28} />
        <div className="font-display text-xl text-vanilla mb-2">{tr("Danke dir.", "Thank you.")}</div>
        <p className="text-sm text-vanilla/65 leading-relaxed">
          {tr(
            "Dein Erfahrungsbericht ist eingegangen. Sobald ich ihn freigegeben habe, erscheint er hier auf der Seite.",
            "Your review has been received. Once I have approved it, it will appear here on the page."
          )}
        </p>
        <button
          onClick={() => setDone(false)}
          className="btn-outline-gold mt-6 !py-2 !px-5 !text-[0.65rem]"
        >
          {tr("Weiteren Bericht schreiben", "Write another review")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="bg-card border border-champagne/15 p-6 space-y-4">
      <div>
        <label className="eyebrow block mb-2">{tr("Pseudonym", "Pseudonym")}</label>
        <input
          value={pseudonym}
          onChange={(e) => setPseudonym(e.target.value)}
          className="input-luxe !py-2"
          maxLength={60}
          placeholder={tr("z. B. M. aus München", "e.g. M. from Munich")}
          required
        />
      </div>

      <div>
        <label className="eyebrow block mb-2">{tr("Bewertung (optional)", "Rating (optional)")}</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(rating === n ? 0 : n)}
              className="p-1 transition"
              aria-label={tr(`${n} Sterne`, `${n} stars`)}
            >
              <Star
                size={22}
                className={
                  n <= rating
                    ? "fill-champagne text-champagne"
                    : "text-vanilla/30 hover:text-champagne"
                }
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="eyebrow block mb-2">{tr("Dein Bericht", "Your review")}</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="input-luxe !py-2 min-h-[180px] resize-y w-full"
          maxLength={2000}
          minLength={20}
          placeholder={tr(
            "Was hast du erlebt? Wie hast du die Session empfunden?",
            "What did you experience? How did the session feel to you?"
          )}
          required
        />
        <div className="text-[0.65rem] text-vanilla/40 mt-1 text-right">
          {content.length} / 2000
        </div>
      </div>

      {err && <div className="text-xs text-destructive">{err}</div>}

      <button
        type="submit"
        disabled={mut.isPending}
        className="btn-gold w-full !py-3"
      >
        <Send size={14} /> {mut.isPending ? tr("Wird gesendet…", "Sending…") : tr("Bericht einreichen", "Submit review")}
      </button>

      <p className="text-[0.65rem] text-vanilla/45 leading-relaxed">
        {tr(
          "Bitte keine Klarnamen, Telefonnummern oder Adressen — weder von dir noch von Dritten. Berichte mit unangemessenem Inhalt werden nicht freigegeben.",
          "Please no real names, phone numbers or addresses — neither yours nor anyone else's. Reviews with inappropriate content will not be approved."
        )}
      </p>
    </form>
  );
}
