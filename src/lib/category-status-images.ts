import { createClientOnlyFn } from "@tanstack/react-start";

/** Eine Kategorie, die als WhatsApp-Statusbild (1080 × 1920) erzeugt werden kann. */
export type StatusCard = {
  key: string;
  eyebrow: string;
  title: string;
  intro?: string;
  rows?: { label: string; value: string; note?: string }[];
  bullets?: string[];
  note?: string;
  path: string;
};

export const STATUS_CARDS: StatusCard[] = [
  {
    key: "preise",
    eyebrow: "Studio · Preise",
    title: "Meine Preise",
    intro: "Exklusive Sessions in München & Umgebung. Diskret und ganz auf dich abgestimmt.",
    rows: [
      { label: "30 Minuten", value: "200 €" },
      { label: "60 Minuten", value: "300 €" },
      { label: "90 Minuten", value: "500 €" },
      { label: "120 Minuten", value: "600 €" },
      { label: "Liegezeit", value: "ab 150 €", note: "pro Stunde" },
      { label: "Doppelsession", value: "300 €", note: "je Stunde & Domina" },
    ],
    note: "Termin per WhatsApp anfragen",
    path: "preise",
  },
  {
    key: "langzeiterziehung",
    eyebrow: "Erziehung über Wochen & Monate",
    title: "Langzeiterziehung",
    intro: "Du meldest dich, erledigst meine Aufgaben und weist sie nach. Ich kontrolliere, lobe und bestrafe.",
    rows: [
      { label: "Basis", value: "300 €", note: "täglich melden · 1 Aufgabe pro Woche" },
      { label: "Intensiv", value: "500 €", note: "morgens & abends · 3 Aufgaben pro Woche" },
      { label: "Premium", value: "750 €", note: "5 Aufgaben pro Woche · 1 Cam-Session" },
    ],
    note: "pro Monat · Bezahlt wird im Voraus",
    path: "langzeiterziehung",
  },
  {
    key: "cam",
    eyebrow: "Online-Erziehung",
    title: "Cam-Sessions",
    intro: "Live und persönlich, egal wo du gerade bist. Ich gebe die Anweisungen, du gehorchst.",
    rows: [
      { label: "5–10 Minuten", value: "50 €" },
      { label: "15 Minuten", value: "75 €" },
      { label: "20 Minuten", value: "100 €" },
    ],
    note: "Länger? Vorher ausmachen · Bezahlt wird im Voraus",
    path: "cam",
  },
  {
    key: "leistungen",
    eyebrow: "Meine Spielwelten",
    title: "Leistungen",
    intro: "Psychologisch, individuell, unberechenbar. Mal hart, mal weich, immer echt.",
    bullets: [
      "Für Einsteiger",
      "Körper & Sinne",
      "Schmerz & Disziplin",
      "Macht & Kontrolle",
      "Verwandlung & Rollenspiele",
    ],
    note: "Alle Details auf meiner Homepage",
    path: "leistungen",
  },
  {
    key: "duo",
    eyebrow: "Zwei Dominas · eine Session",
    title: "Duo-Sessions",
    intro: "Doppelte Macht, doppelte Kontrolle. Eine gemeinsame Session mit zwei Dominas.",
    rows: [{ label: "Pro Stunde", value: "300 €", note: "je Domina" }],
    note: "90 bis 300 Minuten · Individuelle Absprache",
    path: "duo-sessions",
  },
  {
    key: "custom",
    eyebrow: "Exklusiv für dich",
    title: "Custom Content",
    intro: "Bilder und Videos, individuell nach deinen Wünschen produziert.",
    rows: [
      { label: "Bilder", value: "10 €", note: "pro Bild" },
      { label: "Videos", value: "30 €", note: "pro Minute" },
    ],
    note: "Diskrete Lieferung · Bezahlt wird im Voraus",
    path: "custom",
  },
  {
    key: "content-dreh",
    eyebrow: "Mitwirken bei einem Dreh",
    title: "Content-Dreh",
    intro: "Du willst Teil meines Contents werden? Dann bewirb dich.",
    bullets: ["Volljährig (18+)", "Unterschriebene Einverständniserklärung", "Mit oder ohne Maske"],
    note: "Tribut wird individuell besprochen",
    path: "content-dreh",
  },
  {
    key: "online",
    eyebrow: "Meine digitale Welt",
    title: "Online",
    intro: "Authentisch. Exklusiv. Vanilla Ice.",
    bullets: ["BestFans", "Clips4Sale", "Onlineshop", "Telegram"],
    note: "Alle Links auf meiner Homepage",
    path: "online",
  },
];

