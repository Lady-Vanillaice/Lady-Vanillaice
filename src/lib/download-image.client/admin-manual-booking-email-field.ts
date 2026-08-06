function parseStoredContact(value: string) {
  const emailMatch = value.match(/(?:^|\n)E-Mail:\s*([^\s]+@[^\s]+)$/im);
  const contactMatch = value.match(/(?:^|\n)(?:Kontakt|WhatsApp\/Telefon):\s*(.+)$/im);

  if (emailMatch || contactMatch) {
    return {
      contact: contactMatch?.[1]?.trim() ?? "",
      email: emailMatch?.[1]?.trim() ?? "",
    };
  }

  const trimmed = value.trim();
  const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed);
  return {
    contact: isEmail ? "" : trimmed,
    email: isEmail ? trimmed : "",
  };
}

function enhanceManualBookingForm() {
  const buttons = Array.from(document.querySelectorAll("button"));
  const submitButton = buttons.find((button) =>
    button.textContent?.includes("Externen Termin eintragen"),
  );
  const form = submitButton?.closest("form");
  if (!form || form.dataset.separateContactEmail === "true") return;

  const labels = Array.from(form.querySelectorAll("label"));
  const contactLabel = labels.find((label) =>
    label.textContent?.trim().startsWith("Kontakt"),
  );
  const wrapper = contactLabel?.parentElement;
  const originalInput = wrapper?.querySelector<HTMLInputElement>("input");
  if (!contactLabel || !wrapper || !originalInput) return;

  const initial = parseStoredContact(originalInput.value);

  contactLabel.style.display = "none";
  originalInput.type = "hidden";
  originalInput.required = false;
  originalInput.setAttribute("aria-hidden", "true");

  const grid = document.createElement("div");
  grid.className = "grid gap-3 sm:grid-cols-2";

  const makeField = (labelText: string, type: string, placeholder: string) => {
    const field = document.createElement("div");
    const label = document.createElement("label");
    label.className = "eyebrow block mb-1";
    label.textContent = labelText;
    const input = document.createElement("input");
    input.type = type;
    input.className = "input-luxe !py-2";
    input.placeholder = placeholder;
    input.required = false;
    field.append(label, input);
    return { field, input };
  };

  const contactField = makeField(
    "WhatsApp / Telefon / Telegram (optional)",
    "text",
    "+49 … oder @telegram-handle",
  );
  contactField.input.autocomplete = "tel";
  contactField.input.value = initial.contact;

  const emailField = makeField(
    "E-Mail-Adresse (optional)",
    "email",
    "kunde@example.de",
  );
  emailField.input.autocomplete = "email";
  emailField.input.value = initial.email;

  const syncToReact = () => {
    const contact = contactField.input.value.trim();
    const email = emailField.input.value.trim();
    originalInput.value = [
      contact ? `WhatsApp/Telefon: ${contact}` : "",
      email ? `E-Mail: ${email}` : "",
    ].filter(Boolean).join("\n");
    originalInput.dispatchEvent(new Event("input", { bubbles: true }));
    originalInput.dispatchEvent(new Event("change", { bubbles: true }));
  };

  contactField.input.addEventListener("input", syncToReact);
  emailField.input.addEventListener("input", syncToReact);
  grid.append(contactField.field, emailField.field);

  const hint = document.createElement("p");
  hint.className = "mt-1 text-[0.65rem] text-vanilla/45 sm:col-span-2";
  hint.textContent =
    "Beide Angaben sind optional. Die E-Mail wird nur gespeichert; beim Eintragen wird keine automatische Bestätigung verschickt.";
  grid.appendChild(hint);
  wrapper.appendChild(grid);

  syncToReact();
  form.dataset.separateContactEmail = "true";
}

export function installAdminManualBookingEmailField() {
  if (typeof document === "undefined") return;
  enhanceManualBookingForm();
  const observer = new MutationObserver(enhanceManualBookingForm);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
