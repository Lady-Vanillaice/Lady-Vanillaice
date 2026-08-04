import { supabase } from "@/integrations/supabase/client";

type ScheduleStudioDetails = {
  studio: string;
  address: string;
};

type TimelineSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: "open" | "held" | "booked";
};

type TimelineBooking = {
  slot_id: string | null;
  requested_start: string | null;
  duration_minutes: number | null;
  status: string;
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

const CALENDAR_TIME_ZONE = "Europe/Berlin";

function calendarDayKey(value: string | Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: CALENDAR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function calendarDateLabel(value: string | Date) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: CALENDAR_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function calendarTimeLabel(value: string | Date) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: CALENDAR_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

async function addCalendarTimeline(source: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  try {
    const nowIso = new Date().toISOString();
    const { data: slotRows, error: slotError } = await supabase
      .from("availability_slots")
      .select("id, starts_at, ends_at, status")
      .eq("is_hidden", false)
      .gt("ends_at", nowIso)
      .order("starts_at", { ascending: true });

    if (slotError || !slotRows?.length) return source;

    const slots = slotRows as TimelineSlot[];
    const slotIds = slots.map((slot) => slot.id);
    const { data: bookingRows } = await supabase
      .from("bookings")
      .select("slot_id, requested_start, duration_minutes, status")
      .in("slot_id", slotIds)
      .in("status", ["pending", "confirmed", "waiting_deposit", "open", "rescheduling"]);

    const bookings = (bookingRows ?? []) as TimelineBooking[];
    const grouped = new Map<string, TimelineSlot[]>();
    for (const slot of slots) {
      const key = calendarDayKey(slot.starts_at);
      grouped.set(key, [...(grouped.get(key) ?? []), slot]);
    }

    const days = [...grouped.entries()];
    if (days.length === 0) return source;

    const insertY = 250;
    const rowHeight = 58;
    const timelineHeight = 78 + days.length * rowHeight;
    const output = document.createElement("canvas");
    output.width = source.width;
    output.height = source.height + timelineHeight;
    const ctx = output.getContext("2d");
    if (!ctx) return source;

    const background = "#0b0b0c";
    const gold = "#d8b676";
    const softGold = "#8f7448";
    const vanilla = "#f4ead8";
    const muted = "#a99d8d";
    const reserved = "#7f2438";
    const held = "#b27a3f";

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, output.width, output.height);
    ctx.drawImage(source, 0, 0, source.width, insertY, 0, 0, source.width, insertY);
    ctx.drawImage(
      source,
      0,
      insertY,
      source.width,
      source.height - insertY,
      0,
      insertY + timelineHeight,
      source.width,
      source.height - insertY,
    );

    ctx.fillStyle = background;
    ctx.fillRect(55, insertY, output.width - 110, timelineHeight);

    ctx.textAlign = "left";
    ctx.fillStyle = gold;
    ctx.font = 'bold 17px Arial, sans-serif';
    ctx.fillText("EINGETRAGENE ZEITFENSTER", 84, insertY + 30);

    ctx.font = '14px Arial, sans-serif';
    ctx.fillStyle = muted;
    ctx.fillText("Gold = frei", 84, insertY + 55);
    ctx.fillStyle = held;
    ctx.fillText("Orange = reserviert", 190, insertY + 55);
    ctx.fillStyle = reserved;
    ctx.fillText("Bordeaux = belegt", 352, insertY + 55);

    const barLeft = 190;
    const barRight = output.width - 86;
    const barWidth = barRight - barLeft;

    days.forEach(([dayKey, daySlots], dayIndex) => {
      const y = insertY + 86 + dayIndex * rowHeight;
      const startMs = Math.min(...daySlots.map((slot) => new Date(slot.starts_at).getTime()));
      const endMs = Math.max(...daySlots.map((slot) => new Date(slot.ends_at).getTime()));
      const span = Math.max(1, endMs - startMs);

      ctx.textAlign = "left";
      ctx.fillStyle = vanilla;
      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.fillText(calendarDateLabel(daySlots[0].starts_at), 84, y + 6);

      ctx.fillStyle = "rgba(169,157,141,0.2)";
      ctx.fillRect(barLeft, y - 10, barWidth, 18);

      for (const slot of daySlots) {
        const slotStart = new Date(slot.starts_at).getTime();
        const slotEnd = new Date(slot.ends_at).getTime();
        const x = barLeft + ((slotStart - startMs) / span) * barWidth;
        const width = Math.max(3, ((slotEnd - slotStart) / span) * barWidth);
        ctx.fillStyle = slot.status === "open" ? gold : slot.status === "held" ? held : reserved;
        ctx.fillRect(x, y - 10, width, 18);
      }

      const dayBookings = bookings.filter((booking) => {
        if (!booking.slot_id || !booking.requested_start) return false;
        const slot = daySlots.find((item) => item.id === booking.slot_id);
        return Boolean(slot) && calendarDayKey(booking.requested_start) === dayKey;
      });

      for (const booking of dayBookings) {
        if (!booking.requested_start) continue;
        const bookingStart = new Date(booking.requested_start).getTime();
        const bookingEnd = bookingStart + Math.max(30, booking.duration_minutes ?? 30) * 60_000;
        const clippedStart = Math.max(startMs, bookingStart);
        const clippedEnd = Math.min(endMs, bookingEnd);
        if (clippedEnd <= clippedStart) continue;
        const x = barLeft + ((clippedStart - startMs) / span) * barWidth;
        const width = Math.max(4, ((clippedEnd - clippedStart) / span) * barWidth);
        ctx.fillStyle = booking.status === "confirmed" ? reserved : held;
        ctx.fillRect(x, y - 13, width, 24);
      }

      ctx.textAlign = "left";
      ctx.fillStyle = muted;
      ctx.font = '12px Arial, sans-serif';
      ctx.fillText(calendarTimeLabel(new Date(startMs)), barLeft, y + 28);
      ctx.textAlign = "right";
      ctx.fillText(calendarTimeLabel(new Date(endMs)), barRight, y + 28);
    });

    ctx.strokeStyle = gold;
    ctx.lineWidth = 3;
    ctx.strokeRect(54, 54, output.width - 108, output.height - 108);
    ctx.strokeStyle = softGold;
    ctx.lineWidth = 1;
    ctx.strokeRect(67, 67, output.width - 134, output.height - 134);

    return output;
  } catch {
    return source;
  }
}

export async function saveCanvasAsPng(canvas: HTMLCanvasElement, filename: string) {
  const outputCanvas = filename.includes("freie-termine")
    ? await addCalendarTimeline(canvas)
    : canvas;

  const blob = await new Promise<Blob>((resolve, reject) => {
    outputCanvas.toBlob((value) => {
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
