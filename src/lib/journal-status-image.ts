import { createClientOnlyFn } from "@tanstack/react-start";
import type { JournalPost } from "@/lib/journal-posts";

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
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

  if (lines.length > maxLines) {
    const clipped = lines.slice(0, maxLines);
    let last = `${clipped[maxLines - 1]}…`;
    while (last.length > 2 && ctx.measureText(last).width > maxWidth) {
      last = `${last.slice(0, -2)}…`;
    }
    clipped[maxLines - 1] = last;
    return clipped;
  }
  return lines;
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
) {
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return lines.length;
}

function drawCrown(ctx: CanvasRenderingContext2D, centerX: number, centerY: number) {
  ctx.save();
  ctx.strokeStyle = "#d8b676";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(centerX - 54, centerY + 22);
  ctx.lineTo(centerX - 62, centerY - 27);
  ctx.lineTo(centerX - 23, centerY + 1);
  ctx.lineTo(centerX, centerY - 42);
  ctx.lineTo(centerX + 23, centerY + 1);
  ctx.lineTo(centerX + 62, centerY - 27);
  ctx.lineTo(centerX + 54, centerY + 22);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centerX - 54, centerY + 34);
  ctx.lineTo(centerX + 54, centerY + 34);
  ctx.moveTo(centerX - 45, centerY + 45);
  ctx.lineTo(centerX + 45, centerY + 45);
  ctx.stroke();
  ctx.restore();
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export const createJournalStatusImage = createClientOnlyFn(async (post: JournalPost, options?: { downloadOnly?: boolean }) => {
  await document.fonts.load('500 78px "Cormorant Garamond"');
  await document.fonts.load('400 30px Inter');
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Das Statusbild konnte nicht erstellt werden.");

  const width = canvas.width;
  const height = canvas.height;
  const gold = "#d8b676";
  const ivory = "#f4ead8";
  const muted = "#b3a89a";
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#171411");
  gradient.addColorStop(0.48, "#0b0b0c");
  gradient.addColorStop(1, "#17130e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(216, 182, 118, 0.45)";
  ctx.lineWidth = 2;
  ctx.strokeRect(42, 42, width - 84, height - 84);
  ctx.strokeStyle = "rgba(216, 182, 118, 0.16)";
  ctx.strokeRect(58, 58, width - 116, height - 116);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = gold;
  ctx.font = '500 25px "Cormorant Garamond", serif';
  ctx.fillText("LADY VANILLA ICE", width / 2, 105);

  drawCrown(ctx, width / 2, 215);

  ctx.fillStyle = muted;
  ctx.font = "500 20px Inter, sans-serif";
  ctx.fillText(`JOURNAL  ·  ${post.category.toLocaleUpperCase("de-DE")}`, width / 2, 305);

  ctx.strokeStyle = "rgba(216, 182, 118, 0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(160, 355);
  ctx.lineTo(width - 160, 355);
  ctx.stroke();

  ctx.fillStyle = ivory;
  ctx.font = '500 78px "Cormorant Garamond", serif';
  const titleLines = wrapText(ctx, post.title, 820, 4);
  let y = 425;
  const titleCount = drawLines(ctx, titleLines, width / 2, y, 94);
  y += titleCount * 94 + 44;

  ctx.fillStyle = muted;
  ctx.font = "400 30px Inter, sans-serif";
  const excerptLines = wrapText(ctx, post.excerpt, 800, 5);
  const excerptCount = drawLines(ctx, excerptLines, width / 2, y, 47);
  y += excerptCount * 47 + 76;

  const quoteBlock = post.content.find((block) => block.type === "quote");
  const quote = quoteBlock?.type === "quote" ? quoteBlock.text : null;
  if (quote) {
    const quoteLines = wrapText(ctx, `„${quote}“`, 720, 4);
    const cardY = Math.min(y, 1320);
    const cardHeight = quoteLines.length * 50 + 76;
    ctx.fillStyle = "rgba(216, 182, 118, 0.06)";
    ctx.fillRect(120, cardY, width - 240, cardHeight);
    ctx.fillStyle = gold;
    ctx.fillRect(120, cardY, 4, cardHeight);
    ctx.textAlign = "center";
    ctx.fillStyle = ivory;
    ctx.font = 'italic 36px "Cormorant Garamond", serif';
    drawLines(ctx, quoteLines, width / 2, cardY + 36, 50);
  }

  ctx.strokeStyle = "rgba(216, 182, 118, 0.35)";
  ctx.beginPath();
  ctx.moveTo(160, 1605);
  ctx.lineTo(width - 160, 1605);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = gold;
  ctx.font = "500 21px Inter, sans-serif";
  ctx.fillText("DEN GANZEN BEITRAG LESEN", width / 2, 1650);

  ctx.fillStyle = ivory;
  ctx.font = "400 20px Inter, sans-serif";
  const url = `lady-vanillaice.com/journal/${post.slug}`;
  const urlLines = wrapText(ctx, url, 820, 2);
  drawLines(ctx, urlLines, width / 2, 1692, 30);

  ctx.fillStyle = muted;
  ctx.font = "400 18px Inter, sans-serif";
  ctx.fillText(`${formatDate(post.date)}  ·  ${post.readingMinutes} MIN LESEZEIT`, width / 2, 1798);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Das Statusbild konnte nicht erstellt werden.")), "image/png");
  });
  const filename = `lady-vanilla-ice-${post.slug}-status.png`;
  const file = new File([blob], filename, { type: "image/png" });
  const shareNavigator = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (!options?.downloadOnly && shareNavigator.share && (!shareNavigator.canShare || shareNavigator.canShare({ files: [file] }))) {
    try {
      await shareNavigator.share({ files: [file], title: post.title });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
});
