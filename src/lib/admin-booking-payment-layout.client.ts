function parseMoney(value: string) {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function moneyInput(value: number) {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(".", ",");
}

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function findLabel(root: ParentNode, text: string) {
  return Array.from(root.querySelectorAll("label")).find(
    (label) => label.textContent?.replace(/\s+/g, " ").trim().includes(text),
  ) as HTMLLabelElement | undefined;
}

function installPaymentLayout() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!window.location.pathname.includes("/admin/buchung/")) return;

  const enhance = () => {
    const depositLabel = findLabel(document, "Anzahlung Betrag");
    const onsiteLabel = findLabel(document, "Vor Ort Betrag");
    const ruleLabel = findLabel(document, "Anzahlungsregel");
    if (!depositLabel || !onsiteLabel || !ruleLabel) return;

    const depositWrap = depositLabel.parentElement;
    const onsiteWrap = onsiteLabel.parentElement;
    const ruleWrap = ruleLabel.parentElement;
    const grid = ruleWrap?.parentElement;
    const depositInput = depositWrap?.querySelector<HTMLInputElement>("input");
    const onsiteInput = onsiteWrap?.querySelector<HTMLInputElement>("input");
    if (!depositWrap || !onsiteWrap || !grid || !depositInput || !onsiteInput) return;

    let panel = document.querySelector<HTMLElement>("[data-payment-split-panel]");
    if (!panel) {
      panel = document.createElement("div");
      panel.dataset.paymentSplitPanel = "true";
      panel.className = "mb-4 border border-champagne/35 bg-champagne/[0.05] p-4";
      panel.innerHTML = `
        <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <div class="text-[0.62rem] uppercase tracking-[0.22em] text-champagne">Beträge aufteilen</div>
            <div class="mt-1 text-[0.68rem] leading-relaxed text-vanilla/50">Standard: 150 € Anzahlung, Rest vor Ort. Bei spontanen Terminen und Ausnahmen kann die Anzahlung auf 0 € gesetzt werden; Kurzsessions übernehmen ihren eigenen kleineren Betrag.</div>
          </div>
          <div data-payment-summary class="text-right text-[0.68rem] text-vanilla/60"></div>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="sm:col-span-1">
            <label class="mb-1 block text-[0.6rem] uppercase tracking-[0.2em] text-champagne">Gesamtbetrag (€)</label>
            <input data-payment-total type="text" inputmode="decimal" placeholder="z. B. 600" class="input-luxe w-full border-champagne/50" />
          </div>
          <div>
            <label class="mb-1 block text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/55">Anzahlung (€)</label>
            <input data-payment-deposit type="text" inputmode="decimal" placeholder="150" class="input-luxe w-full" />
          </div>
          <div>
            <label class="mb-1 block text-[0.6rem] uppercase tracking-[0.2em] text-vanilla/55">Vor Ort (€)</label>
            <input data-payment-onsite type="text" inputmode="decimal" placeholder="0" class="input-luxe w-full" />
          </div>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button data-payment-standard type="button" class="border border-champagne/35 px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.15em] text-champagne hover:bg-champagne/10">150 € Anzahlung</button>
          <button data-payment-onsite-all type="button" class="border border-champagne/25 px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.15em] text-vanilla/65 hover:bg-vanilla/5">Alles vor Ort</button>
        </div>
      `;
      grid.parentElement?.insertBefore(panel, grid);

      const totalField = panel.querySelector<HTMLInputElement>("[data-payment-total]")!;
      const depositField = panel.querySelector<HTMLInputElement>("[data-payment-deposit]")!;
      const onsiteField = panel.querySelector<HTMLInputElement>("[data-payment-onsite]")!;
      const standardButton = panel.querySelector<HTMLButtonElement>("[data-payment-standard]")!;
      const onsiteAllButton = panel.querySelector<HTMLButtonElement>("[data-payment-onsite-all]")!;

      const applySplit = (deposit: number, onsite: number) => {
        setReactInputValue(depositInput, moneyInput(deposit));
        setReactInputValue(onsiteInput, moneyInput(onsite));
        depositField.value = moneyInput(deposit);
        onsiteField.value = moneyInput(onsite);
        totalField.value = moneyInput(deposit + onsite);
        refreshSummary();
      };

      const refreshSummary = () => {
        const deposit = parseMoney(depositField.value);
        const onsite = parseMoney(onsiteField.value);
        const summary = panel?.querySelector<HTMLElement>("[data-payment-summary]");
        if (summary) summary.textContent = `${moneyInput(deposit + onsite)} € gesamt · ${moneyInput(deposit)} € Anzahlung · ${moneyInput(onsite)} € vor Ort`;
      };

      totalField.addEventListener("input", () => {
        const total = parseMoney(totalField.value);
        if (depositInput.disabled) {
          applySplit(0, total);
          return;
        }
        const deposit = Math.min(150, total);
        applySplit(deposit, Math.max(0, total - deposit));
      });

      depositField.addEventListener("input", () => {
        const total = parseMoney(totalField.value);
        const deposit = Math.min(total, parseMoney(depositField.value));
        applySplit(deposit, Math.max(0, total - deposit));
      });

      onsiteField.addEventListener("input", () => {
        const total = parseMoney(totalField.value);
        const onsite = Math.min(total, parseMoney(onsiteField.value));
        applySplit(Math.max(0, total - onsite), onsite);
      });

      standardButton.addEventListener("click", () => {
        const total = parseMoney(totalField.value);
        const deposit = depositInput.disabled ? 0 : Math.min(150, total);
        applySplit(deposit, Math.max(0, total - deposit));
      });

      onsiteAllButton.addEventListener("click", () => {
        applySplit(0, parseMoney(totalField.value));
      });
    }

    // Die alten doppelten Betragsfelder bleiben technisch die React-Quelle,
    // werden aber visuell durch die klarere Gesamt/Anzahlung/Vor-Ort-Aufteilung ersetzt.
    depositWrap.style.display = "none";
    onsiteWrap.style.display = "none";

    const totalField = panel.querySelector<HTMLInputElement>("[data-payment-total]");
    const depositField = panel.querySelector<HTMLInputElement>("[data-payment-deposit]");
    const onsiteField = panel.querySelector<HTMLInputElement>("[data-payment-onsite]");
    const summary = panel.querySelector<HTMLElement>("[data-payment-summary]");
    if (!totalField || !depositField || !onsiteField || !summary) return;

    const active = document.activeElement;
    if (active !== totalField && active !== depositField && active !== onsiteField) {
      const deposit = parseMoney(depositInput.value);
      const onsite = parseMoney(onsiteInput.value);
      depositField.value = moneyInput(deposit);
      onsiteField.value = moneyInput(onsite);
      totalField.value = moneyInput(deposit + onsite);
      depositField.disabled = depositInput.disabled;
      summary.textContent = `${moneyInput(deposit + onsite)} € gesamt · ${moneyInput(deposit)} € Anzahlung · ${moneyInput(onsite)} € vor Ort`;
    }
  };

  enhance();
  const observer = new MutationObserver(enhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setInterval(enhance, 600);
}

if (typeof window !== "undefined") installPaymentLayout();
