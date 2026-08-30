/**
 * Renders one snapshotted page: its JSON-LD structured data, the ported body markup
 * (header / nav / main / footer captured from the live HTML, with assets localized) and
 * the client-side script replay that reproduces the original interactivity.
 *
 * The body is injected with dangerouslySetInnerHTML so it is byte-faithful to the source
 * and React leaves it untouched for the original jQuery to enhance. The wrapper `<div>`
 * carries the source's `<body>` class list so descendant CSS selectors resolve identically.
 */
import type { SitePage } from "@/lib/content";
import ThemeScripts from "./ThemeScripts";

export default function SiteFrame({ page }: { page: SitePage }) {
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
