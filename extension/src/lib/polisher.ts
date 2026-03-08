/**
 * MailMood Polish (Local Rewrite Engine)
 * Rule-based "professionalizer" that improves tone without AI.
 * Runs fully offline.
 */

export function polishText(text: string): string {
  if (!text) return "";

  let t = text;

  // normalize aggressive punctuation
  t = t.replace(/!!+/g, ".");
  t = t.replace(/\?{2,}/g, "?");

  // soften urgency
  t = t.replace(/\bASAP\b/gi, "at your earliest convenience");
  t = t.replace(/\bIMMEDIATELY\b/gi, "as soon as possible");

  // soften demands
  t = t.replace(/\bI need\b/gi, "Could you please");
  t = t.replace(/\bI want\b/gi, "I would appreciate");

  // remove excessive caps (simple heuristic)
  if (t === t.toUpperCase() && t.length > 8) {
    t = t.charAt(0) + t.slice(1).toLowerCase();
  }

  // normalize spacing
  t = t.replace(/\s+/g, " ").trim();

  return t;
}