const OPEN = "[[CRM_SONDERREGELUNGEN]]";
const CLOSE = "[[/CRM_SONDERREGELUNGEN]]";

export function splitCustomerAdminNote(value: string | null | undefined) {
  const source = value ?? "";
  const start = source.indexOf(OPEN);
  const end = start < 0 ? -1 : source.indexOf(CLOSE, start + OPEN.length);
  if (start < 0 || end < 0) return { adminNote: source.trim(), specialRules: "" };

  const before = source.slice(0, start).trim();
  const after = source.slice(end + CLOSE.length).trim();
  const specialRules = source.slice(start + OPEN.length, end).trim();
  return { adminNote: [before, after].filter(Boolean).join("\\n\\n"), specialRules };
}

export function combineCustomerAdminNote(adminNote: string | null | undefined, specialRules: string | null | undefined) {
  const cleanNote = splitCustomerAdminNote(adminNote).adminNote;
  const rules = specialRules?.trim() ?? "";
  if (!rules) return cleanNote || null;
  return [cleanNote, `${OPEN}\\n${rules}\\n${CLOSE}`].filter(Boolean).join("\\n\\n");
}
