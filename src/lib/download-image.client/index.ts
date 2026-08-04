type ScheduleStudioDetails = {
  studio: string;
  address: string;
};

let scheduleTextLayoutInstalled = false;

function resolveScheduleStudioDetails(value: string): ScheduleStudioDetails | null {
  const text = value.replace(/…$/, "").trim();

  if (text.toLocaleLowerCase("de-DE").startsWith("studio60")) {
    return {
      studio: "Studio60",
      address: "Gärtnerstraße 60, 80992 München",
    };
  }

  if (text.toLocaleLowerCase("de-DE").startsWith("studio elegance")) {
    return {
      studio: "Studio Elegance",
      address: "Frankfurter Ring 139, 80807 München",
    };
  }

  const separatorIndex = text.indexOf(",");
  if (separatorIndex > 0) {
    return {
      studio: text.slice(0, separatorIndex).trim(),
      address: text.slice(separatorIndex + 1).trim(),
    };
  }

  return null;
}

function installScheduleTextLayout() {
  if (
    scheduleTextLayoutInstalled
    || typeof CanvasRenderingContext2D === "undefined"
  ) {
    return;
  }

  scheduleTextLayoutInstalled = true;
  const prototype = CanvasRenderingContext2D.prototype;
  const originalFillText = prototype.fillText;
  const originalMoveTo = prototype.moveTo;
  const originalLineTo = prototype.lineTo;

  const crownY = function crownY(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
  ) {
    const isScheduleCanvas = context.canvas.width === 1080 || context.canvas.width === 1200;
    const nearCrown =
      context.lineWidth === 5
      && Math.abs(x - context.canvas.width / 2) <= 80
      && y >= 45
      && y <= 145;
    return isScheduleCanvas && nearCrown ? y + 24 : y;
  };

  prototype.moveTo = function moveToWithCrownSpacing(x: number, y: number) {
    originalMoveTo.call(this, x, crownY(this, x, y));
  };

  prototype.lineTo = function lineToWithCrownSpacing(x: number, y: number) {
    originalLineTo.call(this, x, crownY(this, x, y));
  };

  prototype.fillText = function fillTextWithScheduleLayout(
    text: string,
    x: number,
    y: number,
    maxWidth?: number,
  ) {
    const isRightScheduleColumn =
      this.textAlign === "right"
      && x > this.canvas.width * 0.6
      && y > 250;

    if (isRightScheduleColumn) {
      const studioDetails = resolveScheduleStudioDetails(text);
      if (studioDetails) {
        this.save();
        this.textAlign = "right";
        this.fillStyle = "#f4ead8";
        this.font = '20px Arial, sans-serif';
        originalFillText.call(this, studioDetails.studio, x, y - 12);
        this.fillStyle = "#a99d8d";
        this.font = '17px Arial, sans-serif';
        originalFillText.call(this, studioDetails.address, x, y + 14);
        this.restore();
        return;
      }

      if (/^(DUO|CONTENT)(?:\b|\s|·)/.test(text)) {
        originalFillText.call(this, text, x, y + 16, maxWidth);
        return;
      }
    }

    const isDayPlanCustomerText =
      this.canvas.width === 1200
      && this.textAlign === "left"
      && /^24px Arial/.test(this.font)
      && y > 400;

    if (isDayPlanCustomerText) {
      this.save();
      this.font = '21px Arial, sans-serif';
      originalFillText.call(
        this,
        text,
        x,
        y,
        Math.min(maxWidth ?? Number.POSITIVE_INFINITY, this.canvas.width - x - 90),
      );
      this.restore();
      return;
    }

    originalFillText.call(this, text, x, y, maxWidth);
  };
}

installScheduleTextLayout();

export async function saveCanvasAsPng(canvas: HTMLCanvasElement, filename: string) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error("Das Bild konnte nicht erstellt werden."));
    }, "image/png");
  });

  const file = new File([blob], filename, { type: "image/png" });
  const sharingNavigator = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (
    sharingNavigator.share
    && (!sharingNavigator.canShare || sharingNavigator.canShare({ files: [file] }))
  ) {
    try {
      await sharingNavigator.share({
        files: [file],
        title: "Lady Vanilla Ice",
      });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
