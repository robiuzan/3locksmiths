/**
 * Which pages the live surfaces treat differently — one module, imported by the pass that marks
 * the pages (scripts/live-surfaces.mjs) AND by the gate that checks the marks
 * (scripts/check-live-regions.mjs), so a regression in a rule cannot be hidden by the rule.
 *
 * CALM pages are read by someone in the middle of something: locked out, or pricing a job. A
 * seasonal tip there is a distraction and a link away from the call, so those pages get only the
 * evergreen line and the safety lines in the bar, and never a card.
 *   - the emergency cluster: synthetic ids 9301–9399 (no manifest kind is called "emergency";
 *     those pages are kind "service" — CLAUDE.md §7)
 *   - the calculator funnel: every route under /step/
 *
 * EMERGENCY-NUMBER pages tell the reader, in their own text, to call the police, Magen David
 * Adom or the fire service (100 / 101 / 102). A card about travel or batteries on top of that
 * sentence is the wrong thing at the wrong moment (docs/dynamic-presence-plan.md §3.2: "never on
 * any page whose answer block carries the 100/101 line"). Detected from the text, not listed by
 * id, so a new page that gains the sentence is covered without an edit here.
 *
 * Pure: takes the page record from content/site.json.
 */
import { withoutLiveRegions } from "./regions.mjs";

const safeDecode = (s) => {
  try {
    return decodeURI(s);
  } catch {
    return s;
  }
};

export function isCalm(page) {
  return (
    (page.id >= 9301 && page.id <= 9399) ||
    safeDecode(String(page.path ?? "")).startsWith("/step/")
  );
}

/** The page's own visible text, with the live regions (the bar lists 100/101 everywhere) cut. */
function ownText(html) {
  return withoutLiveRegions(String(html ?? ""))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ");
}

/**
 * A standalone 100, 101 or 102 — optionally after a Hebrew prefix letter and hyphen ("ל-100",
 * "ב-101") — that is not part of a longer number, a date or a percentage, and is not a price
 * (₪ / שקל / ש״ח right after it). Two of them close together, or "100/101", is the sentence.
 * The detection errs toward catching: a false positive only withholds a card from a page.
 */
const N = String.raw`(?<![\d.,])(?:[לבו]-?)?(?:100|101|102)(?![\d.,%]*\d)(?!\s*(?:₪|ש[״"']?ח|שקל))`;
const PAIR = new RegExp(String.raw`${N}(?:\s*/\s*|.{1,60}?)${N}`);
const POLICE = /משטרה.{0,50}?(?<!\d)100(?!\d)|(?<!\d)100(?!\d).{0,50}?משטרה/;

export function hasEmergencyNumbers(page) {
  const t = ownText(page.bodyHtml);
  return PAIR.test(t) || POLICE.test(t);
}

/** The legal pages: a seasonal tip opening by itself on the accessibility statement is wrong. */
const LEGAL = new Set(["/accessibility-statement/", "/privacy-policy/"]);

/** May a seasonal card ever open on this page? */
export function allowsDialog(page) {
  return (
    !isCalm(page) &&
    !LEGAL.has(safeDecode(String(page.path ?? ""))) &&
    !hasEmergencyNumbers(page)
  );
}
