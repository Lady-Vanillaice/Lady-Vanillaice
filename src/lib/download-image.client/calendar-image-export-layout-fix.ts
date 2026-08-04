let calendarImageTextFixInstalled = false;

function installCalendarImageTextFix() {
  if (
    calendarImageTextFixInstalled
    || typeof CanvasRenderingContext2D === "undefined"
  ) {
    return;
  }

  calendarImageTextFixInstalled = true;
  const prototype = CanvasRenderingContext2D.prototype;
  const previousFillText = prototype.fillText;

  prototype.fillText = function fillTextWithoutDuplicateStudioAddress(
    text: string,
    x: number,
    y: number,
    maxWidth?: number,
  ) {
    const normalized = text.trim().toLocaleLowerCase("de-DE");
    const isStandaloneStudioName =
      normalized === "studio60" || normalized === "studio elegance";
    const isCalendarImageStudioColumn =
      isStandaloneStudioName
      && this.canvas.width === 1080
      && this.textAlign === "right"
      && x > this.canvas.width * 0.6
      && y > 250;

    if (isCalendarImageStudioColumn) {
      const originalTextAlign = this.textAlign;
      this.textAlign = "end";
      previousFillText.call(this, text, x, y, maxWidth);
      this.textAlign = originalTextAlign;
      return;
    }

    previousFillText.call(this, text, x, y, maxWidth);
  };
}

installCalendarImageTextFix();
