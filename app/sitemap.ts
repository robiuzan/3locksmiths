import type { MetadataRoute } from "next";
import { getSite } from "@/lib/content";
import rawLastmod from "@/content/lastmod.json";

export const dynamic = "force-static";

/**
 * `content/lastmod.json` — path -> the date that path's rendered bytes last changed.
 * Maintained by `scripts/lastmod.mjs`, which runs last in the enrich chain. Read that
 * file's header before changing anything here: the dates are derived from a content
 * hash precisely so they do NOT move on every build.
 */
const lastmod = rawLastmod as unknown as Record<
  string,
  { hash: string; lastmod: string }
>;

// Static /sitemap.xml listing every real page by its canonical URL. Excludes the
// calculator `step` pages, which are fragments of the price-calculator flow rather than
// landing pages. (The WordPress demo posts are dropped from the snapshot itself — see
// SKIP_SLUGS in scripts/scrape.mjs.)
//
// `lastModified` is the one field here Google actually uses. `changeFrequency` and
// `priority` are ignored by Google Search and are kept only because they are already
// live — do not spend effort tuning them.
export default function sitemap(): MetadataRoute.Sitemap {
  const { pages } = getSite();
  const excluded = (path: string) => path.startsWith("/step/");

  return pages
    .filter((p) => p.seo?.canonical && !excluded(p.path))
    .map((p) => {
      const isContent =
        p.path.startsWith("/services/") || p.path.startsWith("/locations/");
      // Omitted rather than faked when the ledger has no entry for a path: an invented
      // date is worse than no date, because Google learns to distrust the field.
      const entry = lastmod[p.path];
      return {
        url: p.seo.canonical as string,
        ...(entry ? { lastModified: entry.lastmod } : {}),
        changeFrequency: (p.isFront ? "weekly" : "monthly") as "weekly" | "monthly",
        priority: p.isFront ? 1 : isContent ? 0.8 : 0.6,
      };
    });
}
