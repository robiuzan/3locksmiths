/**
 * Renders one snapshotted page: its JSON-LD structured data, the ported body markup
 * (header / nav / main / footer captured from the live HTML, with assets localized) and
 * the client-side script replay that reproduces the original interactivity.
 *
 * The body is injected with dangerouslySetInnerHTML so it is byte-faithful to the source
 * and React leaves it untouched for the original jQuery to enhance. The wrapper `<div>`
 * carries the source's `<body>` class list so descendant CSS selectors resolve identically.
 */
import { preload } from "react-dom";
import { getBandPreloads, type SitePage } from "@/lib/content";
import ThemeScripts from "./ThemeScripts";

/**
 * Preloads the hero band — the CSS background that is this page's LCP element.
 *
 * A background image is discovered only once main.css has downloaded and parsed, which on a
 * throttled phone was 1.9 s after the HTML arrived, and it is then requested at Low priority
 * (docs/optimization-backlog.md §10.8). A preload in the document moves discovery to the first
 * bytes of the response. The URLs and the media query come from scripts/assets.mjs, which reads
 * them back out of the stylesheet it generates: a preload that does not match the CSS request
 * exactly fetches the image twice.
 *
 * react-dom's preload(), not a <link> in the JSX, for the reason app/layout.tsx records for its
 * preconnects: React orders its own resource hints ahead of the hoisted stylesheets, while a
 * raw <link> lands wherever it happens to render.
 *
 * `fetchPriority: "high"` IS THE FIX, not decoration — measured three ways on 2026-09-30, five
 * alternating throttled-mobile runs each (production / high / no priority), homepage:
 *
 *                    request starts   request done   LCP        FCP
 *   no preload           1,142 ms       1,815 ms    1,848 ms   1,404 ms
 *   preload, high          210 ms         881 ms    1,468 ms   1,468 ms
 *   preload, default       219 ms       1,776 ms    1,808 ms   1,416 ms
 *
 * Without the priority the request is discovered just as early and then starved by the
 * render-blocking CSS on a slow link, finishing no sooner than it does today. React also only
 * places a HIGH-priority image preload ahead of the stylesheets (byte 271 of <head>); the
 * default-priority one lands at byte ~12,700, after them. The cost is 20–65 ms of first paint,
 * and that first paint is now a complete one: before, the white headline was painted on a white
 * page until the band arrived.
 */
function preloadBand(page: SitePage) {
  for (const p of getBandPreloads(page)) {
    preload(p.href, { as: "image", type: p.type, media: p.media, fetchPriority: "high" });
  }
}

export default function SiteFrame({ page }: { page: SitePage }) {
  preloadBand(page);
  return (
    <>
      {page.jsonLd.map((json, i) => (
        <script
          key={`ld-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: json }}
        />
      ))}
      <div
        className={page.bodyClass}
        dangerouslySetInnerHTML={{ __html: page.bodyHtml }}
      />
      <ThemeScripts scripts={page.scripts} />
    </>
  );
}
