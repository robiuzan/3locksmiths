/**
 * Cuts the live regions out of a page body — the elements marked `data-lm-ignore`.
 *
 * scripts/lastmod.mjs hashes what this returns, so rewording an announcement-bar line (every
 * line is on every page) does not move the `<lastmod>` of ~109 URLs at once. `<lastmod>` is for
 * the page's own content; rotating chrome is not that (docs/dynamic-presence-plan.md §2.2 rule 3).
 *
 * Cut from the RAW string using the parser's source offsets, never re-serialised: the hash must
 * stay a function of the bytes that ship, not of how a parser version chooses to print them.
 * An element marker, not an HTML comment, because eight passes in the enrich chain re-parse the
 * body with node-html-parser's defaults — which drop comments.
 *
 * A region inside another region is cut once, with its parent: nested ranges are skipped, so
 * offsets never go stale.
 *
 * It lives here rather than inside lastmod.mjs so scripts/check-schedule.mjs can test it on a
 * fixture — the property "a reworded line leaves the hash alone, an edit outside it does not" is
 * what keeps the sitemap honest, and it was only ever checked by hand.
 */
import { parse } from "node-html-parser";

export function withoutLiveRegions(html) {
  if (!html.includes("data-lm-ignore")) return html;
  const root = parse(html, {
    blockTextElements: { script: true, style: true, noscript: true, pre: true },
  });
  const ranges = root
    .querySelectorAll("[data-lm-ignore]")
    .map((el) => el.range)
    .sort((a, b) => a[0] - b[0]);
  // Keep only the outermost ranges, then cut back to front so earlier offsets stay valid.
  const outer = [];
  for (const r of ranges) {
    const last = outer[outer.length - 1];
    if (!last || r[0] >= last[1]) outer.push(r);
  }
  let out = html;
  for (const [start, end] of outer.reverse()) out = out.slice(0, start) + out.slice(end);
  return out;
}
