/**
 * Proves the Google-reviews line says exactly what the owner read, exactly where it should.
 * Register: content/enriched/_reputation.mjs. Rules: lib/reviews/reputation.mjs.
 * Pass: scripts/reputation.mjs. Plan: docs/dynamic-presence-plan.md §3.4 (as built 2026-10-13).
 *
 * Fails when:
 *   · the register is malformed (dates, numbers, an owner quote and a source on every read);
 *   · the newest read is older than 14 days (a weekly check was missed — the count would go
 *     stale on 109 pages). Warns from 8 days. LIVE_GATES=lapsed-ok downgrades ONLY this clock
 *     rule to a warning, the same contract as check-campaigns' runway rules;
 *   · site.config.json's place ID or links are not the ones docs/business-facts.md §B.5 records;
 *   · content/site.json does not carry, on every page that should, the count, rating, date and
 *     links the register and the manifest say — and nothing on any page that should not
 *     (no band on a calm page, no ask on a calm page, no line anywhere while the register is
 *     closed).
 *
 * Runs in npm `prebuild`.   node scripts/check-reputation.mjs   (exit 1 on any violation)
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "node-html-parser";
import { isCalm } from "../lib/live/pages.mjs";
import {
  CONTACT_ID,
  HOME_ID,
  STALE_DAYS,
  WARN_DAYS,
  isOpen,
  latestRead,
  oneDecimal,
  validate,
  hasBand,
  liveOn,
} from "../lib/reviews/reputation.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REGISTER = join(ROOT, "content", "enriched", "_reputation.mjs");
const SITE = join(ROOT, "content", "site.json");
const MANIFEST = join(ROOT, "content", "enriched", "_manifest.json");
const CONFIG = join(ROOT, "site.config.json");
const REVIEWS_JS = join(ROOT, "public", "assets", "reviews.js");
const LEDGER_OUT = join(ROOT, "public", "assets", "reputation.json");
const PLACE_ID = "ChIJpcB6V12ivggRi8lyDvLJiNs"; // docs/business-facts.md §B.5
const LAPSED_OK = process.env.LIVE_GATES === "lapsed-ok";

const problems = [];
const warnings = [];

if (!existsSync(REGISTER)) {
  if (readFileSync(SITE, "utf8").includes("live-reviews"))
    problems.push(
      "content/site.json carries the reviews line but content/enriched/_reputation.mjs is missing",
    );
  finish();
}

const register = (await import(pathToFileURL(REGISTER).href)).default;
problems.push(...validate(register).map((p) => `register: ${p}`));
const open = isOpen(register);
const read = latestRead(register);

// --- the clock rule ---------------------------------------------------------------------------
if (read && /^\d{4}-\d{2}-\d{2}$/.test(read.date)) {
  const todayIL = new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);
  const age = Math.round((Date.parse(todayIL) - Date.parse(read.date)) / 86_400_000);
  if (age < 0) problems.push(`register: the newest read (${read.date}) is in the future`);
  else if (open && age > STALE_DAYS) {
    const msg = `the newest dashboard read is ${age} days old (> ${STALE_DAYS}) — ask the owner for this week's count and average`;
    (LAPSED_OK ? warnings : problems).push(msg);
  } else if (open && age > WARN_DAYS)
    warnings.push(
      `the newest dashboard read is ${age} days old — the weekly check is due`,
    );
}

// --- identity ---------------------------------------------------------------------------------
const config = JSON.parse(readFileSync(CONFIG, "utf8"));
const s = config.schema ?? {};
if (s.placeId !== PLACE_ID)
  problems.push(`site.config.json schema.placeId is ${s.placeId}, not the §B.5 place ID`);
if (s.reviewsUri !== `https://search.google.com/local/reviews?placeid=${PLACE_ID}`)
  problems.push(
    "site.config.json schema.reviewsUri is not Google's reviews page for this place ID",
  );
if (
  register.ask?.enabled &&
  !/^https:\/\/g\.page\/r\/[\w-]+\/review$/.test(s.reviewsWriteUri ?? "")
)
  problems.push(
    "ask.enabled but site.config.json schema.reviewsWriteUri is not a g.page review link",
  );

// --- the rendered pages -----------------------------------------------------------------------
const site = JSON.parse(readFileSync(SITE, "utf8"));
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const kinds = new Map(
  (Array.isArray(manifest) ? manifest : (manifest.pages ?? Object.values(manifest))).map(
    (p) => [p.id, p.kind],
  ),
);
const kindOf = (id) => kinds.get(id);

const expectText = open
  ? {
      rating: oneDecimal(read.dashboard.rating),
      count: register.ui.count.replace("{count}", String(read.dashboard.total)),
      date: read.date,
    }
  : null;

function checkBlock(el, where, label, { ask }) {
  const txt = el.textContent.replace(/\s+/g, " ");
  if (!el.hasAttribute("data-nosnippet"))
    problems.push(`${where}: ${label} lacks data-nosnippet`);
  if (el.querySelector("script")) problems.push(`${where}: ${label} holds a <script>`);
  if (expectText) {
    const r = el.querySelector(".live-reviews__rating")?.textContent;
    if (r !== expectText.rating)
      problems.push(`${where}: ${label} rating "${r}" ≠ register ${expectText.rating}`);
    if (!txt.includes(expectText.count))
      problems.push(`${where}: ${label} does not say "${expectText.count}"`);
    if (el.querySelector("time")?.getAttribute("datetime") !== expectText.date)
      problems.push(`${where}: ${label} date ≠ register ${expectText.date}`);
    const readLinks = el
      .querySelectorAll("a")
      .filter((a) => a.getAttribute("href") === s.reviewsUri);
    if (readLinks.length !== 1)
      problems.push(`${where}: ${label} needs exactly one link to Google's reviews page`);
  }
  const asks = el
    .querySelectorAll("a")
    .filter((a) => a.getAttribute("href") === s.reviewsWriteUri);
  if (asks.length !== (ask ? 1 : 0))
    problems.push(
      `${where}: ${label} has ${asks.length} "write a review" link(s), expected ${ask ? 1 : 0}`,
    );
  for (const a of el.querySelectorAll("a")) {
    if (![s.reviewsUri, s.reviewsWriteUri].includes(a.getAttribute("href")))
      problems.push(`${where}: ${label} links somewhere other than the two Google links`);
    if (!/-review-(link|ask)$/.test(a.getAttribute("data-cta") ?? ""))
      problems.push(`${where}: ${label} link lacks a *-review-link/-ask data-cta`);
  }
}

const live = open && liveOn(register);

/** Live mode: the band's slider shell matches the register and carries no review content. */
function checkSlider(band, where) {
  const sliders = band.querySelectorAll(".live-reviews-slider");
  if (sliders.length !== (live ? 1 : 0))
    problems.push(
      `${where}: ${sliders.length} slider shell(s) in the band, expected ${live ? 1 : 0}`,
    );
  for (const sl of sliders) {
    if (!sl.hasAttribute("hidden"))
      problems.push(`${where}: the slider shell must start hidden`);
    if (sl.getAttribute("data-endpoint") !== "/api/reviews")
      problems.push(`${where}: the slider's data-endpoint must be /api/reviews`);
    for (const [attr, want] of [
      ["data-cap", register.live.cap],
      ["data-tolerance", register.live.tolerance],
      ["data-genuine", read.dashboard.total],
      ["data-asof", read.date],
    ]) {
      if (sl.getAttribute(attr) !== String(want))
        problems.push(
          `${where}: slider ${attr}="${sl.getAttribute(attr)}" ≠ register ${want}`,
        );
    }
    if (sl.querySelector(".live-reviews-slider__track")?.childNodes.length)
      problems.push(
        `${where}: the slider track must ship empty — review content is never stored`,
      );
    const tpl = sl.querySelector("template.live-reviews-slider__tpl");
    if (!tpl) problems.push(`${where}: the slider has no card <template>`);
    else {
      for (const slot of [
        ".live-reviews-card__name",
        ".live-reviews-card__text",
        ".live-reviews-card__date",
      ]) {
        const el = tpl.querySelector(slot);
        if (!el) problems.push(`${where}: the card template lacks ${slot}`);
        else if (el.textContent.trim())
          problems.push(`${where}: ${slot} must ship empty`);
      }
    }
    if (sl.querySelectorAll("button").length !== 2)
      problems.push(`${where}: the slider needs exactly two arrow buttons`);
  }
}

