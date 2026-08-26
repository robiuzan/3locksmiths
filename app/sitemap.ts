import type { MetadataRoute } from "next";
import { getSite } from "@/lib/content";

export const dynamic = "force-static";

// Static /sitemap.xml listing every real page by its canonical URL. Excludes the
// calculator `step` pages, which are fragments of the price-calculator flow rather than
// landing pages. (The WordPress demo posts are dropped from the snapshot itself — see
// SKIP_SLUGS in scripts/scrape.mjs.)
export default function sitemap(): MetadataRoute.Sitemap {
  const { pages } = getSite();
  const excluded = (path: string) => path.startsWith("/step/");

  return pages
    .filter((p) => p.seo?.canonical && !excluded(p.path))
    .map((p) => {
      const isContent =
        p.path.startsWith("/services/") || p.path.startsWith("/locations/");
      return {
        url: p.seo.canonical as string,
        changeFrequency: (p.isFront ? "weekly" : "monthly") as "weekly" | "monthly",
        priority: p.isFront ? 1 : isContent ? 0.8 : 0.6,
      };
    });
}
