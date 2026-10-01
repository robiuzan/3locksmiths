/**
 * Which pages are CALM — read by someone in the middle of something: locked out, or pricing a
 * job. A seasonal tip there is a distraction and a link away from the call, so those pages get
 * only the evergreen line and the safety lines (scripts/live-surfaces.mjs), and the Phase 2
 * dialog must never open on them (docs/dynamic-presence-plan.md §3.2).
 *
 * One function, imported by the pass that marks the pages AND by the gate that checks the marks
 * (scripts/check-live-regions.mjs), so a regression in the rule cannot be hidden by the rule.
 *
 *   - the emergency cluster: synthetic ids 9301–9399 (no manifest kind is called "emergency";
 *     those pages are kind "service" — CLAUDE.md §7)
 *   - the calculator funnel: every route under /step/
 *
 * Pure: takes the page record from content/site.json.
 */
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
