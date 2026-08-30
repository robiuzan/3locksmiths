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
const iconLink = site.assets.headLinks.find(
  (l) => (l.rel ?? "").includes("icon") && !(l.rel ?? "").includes("apple"),
);
const appleLink = site.assets.headLinks.find((l) => (l.rel ?? "").includes("apple"));

// Base metadata shared by every route. Per-page title/description/canonical/robots are
// supplied by each route's generateMetadata() and merged over this by Next.js.
// Search Console verification comes from the manifest (roster → site.config.json), never a
// hardcoded literal (backlog §13.5) — null in the manifest means no tag is emitted.
export const metadata: Metadata = {
  metadataBase: new URL(site.wpUrl),
  icons: {
    icon: iconLink?.href,
    apple: appleLink?.href,
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
