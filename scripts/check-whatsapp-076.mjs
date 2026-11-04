/**
 * WhatsApp must never be steered to the 076 line — it is not WhatsApp-capable, and whether it
 * receives SMS is still 🔶 (docs/business-facts.md §C.5, §C.6). WhatsApp is +972556601006, reached
 * through the WhatsApp button or a wa.me link.
 *
 * The regex rule `whatsapp-on-076` in check-claims.mjs matches the wordings fixed on 2026-11-04
 * ("וואטסאפ לאותו מספר", "076 מקבל גם בוואטסאפ"…). The live audit of 2026-11-04 found two shapes it
 * cannot see, because it tests the page as one flattened string:
 *
 *   - "שלחו הודעה למספר 076-599-1266" under the question "אפשר לקבל הצעת מחיר בוואטסאפ?" (/מחירון/)
 *   - "חייגו 076-599-1266 או שלחו הודעת וואטסאפ" with no pointer to where WhatsApp goes (4 pages)
 *
 * This check reads one text block at a time instead (a paragraph, list item, table cell, heading
 * or a whole FAQ item, question and answer together), so the sticky bar — a call link and a
 * WhatsApp link side by side, in no text block — cannot trip it:
 *
 *   1. a block that tells readers to send a message to the 076 number fails, always;
 *   2. a block that names the 076 number and WhatsApp fails unless it points to the WhatsApp
 *      button ("כפתור") or carries its own wa.me / api.whatsapp link.
 *
 * Named check-* so check-freshness does not count it as a source of content/site.json; imported by
 * check-claims.mjs, which runs it in prebuild and CI.
 */
import { parse } from "node-html-parser";

const BLOCKS =
  "p, li, td, th, dd, dt, h1, h2, h3, h4, h5, h6, blockquote, figcaption, .acc-item";

/** The business line in any spelling the site uses. */
const PHONE_076 = /0?76[-\s‑]?599[-\s‑]?1266|\+?972[-\s]?76[-\s]?599[-\s]?1266/;
const WHATSAPP = /וואטסאפ|ווטסאפ|ואטסאפ|WhatsApp/i;
const POINTER = /כפתור/;
/** "שלחו הודעה למספר 076…", "הודעה ל-076…", "מסרון אל המספר 076…". */
const MESSAGE_TO_076 =
  /(?:הודע[הת]|הודעות|מסרון|מסרונים|SMS|הודעת טקסט)\s+(?:ל-?|אל\s+)(?:ה?מספר\s*)?(?:0?76|\+?972[-\s]?76)/;

const hasWhatsAppLink = (el) =>
  el
    .querySelectorAll("a")
    .some((a) =>
      /wa\.me\/|api\.whatsapp\.com|^whatsapp:/i.test(a.getAttribute("href") ?? ""),
    );

const squash = (s) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Every text block in `html` that breaks the rule, innermost first, deduplicated by text.
 * @param {string} html
 * @returns {{ rule: "message-to-076" | "whatsapp-beside-076", text: string }[]}
 */
export function whatsapp076Problems(html) {
  const root = parse(String(html ?? ""), {
    blockTextElements: { script: false, style: false, noscript: false, pre: true },
  });
  const seen = new Set();
  const out = [];
  for (const el of root.querySelectorAll(BLOCKS)) {
    const text = squash(el.text);
    if (!text || seen.has(text)) continue;
    let rule = null;
    if (MESSAGE_TO_076.test(text)) rule = "message-to-076";
    else if (
      PHONE_076.test(text) &&
      WHATSAPP.test(text) &&
      !POINTER.test(text) &&
      !hasWhatsAppLink(el)
    )
      rule = "whatsapp-beside-076";
    if (!rule) continue;
    seen.add(text);
    out.push({ rule, text });
  }
  return out;
}

/**
 * The same two tests on a plain string — the page title and meta description, which carry no
 * markup and no button.
 * @param {string} text
 */
export function whatsapp076TextProblem(text) {
  const t = squash(text);
  if (MESSAGE_TO_076.test(t)) return "message-to-076";
  if (PHONE_076.test(t) && WHATSAPP.test(t) && !POINTER.test(t))
    return "whatsapp-beside-076";
  return null;
}
