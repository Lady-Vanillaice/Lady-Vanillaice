from pathlib import Path

path = Path('src/routes/_authenticated/admin.kassenbuch.tsx')
text = path.read_text()
start = text.index('  async function exportTravelLog() {')
end = text.index('\n\n  const incomeActions', start)
replacement = r'''  async function exportTravelLog() {
    const cleanTravelText = (value: string) => value
      .replace(/\s*(?:—|–|-)\s*(?:Raum|Room)\b.*$/i, "")
      .replace(/\s*,\s*(?:Raum|Room)\b.*$/i, "")
      .trim();
    const cleanTravelStudio = (value: string) => value
      .replace(/\s*(?:—|–|-)\s*(?:Raum|Room|VIP(?:\s+Lounge)?)\b.*$/i, "")
      .trim();
    const clockMinutes = (value: string | null) => {
      const label = timeLabel(value);
      if (!label) return null;
      const [hours, minutes] = label.split(":").map(Number);
      return hours * 60 + minutes;
    };
    const clock = (minutes: number) => {
      const dayShift = Math.floor(minutes / 1440);
      const normalized = ((minutes % 1440) + 1440) % 1440;
      const label = `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
      if (dayShift > 0) return `${label} Uhr (+${dayShift} Tag${dayShift > 1 ? "e" : ""})`;
      if (dayShift < 0) return `${label} Uhr (${Math.abs(dayShift)} Tag vorher)`;
      return `${label} Uhr`;
    };
    const awayStart = (firstStart: number | null) => firstStart !== null && firstStart <= 12 * 60 ? firstStart - 3 * 60 : 10 * 60;
    const awayEnd = (lastEnd: number | null, lastStart: number | null) => (lastEnd ?? lastStart ?? 20 * 60) + 4 * 60;

    const appointmentMap = new Map<string, { date: string; studio: string; address: string; firstStart: number | null; lastStart: number | null; lastEnd: number | null }>();
    for (const entry of data.filter(entry => entry.termin_datum.startsWith(month)).filter(entry => entry.source === "booking" && entry.status !== "cancelled")) {
      const parts = studioParts(entry);
      const studio = cleanTravelStudio(parts.studio);
      const address = cleanTravelText(parts.address);
      const key = `${entry.termin_datum}|${studio.toLowerCase()}|${address.toLowerCase()}`;
      const startMinutes = clockMinutes(entry.termin_start);
      const endMinutes = clockMinutes(entry.termin_ende);
      const existing = appointmentMap.get(key);
      if (!existing) {
        appointmentMap.set(key, { date: entry.termin_datum, studio, address, firstStart: startMinutes, lastStart: startMinutes, lastEnd: endMinutes });
      } else {
        if (startMinutes !== null && (existing.firstStart === null || startMinutes < existing.firstStart)) existing.firstStart = startMinutes;
        if (startMinutes !== null && (existing.lastStart === null || startMinutes > existing.lastStart)) existing.lastStart = startMinutes;
        if (endMinutes !== null && (existing.lastEnd === null || endMinutes > existing.lastEnd)) existing.lastEnd = endMinutes;
      }
    }
    const appointments = [...appointmentMap.values()].sort((a, b) => a.date.localeCompare(b.date) || a.studio.localeCompare(b.studio));
    const missingAddress = appointments.find(entry => !entry.address);
    if (missingAddress) { alert(`Für ${missingAddress.studio} am ${dateLabel(missingAddress.date)} fehlt die Studio-Adresse. Bitte den Termin zuerst im Kassenbuch bearbeiten.`); return; }
    if (!appointments.length) { alert("Für den gewählten Monat gibt es keine Termine mit Fahrt."); return; }
    setTravelLogPending(true);
    try {
      const distanceResult = await calculateDistances({ data: { destinations: appointments.map(entry => ({ key: `${entry.studio}|${entry.address}`, address: entry.address })) } });
      const kilometres = new Map(distanceResult.distances.map(entry => [entry.key, entry.kilometres]));
      const travelRows: Array<[string, string, string, string, string, string, number]> = [];
      for (let index = 0; index < appointments.length;) {
        const first = appointments[index]; let lastIndex = index;
        while (lastIndex + 1 < appointments.length && appointments[lastIndex + 1].date === addDays(appointments[lastIndex].date, 1) && appointments[lastIndex + 1].studio === first.studio && appointments[lastIndex + 1].address === first.address) lastIndex += 1;
        const km = kilometres.get(`${first.studio}|${first.address}`) ?? 0;
        if (lastIndex === index) {
          const period = `${clock(awayStart(first.firstStart))} – ${clock(awayEnd(first.lastEnd, first.lastStart))}`;
          travelRows.push([dateLabel(first.date), period, `${distanceResult.homeAddress} - ${first.address} - ${distanceResult.homeAddress}`, first.studio, first.address, "Hin- und Rückfahrt", km * 2]);
        } else {
          const last = appointments[lastIndex];
          travelRows.push([dateLabel(first.date), `${clock(awayStart(first.firstStart))} – Übernachtung vor Ort`, `${distanceResult.homeAddress} - ${first.address}`, first.studio, first.address, "Hinfahrt, Übernachtung vor Ort", km]);
          travelRows.push([dateLabel(last.date), `Übernachtung vor Ort – ${clock(awayEnd(last.lastEnd, last.lastStart))}`, `${last.address} - ${distanceResult.homeAddress}`, last.studio, last.address, "Rückfahrt nach mehrtägigem Aufenthalt", km]);
        }
        index = lastIndex + 1;
      }
      const totalKm = travelRows.reduce((sum, row) => sum + row[6], 0);
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" }); addPdfLogo(doc);
      const monthLabel = format(parseISO(`${month}-01`), "LLLL yyyy", { locale: de });
      doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.text("FAHRTENBUCH", 28, 40); doc.setFontSize(11); doc.text(monthLabel, 28, 58); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(`Ausgangspunkt: ${distanceResult.homeAddress}`, 28, 74);
      autoTable(doc, { startY: 90, head: [["Datum", "Von–bis", "Fahrtstrecke", "Studio", "Adresse", "Anlass / Art der Fahrt", "Kilometer"]], body: travelRows.map(row => [row[0], row[1], row[2], row[3], row[4], row[5], `${row[6]} km`]), foot: [["SUMME", "", "", "", "", "", `${totalKm} km`]], styles: { fontSize: 7.2, cellPadding: 4, overflow: "linebreak" }, columnStyles: { 0: { cellWidth: 58 }, 1: { cellWidth: 120 }, 2: { cellWidth: 215 }, 3: { cellWidth: 75 }, 4: { cellWidth: 145 }, 5: { cellWidth: 125 }, 6: { cellWidth: 58, halign: "right" } }, headStyles: { fillColor: [15, 15, 15] }, footStyles: { fillColor: [239, 229, 207], textColor: 15, fontStyle: "bold" } });
      const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 90;
      doc.setFontSize(8); doc.text("Zeitregel: bei Terminen ab 12 Uhr Abfahrt 10:00 Uhr, sonst 3 Stunden vor dem ersten Termin; Rückkehr ca. 4 Stunden nach dem letzten Termin.", 28, Math.min(finalY + 24, 560)); doc.save(`fahrtenbuch-${month}.pdf`);
    } catch (error) { alert(error instanceof Error ? error.message : "Das Fahrtenbuch konnte nicht erstellt werden."); }
    finally { setTravelLogPending(false); }
  }'''
text = text[:start] + replacement + text[end:]
path.write_text(text)
