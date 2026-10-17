/**
 * Strips leading emojis and whitespace from strings to avoid redundant icons
 * in notification center headers and mobile alerts.
 */
export function stripLeadingEmojis(text?: string | null): string {
  if (!text) return '';
  return text.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\u2700-\u27BF\s]+/u, '').trim();
}

export default stripLeadingEmojis;

