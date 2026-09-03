import type { Metadata } from "next";
import "./globals.css";
import "./enrich.css";
import SiteAssets from "@/components/SiteAssets";
import StickyCta from "@/components/StickyCta";
import { getSite } from "@/lib/content";
import { type SiteManifest } from "@ishub/site-kit";
import { gtmHeadSnippet, gtmNoScriptSrc } from "@ishub/site-kit/analytics";
import siteManifest from "@/site.config.json";

const site = getSite();

/** Normalized per-site manifest (single source of truth for NAP/identity/analytics). */
const manifest = siteManifest as unknown as SiteManifest;

/** Shared GTM loader — inert (renders nothing) until analytics.gtmId is set in the manifest. */
const gtmHead = gtmHeadSnippet(manifest.analytics?.gtmId);
const gtmNoScript = gtmNoScriptSrc(manifest.analytics?.gtmId);

/** CDN host for manifest-managed media (the OG card today). Drives the <head> preconnect. */
const mediaHost = manifest.images?.mediaHost;

// Site icons. These were derived from `site.assets.headLinks` until 2026-09-03, which pointed
// them at `/wp-content/themes/gogo/img/icons/{favicon.ico,touch.png}` — two files that are not
// images at all but 391 KB HTML copies of the old WordPress homepage, saved under the icons'
// names by the scraper (docs/business-facts.md §C.5a). So the site declared a favicon that
// served HTML, on every route, since the migration.
//
// The set below is generated from the brand mark by the site-icons step of `scripts/assets.mjs`
// and declared here rather than read back out of the scrape: the site's identity must not be a
// function of what
// the old WordPress origin happened to answer with. `/favicon.ico` also sits at the document
// root, because browsers and crawlers request that path whether or not a <link> names it.
//
// ⚠️ Do NOT add `app/favicon.ico` or `app/icon.png` on top of this. Next 16 resolves the file
// convention against this config, not alongside it: `resolve-metadata.js` unshifts an
// `app/favicon.ico` onto `icons.icon` unconditionally, so the page would emit TWO rel="icon"
// tags — while `app/icon.*` is dropped entirely whenever config icons exist, so it would look
// like it silently did nothing. `public/` is never scanned by that convention, which is why
// `public/favicon.ico` and this config coexist without duplicating.

// Base metadata shared by every route. Per-page title/description/canonical/robots are
// supplied by each route's generateMetadata() and merged over this by Next.js.
// Search Console verification comes from the manifest (roster → site.config.json), never a
// hardcoded literal (backlog §13.5) — null in the manifest means no tag is emitted.
export const metadata: Metadata = {
  metadataBase: new URL(site.wpUrl),
  icons: {
    // One rel="icon" is deliberate. The .ico carries 16/32/48 as separate PNG payloads and
    // every browser picks the right one from inside it, so a standalone icon-32/icon-48 link
    // would repeat bytes the .ico already ships. See the site-icons step in scripts/assets.mjs.
    icon: [{ url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" }],
    apple: [
      { url: "/assets/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  ...(manifest.analytics?.googleSiteVerification
    ? { verification: { google: manifest.analytics.googleSiteVerification } }
    : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Hebrew / RTL document root — matches the WordPress source exactly.
  return (
    <html lang="he" dir="rtl">
      <head>
        {/* Media host from the manifest (images.mediaHost) — serves the OG card today, and is
            the host the site-kit image pipeline would use if adopted (backlog §10.4). The
            fleet output gate in ops/deploy-site.ps1 requires this preconnect whenever
            mediaHost is set, and refuses to ship without it. */}
        {mediaHost && (
          <>
            <link rel="preconnect" href={`https://${mediaHost}`} crossOrigin="" />
            <link rel="dns-prefetch" href={`https://${mediaHost}`} />
          </>
        )}
        {/* GTM belongs in <head> (backlog §13.1) — body placement delays container load
            and competes with the theme-script replay for parse time. The <noscript>
            iframe stays in <body>, where Google's install puts it. */}
        {gtmHead && (
          <script id="gtm-init" dangerouslySetInnerHTML={{ __html: gtmHead }} />
        )}
      </head>
      <body className="rtl wp-theme-gogo">
        {gtmNoScript && (
          <noscript>
            <iframe
              src={gtmNoScript}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="gtm"
            />
          </noscript>
        )}
        <SiteAssets />
        {children}
        <StickyCta
          phoneDisplay={manifest.contact.phoneDisplay}
          phoneE164={manifest.contact.phoneE164}
          whatsappE164={manifest.contact.whatsappE164 ?? manifest.contact.phoneE164}
        />
      </body>
    </html>
  );
}
