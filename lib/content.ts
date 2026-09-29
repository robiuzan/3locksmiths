/**
 * Reads the live-HTML snapshot (`content/site.json`, produced by scripts/scrape.mjs) and
 * exposes typed accessors + a WordPress→Next.js metadata mapper. This is the source of
 * truth for the rendered pages (the REST API exposes no page content — see lib/wp.ts).
 */
import type { Metadata } from "next";
import he from "he";
import rawSite from "@/content/site.json";

export interface SeoData {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  ogUrl?: string;
  ogImage?: string;
  ogSiteName?: string;
  ogLocale?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterImage?: string;
}

export type ScriptItem =
  | { kind: "src"; url: string; type?: string }
  | { kind: "inline"; code: string; type?: string };

export type HeadLink = Record<string, string>;

export interface SitePage {
  id: number;
  title: string;
  slug: string;
  path: string;
  segments: string[];
  isFront: boolean;
  bodyClass: string;
  seo: SeoData;
  jsonLd: string[];
  scripts: ScriptItem[];
  bodyHtml: string;
}

export interface SiteData {
  wpUrl: string;
  assets: { headLinks: HeadLink[]; headStyles: string[] };
  pages: SitePage[];
}

const site = rawSite as unknown as SiteData;

export function getSite(): SiteData {
  return site;
}

export function getFrontPage(): SitePage {
  const front = site.pages.find((p) => p.isFront);
  if (!front) throw new Error("No front page found in content/site.json");
  return front;
}

/** All non-front pages (rendered by the [...slug] catch-all route). */
export function getContentPages(): SitePage[] {
  return site.pages.filter((p) => !p.isFront);
}

function decodeSeg(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * The /step/ pages are screens inside the price-calculator flow, not landing pages: left out of
 * the sitemap (app/sitemap.ts) and served noindex,follow (app/[...slug]/page.tsx). One predicate
 * so the two can never drift apart.
 */
export function isFunnelStep(path: string): boolean {
  return path.startsWith("/step/");
}

/** Match a route's decoded slug segments against a snapshot page. */
export function getPageBySegments(segments: string[]): SitePage | undefined {
  const key = segments.map(decodeSeg).join("/");
  return site.pages.find(
    (p) => !p.isFront && p.segments.map(decodeSeg).join("/") === key,
  );
}

/** Map captured WordPress/RankMath SEO fields to a Next.js Metadata object (1:1). */
export function buildMetadata(seo: SeoData): Metadata {
  const dec = (s?: string): string | undefined => (s ? he.decode(s) : undefined);
  const md: Metadata = {};

  const title = dec(seo.title);
  if (title) md.title = { absolute: title };

  const description = dec(seo.description);
  if (description) md.description = description;

  if (seo.canonical) md.alternates = { canonical: seo.canonical };
  // Production: make the live site indexable. The source WordPress is set to
  // `noindex, nofollow` (captured in seo.robots); per the site owner we override that so
  // Google can index the migrated site. (Was: `if (seo.robots) md.robots = seo.robots`.)
  md.robots = { index: true, follow: true };

  const og: Record<string, unknown> = {};
  const ogTitle = dec(seo.ogTitle);
  const ogDescription = dec(seo.ogDescription);
  if (ogTitle) og.title = ogTitle;
  if (ogDescription) og.description = ogDescription;
  if (seo.ogType) og.type = seo.ogType;
  if (seo.ogUrl) og.url = seo.ogUrl;
  if (seo.ogSiteName) og.siteName = dec(seo.ogSiteName);
  if (seo.ogLocale) og.locale = seo.ogLocale;
  if (seo.ogImage) og.images = [seo.ogImage];
  if (Object.keys(og).length > 0) md.openGraph = og as Metadata["openGraph"];

  const tw: Record<string, unknown> = {};
  if (seo.twitterCard) tw.card = seo.twitterCard;
  if (dec(seo.twitterTitle)) tw.title = dec(seo.twitterTitle);
  if (seo.twitterImage) tw.images = [seo.twitterImage];
  if (Object.keys(tw).length > 0) md.twitter = tw as Metadata["twitter"];

  return md;
}
