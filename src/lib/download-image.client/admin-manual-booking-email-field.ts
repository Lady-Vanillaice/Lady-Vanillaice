function enhanceManualBookingForm() {
  const buttons = Array.from(document.querySelectorAll("button"));
  const submitButton = buttons.find((button) =>
    button.textContent?.includes("Externen Termin eintragen"),
  );
  const form = submitButton?.closest("form");
  if (!form || form.dataset.emailFieldEnhanced === "true") return;

  const labels = Array.from(form.querySelectorAll("label"));
  const contactLabel = labels.find((label) =>
    label.textContent?.trim().startsWith("Kontakt"),
  );
  const wrapper = contactLabel?.parentElement;
  const input = wrapper?.querySelector("input");
  if (!contactLabel || !wrapper || !input) return;

  contactLabel.textContent = "E-Mail-Adresse";
  input.type = "email";
  input.required = true;
  input.autocomplete = "email";
  input.placeholder = "kunde@example.de";
  input.setAttribute("aria-label", "E-Mail-Adresse des Kunden");

  const hint = document.createElement("p");
  hint.className = "mt-1 text-[0.65rem] text-vanilla/45";
  hint.textContent =
    "Wird nur beim Termin gespeichert. Es wird keine automatische Bestätigung verschickt.";
  wrapper.appendChild(hint);

  form.dataset.emailFieldEnhanced = "true";
}

export function installAdminManualBookingEmailField() {
  if (typeof document === "undefined") return;
  enhanceManualBookingForm();
  const observer = new MutationObserver(enhanceManualBookingForm);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
