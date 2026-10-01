/**
 * Builds the inline <head> script that picks the live variant BEFORE first paint.
 *
 * Why inline, in <head>, and not a client component: Next 16's own guide prescribes exactly this
 * for UI that depends on the visitor's clock (node_modules/next/dist/docs/01-app/02-guides/
 * preventing-flash-before-hydration.md) — it runs synchronously while the HTML parses, so the
 * right line is there at first paint. A "use client" island would run only after hydration,
 * which on a phone here lands behind several seconds of script replay, and ThemeScripts stays
 * the only client component on the site (CLAUDE.md §9).
 *
 * What it does, and all it does:
 *   1. finds the interval that contains "now" in a list compiled at build time
 *      (lib/live/compile.mjs — the calendar, quiet days and priorities are already resolved);
 *   2. sets <html data-live="<variant>"> — app/enrich.css keys the header height and the
 *      evergreen line off that attribute;
 *   3. writes two CSS rules: reveal the matching pre-rendered line, and hide the evergreen line
 *      that FOLLOWS it (a sibling selector — so on a page that does not carry the variant, such
 *      as an emergency page during a seasonal window, nothing matches and evergreen stays).
 *      The reveal is `!important` because the vendored bootstrap-grid.css ships
 *      `[hidden]{display:none!important}` and every seasonal line carries `hidden` — the
 *      attribute that keeps them out of sight when a stylesheet fails to load;
 *   4. re-runs on `pageshow`, when the tab becomes visible again, AND at the next boundary
 *      (one timer, re-armed on every run; none under `?at=` and none after the last interval),
 *      so a page left open across a sundown — a visible desktop tab included — catches up. If the line changed on such a re-run it fires `resize`:
 *      the theme's nav.js measured the header once, at load, and only re-measures on resize —
 *      without the nudge a bar that opens on a phone would cover the top 34px of the page.
 * It carries NO copy. Every visible word is already in the page, rendered by
 * scripts/live-surfaces.mjs into content/site.json where the claims guards can read it.
 * With JavaScript off, or on any error, nothing is set and the evergreen line shows.
 *
 * `?at=<ISO instant>` overrides the clock for review, e.g. ?at=2026-12-06T10:00:00%2B02:00.
 * Nothing links to it, so nothing indexes it.
 *
 * The interval list is packed — minutes since the first interval, base 36 — because this string
 * ships in every page's <head> and again in the RSC payload:
 *   S = "v,gap,dur;v,gap,dur;…"   v = index into V, gap = minutes since the previous end
 */

const MIN = 60_000;

/** @param {{variant: string, from: number, until: number}[]} intervals  epoch ms, sorted */
export function packSchedule(intervals) {
  const variants = [];
  const parts = [];
  if (!intervals.length) return { variants, base: 0, packed: "" };
  const base = intervals[0].from / MIN;
  let cursor = base;
  for (const iv of intervals) {
    const from = iv.from / MIN;
    const until = iv.until / MIN;
    if (
      !Number.isInteger(from) ||
      !Number.isInteger(until) ||
      from < cursor ||
      until <= from
    ) {
      throw new Error(
        `head-script: interval ${JSON.stringify(iv)} is not minute-aligned and sorted`,
      );
    }
    if (!/^[a-z0-9-]+$/.test(iv.variant)) {
      throw new Error(
        `head-script: variant id ${JSON.stringify(iv.variant)} must match [a-z0-9-]+`,
      );
    }
    let v = variants.indexOf(iv.variant);
    if (v === -1) v = variants.push(iv.variant) - 1;
    parts.push(
      [v.toString(36), (from - cursor).toString(36), (until - from).toString(36)].join(
        ",",
      ),
    );
    cursor = until;
  }
  return { variants, base, packed: parts.join(";") };
}

/** The reverse of packSchedule — used by the tests, never shipped. */
export function unpackSchedule({ variants, base, packed }) {
  const out = [];
  let cursor = base;
  for (const part of packed ? packed.split(";") : []) {
    const f = part.split(",");
    const from = cursor + parseInt(f[1], 36);
    const until = from + parseInt(f[2], 36);
    out.push({
      variant: variants[parseInt(f[0], 36)],
      from: from * MIN,
      until: until * MIN,
    });
    cursor = until;
  }
  return out;
}

/**
 * The script text. Deliberately ES5: it runs before anything else on whatever WebView opened
 * the link, and a syntax error here would cost the visitor nothing but the seasonal line.
 */
export function liveHeadScript(intervals) {
  const { variants, base, packed } = packSchedule(intervals);
  return (
    "(function(){try{" +
    `var V=${JSON.stringify(variants)},B=${base},S=${JSON.stringify(packed)},` +
    "d=document,h=d.documentElement,q=/[?&]at=([^&#]+)/.exec(location.search),s,o,t;" +
    'function r(){var n=NaN,c=B,p=S?S.split(";"):[],i,f,a,e,v="evergreen",x=0;' +
    "if(q)try{n=Date.parse(decodeURIComponent(q[1]))}catch(x){}" +
    "if(isNaN(n))n=Date.now();n/=6e4;" +
    'for(i=0;i<p.length;i++){f=p[i].split(",");a=c+parseInt(f[1],36);e=a+parseInt(f[2],36);' +
    "if(n<a){x=a;break}if(n<e){v=V[parseInt(f[0],36)];x=e;break}c=e}" +
    'h.setAttribute("data-live",v);' +
    'if(!s){s=d.createElement("style");d.head.appendChild(s)}' +
    'if(v==="evergreen")s.textContent="";else{i=\'.live-topbar__item[data-campaign="\'+v+\'"]\';' +
    's.textContent=i+"{display:flex!important}"+i+\'~[data-campaign="evergreen"]{display:none}\'}' +
    'if(o&&o!==v)try{dispatchEvent(new Event("resize"))}catch(y){}o=v;' +
    "clearTimeout(t);if(x&&!q)t=setTimeout(r,Math.min((x-n)*6e4+1e3,2147483647))}" +
    'r();addEventListener("pageshow",r);' +
    'd.addEventListener("visibilitychange",function(){d.hidden||r()})' +
    "}catch(x){}})();"
  );
}
