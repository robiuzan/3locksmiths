/**
 * The topbar line's two contact tokens — shared by the pass that renders them
 * (scripts/live-surfaces.mjs) and the gate that measures them (scripts/check-campaigns.mjs), so
 * "how long is this line" is answered once.
 *
 *   {phone}             the call line, printed and dialled from site.config.json — a number typed
 *                       into a campaign is the bug CLAUDE.md §6 names, and the next NAP change
 *                       would miss it
 *   {whatsapp:<label>}  a link to the WhatsApp line showing <label>. The label is a word, never the
 *                       number: that line's display spelling is retired and scripts/phone.mjs fails
 *                       the build on it anywhere outside a wa.me URL (docs/business-facts.md §C.5)
 *
 * Pure: no clock, no network, no DOM.
 */

/**
 * Matches one token; group 1 = name, group 2 = label (whatsapp only). Use with a fresh lastIndex.
 * The braces are escaped IN THE REGEX ("\\{" in this string), inside the class too: a single "\{"
 * is a JS string escape that drops the backslash, leaving a lone "{" that only Annex-B parsing
 * accepts — the u flag rejects it, and the v flag rejects a bare brace in a class. Same matches
 * as the old pattern, checked on every token shape (review, 2026-10-12).
 */
export const TOKEN_SOURCE = "\\{(phone|whatsapp)(?::([^\\{\\}]+))?\\}";

/**
 * A topbar's text cut into literal and token pieces, in order.
 * @returns {({ text: string } | { token: "phone" } | { token: "whatsapp", label: string })[]}
 */
export function pieces(text) {
  const re = new RegExp(TOKEN_SOURCE, "g");
  const out = [];
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push(
      m[1] === "phone" ? { token: "phone" } : { token: "whatsapp", label: m[2] || "" },
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** The line as a visitor reads it: tokens replaced, the trailing link's label appended. */
export function visibleText(topbar, phoneDisplay) {
  const body = pieces(String(topbar.text ?? ""))
    .map((p) =>
      p.text !== undefined ? p.text : p.token === "phone" ? phoneDisplay : p.label,
    )
    .join("");
  return topbar.link?.label ? `${body} ${topbar.link.label}` : body;
}
