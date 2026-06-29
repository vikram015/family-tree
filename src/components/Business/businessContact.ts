// Best-effort extraction of a phone/mobile number from a person's "additional
// details" (custom fields), used to prefill a new business's contact number.
export function phoneFromCustomFields(
  customFields?: Record<string, string> | null,
): string {
  if (!customFields) return "";
  const match = Object.entries(customFields).find(([key, value]) => {
    if (!value || !String(value).trim()) return false;
    const k = key.toLowerCase();
    return (
      k.includes("phone") ||
      k.includes("mobile") ||
      k.includes("contact") ||
      k.includes("whatsapp")
    );
  });
  return match ? String(match[1]).trim() : "";
}
