/**
 * The live surfaces for this site — a thin React wrapper around the fleet live-kit
 * (lib/live/render.mjs, hash-locked; this file is the site's own and may be adapted).
 * Copied from 3locksmiths.co.il/fleet/live-kit/templates/Live.tsx.
 *
 *   <html … suppressHydrationWarning>          the head script sets data-live* before hydration
 *     <head> <LiveHead/> … </head>             FIRST in <head>, before GTM
 *     <body> <LiveTopBar/> <Header/> … <LiveDialogs/> </body>
 *   app/page.tsx: <LiveUpdates/> where the homepage strip belongs
 *
 * Every visible word comes from content/live/_campaigns.mjs and _updates.mjs (checked by
 * scripts/live/check-live-register.mjs before the build) and the NAP from site.config.json. The
 * markup is printed verbatim — scripts/live/check-live-out.mjs demands it on every exported page.
 * Server components only: no "use client", no new client bundle. The browser behaviour lives in
 * public/assets/live.js (the switch, the card, the strip's 45-day decay).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import campaigns from "@/content/live/_campaigns.mjs";
import updates from "@/content/live/_updates.mjs";
import calendar from "@/content/live/_calendar.json";
import config from "@/live.config.mjs";
import manifest from "@/site.config.json";
import {
  calmScript,
  dialogsHtml,
  headScript,
  newestUpdate,
  topbarHtml,
  updatesHtml,
} from "@/lib/live/render.mjs";

// NAP: the synced manifest. A site without site.config.json (thermoleak) sets `contact` in
// live.config.mjs instead and drops the manifest import above — the gates read the same source.
const contact = manifest.contact;

/** /assets/live.js?v=<sha256-12> — a returning visitor never runs a stale copy. */
function liveJsSrc(): string {
  const bytes = readFileSync(join(process.cwd(), "public", "assets", "live.js"));
  return `/assets/live.js?v=${createHash("sha256").update(bytes).digest("hex").slice(0, 12)}`;
}

/**
 * Order matters: the calm script first (it marks this page from its path, and re-marks it after
 * every client-side navigation), then the head script (picks the line; it appends its own
 * <style>, which React never owns — a React-owned node would be emptied on the first next/link
 * click, found by the 2026-10-11 review), then live.js.
 */
export function LiveHead() {
  return (
    <>
      <script
        id="live-calm"
        dangerouslySetInnerHTML={{
          __html: calmScript({
            calm: config.calm ?? [],
            noDialog: config.noDialog ?? [],
            campaigns,
            newest: newestUpdate(updates),
          }),
        }}
      />
      <script
        id="live-head"
        dangerouslySetInnerHTML={{ __html: headScript({ campaigns, calendar }) }}
      />
      <script src={liveJsSrc()} defer />
    </>
  );
}

/** The announcement bar — directly before the site header, NOT sticky. */
export function LiveTopBar() {
  return (
    <div
      style={{ display: "contents" }}
      dangerouslySetInnerHTML={{ __html: topbarHtml({ campaigns, contact }) }}
    />
  );
}

/** The seasonal cards (closed <dialog>s) — last in <body>. Renders nothing without a card. */
export function LiveDialogs() {
  const html = dialogsHtml({ campaigns, contact });
  return html ? (
    <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} />
  ) : null;
}

/** The homepage updates strip. Renders nothing while _updates.mjs has no items. */
export function LiveUpdates() {
  const html = updatesHtml({
    updates,
    containerClass: config.updatesContainerClass ?? "",
  });
  return html ? (
    <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} />
  ) : null;
}
