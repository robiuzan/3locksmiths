import type { Metadata } from "next";
import Link from "next/link";
import { type SiteManifest } from "@ishub/site-kit";
import siteManifest from "@/site.config.json";

/**
 * /thank-you/ — the Web3Forms success redirect target (backlog §8.6). Every lead form points
 * its hidden `redirect` input here (injected by scripts/fix-links.mjs), which gives the site
 * its first URL-based conversion signal: a GA4 key event on this page view is the cleanest
 * Google Ads target a no-JS form can have.
 *
 * English path on purpose, matching the site's existing utility URLs (/contact/,
 * /privacy-policy/): Next 16's static exporter throws InvalidCharacterError on a literal
 * Hebrew route DIRECTORY (app/תודה/ failed the build). The catch-all's Hebrew routes are
 * unaffected — its directory name is ASCII ([...slug]).
 *
 * Not part of the WordPress snapshot: this is a native route beside the catch-all, so it has
 * no scraped chrome. It is styled by app/enrich.css (.thankyou*) and still gets GTM + the
 * sticky CTA bar from the root layout. noindex — a thank-you page in the index inflates
 * conversion counts and has nothing to rank for.
 */

const manifest = siteManifest as unknown as SiteManifest;
const PHONE = manifest.contact.phoneDisplay;
const PHONE_TEL = manifest.contact.phoneE164;
const WA = (manifest.contact.whatsappE164 ?? manifest.contact.phoneE164).replace(
  /\D/g,
  "",
);

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: { absolute: "תודה על הפנייה | שלושה מנעולנים" },
  robots: { index: false, follow: true },
};

export default function ThankYouPage() {
  return (
    <main className="thankyou">
      <div className="thankyou__card">
        <h1>תודה, הפנייה התקבלה!</h1>
        <p>
          קיבלנו את ההודעה שלכם ונחזור אליכם בהקדם. אם העניין דחוף – נעילה, מפתח שאבד או
          תקלה במנעול – אל תחכו לנו: התקשרו או כתבו לנו בוואטסאפ ונטפל בכם מיד.
        </p>
        <div className="thankyou__actions">
          <a
            href={`tel:${PHONE_TEL}`}
            data-cta="thankyou-call"
            className="thankyou__btn thankyou__btn--call"
            dir="ltr"
          >
            {PHONE}
          </a>
          <a
            href={`https://wa.me/${WA}`}
            target="_blank"
            rel="noopener"
            data-cta="thankyou-whatsapp"
            className="thankyou__btn thankyou__btn--wa"
          >
            שלחו וואטסאפ
          </a>
        </div>
        <p className="thankyou__back">
          {/* prefetch={false} is load-bearing. This is the one next/link on the site, and by
              default it prefetches the homepage's route data as soon as it is in view: ~400 KB
              on the conversion page, for a link few visitors follow. Since the hero band is
              preloaded (components/SiteFrame.tsx) that data also carries the preload hints, so
              the browser would fetch the band image here — a page that never paints it. */}
          <Link href="/" prefetch={false}>
            חזרה לעמוד הבית
          </Link>
        </p>
      </div>
    </main>
  );
}