const GOLD = "#d8b676";
const IVORY = "#f4ead8";
const MUTED = "#b3a89a";
const W = 1080;
const H = 1920;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCrown(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 54, cy + 22);
  ctx.lineTo(cx - 62, cy - 27);
  ctx.lineTo(cx - 23, cy + 1);
  ctx.lineTo(cx, cy - 42);
  ctx.lineTo(cx + 23, cy + 1);
  ctx.lineTo(cx + 62, cy - 27);
  ctx.lineTo(cx + 54, cy + 22);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 54, cy + 34);
  ctx.lineTo(cx + 54, cy + 34);
  ctx.moveTo(cx - 45, cy + 45);
  ctx.lineTo(cx + 45, cy + 45);
  ctx.stroke();
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, y: number, alpha = 0.45, inset = 160) {
  ctx.strokeStyle = `rgba(216, 182, 118, ${alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(inset, y);
  ctx.lineTo(W - inset, y);
  ctx.stroke();
}

async function loadFonts() {
  await document.fonts.load('500 96px "Cormorant Garamond"');
  await document.fonts.load('italic 500 40px "Cormorant Garamond"');
  await document.fonts.load("400 30px Inter");
  await document.fonts.ready;
}

function renderCard(card: StatusCard) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Das Statusbild konnte nicht erstellt werden.");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#171411");
  bg.addColorStop(0.48, "#0b0b0c");
  bg.addColorStop(1, "#17130e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 900);
  glow.addColorStop(0, "rgba(216, 182, 118, 0.12)");
  glow.addColorStop(1, "rgba(216, 182, 118, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(216, 182, 118, 0.45)";
  ctx.lineWidth = 2;
  ctx.strokeRect(42, 42, W - 84, H - 84);
  ctx.strokeStyle = "rgba(216, 182, 118, 0.16)";
  ctx.strokeRect(58, 58, W - 116, H - 116);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = GOLD;
  ctx.font = '500 26px "Cormorant Garamond", serif';
  ctx.fillText("L A D Y   V A N I L L A   I C E", W / 2, 110);
  drawCrown(ctx, W / 2, 225);

  ctx.fillStyle = MUTED;
  ctx.font = "500 21px Inter, sans-serif";
  ctx.fillText(card.eyebrow.toLocaleUpperCase("de-DE").split("").join(" "), W / 2, 320);
  line(ctx, 372);

  // Inhalt zweimal zeichnen: erst unsichtbar zum Messen, dann vertikal zentriert.
  const drawContent = (startY: number) => {
    let y = startY;
    ctx.textAlign = "center";
    ctx.fillStyle = IVORY;
    let titleSize = 104;
    ctx.font = `500 ${titleSize}px "Cormorant Garamond", serif`;
    while (ctx.measureText(card.title).width > 860 && titleSize > 64) {
      titleSize -= 4;
      ctx.font = `500 ${titleSize}px "Cormorant Garamond", serif`;
    }
    ctx.fillText(card.title, W / 2, y);
    y += titleSize + 50;

    if (card.intro) {
      ctx.fillStyle = MUTED;
      ctx.font = "400 31px Inter, sans-serif";
      for (const l of wrapText(ctx, card.intro, 800)) {
        ctx.fillText(l, W / 2, y);
        y += 46;
      }
      y += 50;
    }

    const left = 150;
    const right = W - 150;

    if (card.rows?.length) {
      const rowHeight = card.rows.some((r) => r.note) ? 128 : 104;
      line(ctx, y, 0.25, left);
      for (const row of card.rows) {
        const top = y + (row.note ? 22 : 30);
        ctx.textAlign = "left";
        ctx.fillStyle = IVORY;
        ctx.font = '500 46px "Cormorant Garamond", serif';
        ctx.fillText(row.label, left, top);
        if (row.note) {
          ctx.fillStyle = MUTED;
          ctx.font = "400 23px Inter, sans-serif";
          let note = row.note;
          while (ctx.measureText(note).width > 560 && note.length > 4) note = `${note.slice(0, -2)}…`;
          ctx.fillText(note, left, top + 58);
        }
        ctx.textAlign = "right";
        ctx.fillStyle = GOLD;
        ctx.font = '500 56px "Cormorant Garamond", serif';
        ctx.fillText(row.value, right, top - 4);
        y += rowHeight;
        line(ctx, y, 0.25, left);
      }
      y += 60;
    }

    if (card.bullets?.length) {
      ctx.textAlign = "center";
      for (const bullet of card.bullets) {
        ctx.fillStyle = GOLD;
        ctx.font = "400 22px Inter, sans-serif";
        ctx.fillText("◆", W / 2, y);
        ctx.fillStyle = IVORY;
        ctx.font = '500 50px "Cormorant Garamond", serif';
        ctx.fillText(bullet, W / 2, y + 34);
        y += 122;
      }
      y += 20;
    }

    if (card.note) {
      ctx.textAlign = "center";
      ctx.fillStyle = IVORY;
      ctx.font = 'italic 500 38px "Cormorant Garamond", serif';
      for (const l of wrapText(ctx, card.note, 820)) {
        ctx.fillText(l, W / 2, y);
        y += 50;
      }
    }
    return y;
  };
  ctx.save();
  ctx.globalAlpha = 0;
  const contentHeight = drawContent(0);
  ctx.restore();
  const areaTop = 420;
  const areaBottom = 1600;
  drawContent(Math.max(areaTop, areaTop + (areaBottom - areaTop - contentHeight) / 2));

  ctx.textAlign = "center";
  line(ctx, 1640, 0.35);
  ctx.fillStyle = GOLD;
  ctx.font = "500 22px Inter, sans-serif";
  ctx.fillText("M E H R   A U F   M E I N E R   H O M E P A G E", W / 2, 1685);
  ctx.fillStyle = IVORY;
  ctx.font = "400 27px Inter, sans-serif";
  ctx.fillText(`lady-vanillaice.com/${card.path}`, W / 2, 1735);

  return canvas;
}

function toBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Das Statusbild konnte nicht erstellt werden."))), "image/png");
  });
}

/** Kleine Vorschaubilder für die Admin-Seite. */
export const renderStatusPreviews = createClientOnlyFn(async (cards: StatusCard[]) => {
  await loadFonts();
  const result: Record<string, string> = {};
  for (const card of cards) result[card.key] = renderCard(card).toDataURL("image/jpeg", 0.8);
  return result;
});

/**
 * Erstellt die Statusbilder. Auf dem Handy öffnet sich das Teilen-Menü
 * (dort „Bilder sichern“ oder direkt WhatsApp wählen), sonst werden die PNGs heruntergeladen.
 */
export const downloadStatusImages = createClientOnlyFn(async (cards: StatusCard[]) => {
  await loadFonts();
  const files: File[] = [];
  for (const card of cards) {
    const blob = await toBlob(renderCard(card));
    files.push(new File([blob], `lady-vanilla-ice-${card.key}-status.png`, { type: "image/png" }));
  }

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  if (isTouch && nav.share && (!nav.canShare || nav.canShare({ files }))) {
    try {
      await nav.share({ files });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  for (const file of files) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    await new Promise((r) => setTimeout(r, 400));
  }
});
