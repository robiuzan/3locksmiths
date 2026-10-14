/**
 * Renders the Google-reviews line from content/enriched/_reputation.mjs into content/site.json.
 * Rules and markup: lib/reviews/reputation.mjs. Gate: scripts/check-reputation.mjs.
 *
 * WHERE IT WRITES (owner decisions 2026-10-08 / 2026-10-13):
 *   · every page's footer — before `.footer-info > a.btn-link` (the "הזמינו פגישה" button), a
 *     live region (data-lm-ignore + data-nosnippet): the line + "all reviews" link, and the
 *     "write a review" ask except on the calm pages;
 *   · the homepage — after the hero call button (`.home-hero-left > a.btn-link`);
 *   · /contact/ — after the <p> holding its call button (`p > a.btn-link.btn-green`);
 *   · the 80 service + city pages — a `.live-reviews-band` live region between </main> and
 *     <footer>, so a weekly count change never re-dates their sitemap entries.
 *
 * Anchors are structural, never data-cta: fix-links.mjs adds data-cta AFTER this pass, so a
 * fresh `npm run snapshot` body does not carry it yet.
 *
 * PIPELINE POSITION:  … footer → live-surfaces → **reputation** → form → … → fix-links → lastmod
 *
 * Idempotent: strips everything it wrote, then re-renders. Fails when an anchor is missing,
 * when the register is malformed, or when the register is gone but site.json still carries the
 * line (the off switch is to close it in the register, never to delete the file).
 * No clock, no network.
 *
 *   node scripts/reputation.mjs      (chained into `npm run enrich` and `npm run snapshot`)
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "node-html-parser";
import { isCalm } from "../lib/live/pages.mjs";
import {
  CONTACT_ID,
  HOME_ID,
  OWN_SELECTOR,
  askOnlyHtml,
  blockHtml,
  isOpen,
  validate,
  hasBand,
  latestRead,
  liveOn,
} from "../lib/reviews/reputation.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "content", "site.json");
const REGISTER = join(ROOT, "content", "enriched", "_reputation.mjs");
const MANIFEST = join(ROOT, "content", "enriched", "_manifest.json");
const CONFIG = join(ROOT, "site.config.json");
const REVIEWS_JS = join(ROOT, "public", "assets", "reviews.js");
const LEDGER_OUT = join(ROOT, "public", "assets", "reputation.json");

const fail = (msg) => {
  console.error(`\nREPUTATION PROBLEM: ${msg}`);
  process.exit(1);
};

const site = JSON.parse(readFileSync(FILE, "utf8"));
if (!existsSync(REGISTER)) {
  if (readFileSync(FILE, "utf8").includes("live-reviews"))
    fail(
      "content/enriched/_reputation.mjs is missing but content/site.json still carries the reviews line.",
    );
  console.log("reputation: no content/enriched/_reputation.mjs — nothing rendered.");
  process.exit(0);
}

const register = (await import(pathToFileURL(REGISTER).href)).default;
const problems = validate(register);
if (problems.length) fail(`the register is malformed:\n  - ${problems.join("\n  - ")}`);

const config = JSON.parse(readFileSync(CONFIG, "utf8"));
const links = { read: config.schema?.reviewsUri, write: config.schema?.reviewsWriteUri };
if (!/^https:\/\/search\.google\.com\/local\/reviews\?placeid=/.test(links.read ?? ""))
  fail(
    "site.config.json schema.reviewsUri must be Google's reviews page (sync it from the roster).",
  );
const askOn = register.ask?.enabled === true;
if (askOn && !/^https:\/\/g\.page\/r\/[\w-]+\/review$/.test(links.write ?? ""))
  fail(
    "ask.enabled is true but site.config.json schema.reviewsWriteUri is not a g.page review link.",
  );

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const kinds = new Map(
  (Array.isArray(manifest) ? manifest : (manifest.pages ?? Object.values(manifest))).map(
    (p) => [p.id, p.kind],
  ),
);
const kindOf = (id) => kinds.get(id);
const open = isOpen(register);

const counts = { footer: 0, ask: 0, hero: 0, contact: 0, band: 0 };
for (const page of site.pages) {
  const root = parse(page.bodyHtml, {
    comment: false,
    blockTextElements: { script: true, noscript: true, style: true, pre: true },
  });
  for (const old of root.querySelectorAll(OWN_SELECTOR)) old.remove();

  const calm = isCalm(page);
  const ask = askOn && !calm;
  const where = `${page.path} (id ${page.id})`;

  const btns = root.querySelectorAll("footer .footer-info > a.btn-link");
  if (btns.length !== 1)
    fail(
      `${where}: expected one footer .footer-info > a.btn-link, found ${btns.length}.`,
    );
  if (open) {
    btns[0].insertAdjacentHTML(
      "beforebegin",
      blockHtml(register, links, "footer", { ask }),
    );
    counts.footer++;
    if (ask) counts.ask++;
  } else if (ask) {
    btns[0].insertAdjacentHTML("beforebegin", askOnlyHtml(register, links));
    counts.ask++;
  }

  if (open && page.id === HOME_ID) {
    const hero = root.querySelectorAll(".home-hero-left > a.btn-link");
    if (hero.length !== 1)
      fail(`${where}: expected one .home-hero-left > a.btn-link, found ${hero.length}.`);
    hero[0].insertAdjacentHTML("afterend", blockHtml(register, links, "hero"));
    counts.hero++;
  }
  if (open && page.id === CONTACT_ID) {
    const ps = root
      .querySelectorAll("p")
      .filter((p) => p.querySelector("a.btn-link.btn-green"));
    if (ps.length !== 1)
      fail(
        `${where}: expected one <p> holding a.btn-link.btn-green, found ${ps.length}.`,
      );
    ps[0].insertAdjacentHTML("afterend", blockHtml(register, links, "contact"));
    counts.contact++;
  }
  if (open && hasBand(register, page, kindOf)) {
    const footer = root.querySelectorAll("footer").filter((f) => !f.closest("main"));
    if (footer.length !== 1)
      fail(`${where}: expected one top-level <footer>, found ${footer.length}.`);
    footer[0].insertAdjacentHTML("beforebegin", blockHtml(register, links, "band"));
    counts.band++;
  }

  page.bodyHtml = root.toString();
}

// Live mode (State C): version the slider script, exactly as live-surfaces versions live.js —
// nothing in public/_headers sets caching for /assets/, and a returning visitor must never run a
// stale copy. Absent while live mode is off, so the layout prints no script at all.
const live = open && liveOn(register);
if (live) {
  if (!existsSync(REVIEWS_JS))
    fail("live mode is on but public/assets/reviews.js is missing.");
  const h = createHash("sha256")
    .update(readFileSync(REVIEWS_JS))
    .digest("hex")
    .slice(0, 12);
  site.assets.reviewsJs = `/assets/reviews.js?v=${h}`;
} else {
  delete site.assets.reviewsJs;
}
// The confirmed numbers, for the Worker (workers/reviews/) to read from production on each cron
// run: how many reviews the owner has confirmed, as of when, and how many newer ones may show.
// No review content, no clock — deterministic like every other enrich output.
const read = latestRead(register);
writeFileSync(
  LEDGER_OUT,
  JSON.stringify(
    {
      about:
        "Generated by scripts/reputation.mjs from content/enriched/_reputation.mjs — read by workers/reviews. Do not edit.",
      open,
      live,
      genuine: read?.dashboard?.total ?? 0,
      asOf: read?.date ?? null,
      tolerance: register.live?.tolerance ?? 0,
      cap: register.live?.cap ?? 0,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);
writeFileSync(FILE, JSON.stringify(site, null, 2), "utf8");
console.log(
  `reputation: ${open ? "OPEN" : "closed"} — footer line on ${counts.footer}, ask link on ${counts.ask}, ` +
    `hero ${counts.hero}, contact ${counts.contact}, band on ${counts.band} page(s); live mode ${live ? "ON" : "off"}.`,
);