/**
 * The slider script and the ledger file. reviews.js must carry no copy and no other way to write
 * the page than the ones reviewed: textContent, `hidden`, `disabled`, and setAttribute on a short
 * allowlist — never innerHTML, never a URL but /api/reviews.
 */
function checkLiveFiles() {
  if (live !== Boolean(site.assets.reviewsJs))
    problems.push(
      `site.assets.reviewsJs is ${site.assets.reviewsJs ? "set" : "absent"} but live mode is ${live ? "on" : "off"}`,
    );
  if (existsSync(REVIEWS_JS)) {
    const js = readFileSync(REVIEWS_JS, "utf8");
    if (/[֐-׿]/.test(js))
      problems.push(
        "public/assets/reviews.js holds a Hebrew letter — copy belongs in the HTML shell",
      );
    for (const banned of [
      "innerHTML",
      "outerHTML",
      "insertAdjacentHTML",
      "document.write",
      "eval(",
      "new Function",
    ]) {
      if (js.includes(banned)) problems.push(`public/assets/reviews.js uses ${banned}`);
    }
    for (const m of js.matchAll(/setAttribute\(\s*"([^"]+)"/g)) {
      if (!["data-stars", "datetime", "dir", "data-reviews-init"].includes(m[1]))
        problems.push(
          `public/assets/reviews.js sets the attribute "${m[1]}", which is not on the allowlist`,
        );
    }
    if (/setAttribute\(\s*[^"\s]/.test(js))
      problems.push("public/assets/reviews.js sets an attribute by a computed name");
    for (const m of js.matchAll(/["'](\/[a-z][^"']*|https?:\/\/[^"']+)["']/gi)) {
      if (m[1] !== "/api/reviews")
        problems.push(`public/assets/reviews.js references the URL ${m[1]}`);
    }
    if (live) {
      const h = createHash("sha256")
        .update(readFileSync(REVIEWS_JS))
        .digest("hex")
        .slice(0, 12);
      if (site.assets.reviewsJs !== `/assets/reviews.js?v=${h}`)
        problems.push(
          "site.assets.reviewsJs does not carry the hash of public/assets/reviews.js — run npm run enrich",
        );
    }
  } else if (live)
    problems.push("live mode is on but public/assets/reviews.js is missing");
  if (existsSync(LEDGER_OUT)) {
    const l = JSON.parse(readFileSync(LEDGER_OUT, "utf8"));
    if (
      l.open !== open ||
      l.live !== live ||
      l.genuine !== (read?.dashboard?.total ?? 0) ||
      l.asOf !== (read?.date ?? null)
    )
      problems.push(
        "public/assets/reputation.json disagrees with the register — run npm run enrich",
      );
  } else problems.push("public/assets/reputation.json is missing — run npm run enrich");
}

const tally = { footer: 0, ask: 0, band: 0, hero: 0, contact: 0 };
for (const page of site.pages) {
  const where = `${page.path} (id ${page.id})`;
  const root = parse(page.bodyHtml, { comment: false });
  const calm = isCalm(page);
  const ask = register.ask?.enabled === true && !calm;

  const footers = root.querySelectorAll(".live-reviews--footer");
  const wantFooter = open || ask;
  if (footers.length !== (wantFooter ? 1 : 0))
    problems.push(
      `${where}: ${footers.length} footer reviews block(s), expected ${wantFooter ? 1 : 0}`,
    );
  for (const f of footers) {
    if (!f.closest("footer") || f.closest("main"))
      problems.push(`${where}: the footer block is not inside the footer`);
    if (!f.hasAttribute("data-lm-ignore"))
      problems.push(`${where}: the footer block must be data-lm-ignore`);
    if (open) checkBlock(f, where, "footer block", { ask });
    tally.footer++;
    if (ask) tally.ask++;
  }

  const bands = root.querySelectorAll(".live-reviews-band");
  const wantBand = open && hasBand(register, page, kindOf);
  if (bands.length !== (wantBand ? 1 : 0))
    problems.push(`${where}: ${bands.length} band(s), expected ${wantBand ? 1 : 0}`);
  for (const b of bands) {
    if (b.closest("main") || b.closest("footer"))
      problems.push(`${where}: the band must sit between </main> and <footer>`);
    if (!b.hasAttribute("data-lm-ignore"))
      problems.push(`${where}: the band must be data-lm-ignore`);
    checkBlock(b, where, "band", { ask: false });
    checkSlider(b, where);
    tally.band++;
  }

  for (const [id, cls, key] of [
    [HOME_ID, ".live-reviews--hero", "hero"],
    [CONTACT_ID, ".live-reviews--contact", "contact"],
  ]) {
    const els = root.querySelectorAll(cls);
    const want = open && page.id === id ? 1 : 0;
    if (els.length !== want)
      problems.push(`${where}: ${els.length} ${key} block(s), expected ${want}`);
    for (const el of els) {
      checkBlock(el, where, `${key} block`, { ask: false });
      tally[key]++;
    }
  }
}

checkLiveFiles();

console.log(
  `reputation: ${open ? `OPEN — ${expectText.rating} · ${read.dashboard.total} reviews as of ${read.date}` : "closed"}; ` +
    `footer ${tally.footer}, ask ${tally.ask}, band ${tally.band}, hero ${tally.hero}, contact ${tally.contact}`,
);
finish();

function finish() {
  for (const w of warnings) console.warn(`  ⚠ ${w}`);
  if (problems.length) {
    for (const p of problems.slice(0, 40)) console.error(`  ✗ ${p}`);
    console.error(`\nREPUTATION: ${problems.length} problem(s).`);
    process.exit(1);
  }
  console.log("reputation: every block says what the register says, where it should ✅");
  process.exit(0);
}
