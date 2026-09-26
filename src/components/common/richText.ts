/**
 * Helpers shared by the rich-text editor and its renderer.
 *
 * Descriptions are stored as HTML. Every value written before the editor
 * existed is plain text, and both forms have to keep working forever — nobody
 * is migrating a `description` column, and a plain-text value typed today (by
 * an older client, or the API directly) must still render correctly.
 */

/** True when the value looks like HTML the editor produced. */
export function isHtml(value?: string | null): boolean {
  return Boolean(value && /<\/?[a-z][\s\S]*>/i.test(value));
}

/** TipTap renders an empty document as `<p></p>`; treat that as no content. */
export function normalizeRichText(html: string): string {
  const stripped = html
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/<br\s*\/?>/gi, "")
    .trim();
  return stripped === "" ? "" : html;
}

/** Is there anything to show? Works for both plain text and HTML values. */
export function hasRichTextContent(value?: string | null): boolean {
  if (!value) return false;
  if (!isHtml(value)) return value.trim().length > 0;
  return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim().length > 0;
}

/** Plain-text version, for meta descriptions, card previews and snippets. */
export function richTextToPlain(value?: string | null): string {
  if (!value) return "";
  if (!isHtml(value)) return value;
  return value
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}
