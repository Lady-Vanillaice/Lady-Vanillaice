import type { ReactNode } from "react";
import { useTr } from "@/i18n";

function GiftCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="border border-champagne/15 bg-card p-5 md:p-6">
      <h3 className="font-display text-2xl text-champagne mb-3">{title}</h3>
      <div className="text-sm text-vanilla/70 leading-relaxed">{children}</div>
    </article>
  );
}

export function GiftGuideContent() {
  const tr = useTr();

  return (
    <div>
      <p className="text-sm text-vanilla/65 leading-relaxed max-w-2xl mb-6">
        {tr(
          "Wenn du mir gern etwas schenken möchtest, findest du hier ein paar Denkanstöße. Ich freue mich über liebevoll ausgesuchte Aufmerksamkeiten — die Liste ist Inspiration, keine Erwartung.",
          "If you would like to give me something, here are a few ideas. I appreciate thoughtful gifts — this list is inspiration, never an expectation."
        )}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <GiftCard title={tr("Herzhaftes", "Savory")}>
          <p>
            {tr(
              "Bei Pizza liebe ich besonders Schinken, Sahne, Zwiebel und Ei — oder Sahne mit Garnelen. Sushi mag ich ebenfalls sehr gern, vor allem Maki mit Avocado oder Sushi mit Garnelen oder Lachs. Auch eine Crunchy Chicken Bowl oder eine Käsebrezel vom Bäcker machen mich glücklich. Champignons mag ich gar nicht; bei Meeresfrüchten bin ich wählerisch — Garnelen mag ich aber auf Pizza und im Sushi.",
              "My favorite pizzas have ham, cream, onion and egg, or cream and shrimp. I also love sushi, especially avocado maki or sushi with shrimp or salmon. A crunchy chicken bowl or a cheese pretzel from the bakery makes me happy too. I don't like mushrooms and am selective about seafood — shrimp are an exception I enjoy on pizza and in sushi."
            )}
          </p>
        </GiftCard>

        <GiftCard title={tr("Süßes", "Something sweet")}>
          <p>
            {tr(
              "Kinderschokolade liebe ich abgöttisch — ich könnte mich darin hineinlegen. Ein Ü-Ei erinnert mich immer an meine Kindheit. Knusper Puffreis mag ich ebenfalls sehr gern, und eine Zimtschnecke vom Bäcker geht auch immer. Ich weiß, meine Mischung ist vielleicht etwas verrückt — aber wir sind doch alle ein bisschen verrückt.",
              "I absolutely adore Kinderschokolade — I could happily live in it. A Kinder Surprise egg always reminds me of my childhood. I also love crunchy puffed rice and a cinnamon roll from the bakery. Maybe my tastes are a little quirky — but we're all a little crazy."
            )}
          </p>
        </GiftCard>

        <GiftCard title={tr("Getränke", "Drinks")}>
          <p>
            {tr(
              "Alkoholfrei freue ich mich über Coca-Cola Zero — am liebsten im Glas — und über Matcha mit Hafermilch.",
              "For drinks, I love Coca-Cola Zero in a glass and matcha with oat milk."
            )}
          </p>
        </GiftCard>

        <GiftCard title={tr("Kleidung", "Clothing")}>
          <p className="mb-3">
            {tr(
              "Mit Kleidung kannst du mir aktuell wohl die größte Freude machen. Ich liebe Dessous, Kleider und Latex und bin noch am Anfang, mir eine schöne Auswahl aufzubauen. Meine Größen: Kleidergröße 36 und BH-Größe 70D.",
              "Clothing might be the loveliest gift for me right now. I love lingerie, dresses and latex, and I'm still at the beginning of building a collection I adore. My sizes: EU 36 in clothing and 70D bra."
            )}
          </p>
          <p>
            {tr("Bei ", "At ")}
            <a href="https://myholydesire.com" target="_blank" rel="noreferrer" className="text-champagne hover:underline">
              My Holy Desire
            </a>
            {tr(
              " in München findest du schöne Ideen. Dort berät dich Ella diskret und mit Stil; auch online gibt es eine passende Auswahl.",
              " in Munich you'll find lovely ideas. Ella offers discreet, stylish advice, and there's a suitable selection online too."
            )}
          </p>
        </GiftCard>

        <GiftCard title={tr("Schuhe", "Shoes")}>
          <p>
            {tr(
              "Ich habe einen wahnsinnigen Schuhtick und liebe Pleaser jeglicher Art. Schuhgröße 39.",
              "I have a serious shoe obsession and love all kinds of Pleasers. Shoe size EU 39."
            )}
          </p>
        </GiftCard>

        <GiftCard title={tr("Parfüm", "Perfume")}>
          <p>
            {tr(
              "Parfüms finde ich wahnsinnig toll — hier kannst du mich sehr gern überraschen.",
              "I love perfume, so feel free to surprise me with a scent you think I'll enjoy."
            )}
          </p>
        </GiftCard>

        <GiftCard title={tr("Schmuck", "Jewelry")}>
          <p>
            {tr(
              "Goldene Ketten und Armbänder liebe ich sehr. Besonders gern mag ich verstellbare, offene Ringe, die ich selbst anpassen kann.",
              "I love gold necklaces and bracelets. I especially like adjustable, open rings that I can size myself."
            )}
          </p>
        </GiftCard>
      </div>
    </div>
  );
}

