/**
 * Pure HTML-string renderers for enriched pages. Each function reproduces the EXACT
 * "gogo" theme CSS classes captured from reference page id 95, so the vendored theme CSS
 * styles them identically and the theme jQuery (`scripts.js`, replayed by ThemeScripts)
 * wires the accordion/marquee with zero new client JS. Consumed by scripts/enrich.mjs at
 * build time — never shipped to the browser.
 *
 * Input shape: see lib/enrich/types.ts (EnrichedPage). Authored data lives in
 * content/enriched/<id>.mjs.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { esc } from "./esc.mjs";
import { catalogImg, heroRefFor, imageRef, SIZES } from "./catalog-image.mjs";

// NAP + form config are sourced from the manifest (site.config.json) — never hardcoded here.
// The Web3Forms access key is PUBLIC by design; the delivery inbox is set in the Web3Forms
// dashboard.
const manifest = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "..", "site.config.json"),
    "utf8",
  ),
);
const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
const WEB3FORMS_KEY = manifest.contact?.formAccessKey ?? "";

const HERO_IMG = "/wp-content/uploads/2025/04/157336036_m.jpg";
const AVATAR = "/wp-content/uploads/2025/04/avatar-1-1.png";
const ADV_ICON = "/wp-content/uploads/2025/05/9.webp";
const FORM_IMG = "/wp-content/uploads/2025/05/14.webp";
// 24/7 confirmed by the owner 2026-08-30 (docs/business-facts.md §D.3); the schema in
// scripts/enrich.mjs publishes 00:00–23:59 all week to match.
const HOURS = "זמינים 24/7, כל ימות השבוע";
const PHONE = manifest.contact?.phoneDisplay ?? "076-599-1266";
const PHONE_TEL = manifest.contact?.phoneE164 ?? "+972765991266";

const MARQUEE_LOGOS = [
  "Volkswagen-emblem-2014-1920x1080-1.webp",
  "pngimg.com-car_logo_PNG1645.webp",
  "Opel-Logo-2011-Vector.webp",
  "Mercedes-Logo.svg.webp",
  "Honda.svg.webp",
  "Citroen-Logo-Transparent-Images.webp",
  "chevroletlogo-freelogovectors.net_.webp",
  "bmw_logo_PNG19707.webp",
  "61fc5d_d616ab18a8d24afb8c17051280aa4681mv2.webp",
  "Ford_logo_flat.svg.webp",
  "Kia-logo.webp",
  "Mazda-Logo.webp",
  "pngimg.com-mitsubishi_PNG112.webp",
  "Renault_Logo_2015.webp",
].map((f) => `/wp-content/uploads/2025/04/${f}`);

// Default "why choose us" cards — shared business-wide trust signals (cleaned from ref 95).
// 🔶 confirm: the first card used to claim "ניסיון של 25 שנים" while the manifest has
// foundedYear: null (docs/business-facts.md §A.1). Replaced with a factual service card;
// restore an experience claim only once the founding year is confirmed in the roster.
const DEFAULT_FEATURES = [
  {
    title: "שירות בשטח, עד אליכם",
    text: "הניידת מגיעה אליכם ומבצעת את העבודה במקום – שכפול, קידוד ופתיחת רכב ליד הרכב או בבית, ללא גרירה למוסך.",
  },
  {
    title: "מכשור מתקדם",
    text: "עובדים עם ציוד חדשני שמבטיח תוצאות איכותיות גם לדגמים החדשים ביותר.",
  },
  {
    title: "מענה לקריאות דחופות",
    text: "נעילה מחוץ לרכב או דלת שלא נפתחת מטופלות בעדיפות – התקשרו ונעדכן זמן הגעה מדויק.",
  },
  {
    title: "מחיר שקוף מראש",
    text: "המחיר נמסר לכם לפני תחילת העבודה – בלי הפתעות ובלי עלויות נסתרות בסוף.",
  },
  {
    title: "שירות מותאם אישית",
    text: "כל לקוח מקבל יחס אישי והתאמה מלאה לצרכיו, לרכב ולסוג השירות.",
  },
  {
    title: "עבודה נקייה",
    text: "פותחים בשיטות שאינן פוגעות בדלת או ברכב, ומשאירים את המנגנון תקין לשימוש.",
  },
];

const SVG_PHONE = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.5804 11.7424L13.3429 9.50953C12.5438 8.71208 11.1853 9.03109 10.8656 10.0677C10.6259 10.7855 9.82675 11.1842 9.10754 11.0247C7.50929 10.626 5.35166 8.5526 4.95209 6.87796C4.71236 6.16023 5.19183 5.36278 5.91104 5.12358C6.9499 4.8046 7.26955 3.44895 6.47043 2.6515L4.23288 0.418658C3.59358 -0.139553 2.63464 -0.139553 2.07525 0.418658L0.556915 1.9338C-0.96142 3.52869 0.71674 7.75515 4.47262 11.5031C8.2285 15.2511 12.4639 17.0055 14.0621 15.4106L15.5804 13.8955C16.1399 13.2575 16.1399 12.3006 15.5804 11.7424Z" fill="#FFFFFF"></path></svg>`;
const SVG_CUBE = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 4.5C17.378 4.5 16.7676 4.6631 16.2275 4.97168L7.68164 9.85547C6.64368 10.4486 6 11.5545 6 12.75V23.25C6 24.4455 6.64368 25.5514 7.68164 26.1445L16.2275 31.0283C16.7676 31.3369 17.378 31.5 18 31.5C18.622 31.5 19.2324 31.3369 19.7725 31.0283L28.3184 26.1445C29.3563 25.5514 30 24.4455 30 23.25V12.75C30 11.5545 29.3563 10.4486 28.3184 9.85547L19.7725 4.97168C19.2324 4.6631 18.622 4.5 18 4.5Z" fill="#3E8DFD"></path></svg>`;
const SVG_ARROW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"></path></svg>`;
const SVG_PLUS = `<svg class="plus" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.1999 7.19998H8.80002V0.799949C8.80002 0.358446 8.44158 0 7.99993 0C7.55842 0 7.19998 0.358446 7.19998 0.799949V7.19998H0.799949C0.358446 7.19998 0 7.55842 0 7.99993C0 8.44158 0.358446 8.80002 0.799949 8.80002H7.19998V15.1999C7.19998 15.6416 7.55842 16 7.99993 16C8.44158 16 8.80002 15.6416 8.80002 15.1999V8.80002H15.1999C15.6416 8.80002 16 8.44158 16 7.99993C16 7.55842 15.6416 7.19998 15.1999 7.19998Z" fill="#3D55AD"></path></svg>`;
const SVG_MINUS = `<svg class="minus" width="16" height="2" viewBox="0 0 16 2" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.1999 1.60004H0.799949C0.358446 1.60004 0 1.2416 0 0.800095C0 0.358446 0.358446 0 0.799949 0H15.1999C15.6416 0 16 0.358446 16 0.800095C16 1.2416 15.6416 1.60004 15.1999 1.60004Z" fill="#3D55AD"></path></svg>`;

// Location-pin icon (harvested from the homepage section-areas) for renderAreas.
const SVG_PIN = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#FF7A00"></rect><path d="M26 11.0382C25.1145 10.2313 24.0769 9.60931 22.9479 9.20867C21.819 8.80803 20.6214 8.63681 19.4253 8.70504C18.2293 8.77328 17.059 9.0796 15.9829 9.60605C14.9068 10.1325 13.9466 10.8685 13.1587 11.7708C12.3708 12.6732 11.7709 13.7238 11.3943 14.861C11.0177 15.9982 10.8719 17.1992 10.9655 18.3935C11.0591 19.5878 11.3901 20.7514 11.9393 21.8161C12.4884 22.8807 13.2446 23.8251 14.1635 24.5937C16.2642 26.3402 18.0195 28.4646 19.3385 30.857C19.403 30.9761 19.4985 31.0756 19.615 31.1447C19.7315 31.2139 19.8645 31.2503 20 31.25C20.1354 31.2499 20.2682 31.2132 20.3844 31.1437C20.5006 31.0743 20.5958 30.9747 20.66 30.8555L20.7215 30.74C22.05 28.3765 23.8016 26.2774 25.889 24.5472C26.8563 23.7112 27.6343 22.6786 28.1709 21.5182C28.7075 20.3578 28.9906 19.0963 29.0011 17.8178C29.0116 16.5394 28.7493 15.2734 28.2318 14.1043C27.7143 12.9352 26.9534 11.8899 26 11.0382ZM20 21.5C19.2583 21.5 18.5333 21.28 17.9166 20.868C17.2999 20.4559 16.8193 19.8702 16.5354 19.185C16.2516 18.4998 16.1774 17.7458 16.322 17.0184C16.4667 16.2909 16.8239 15.6228 17.3483 15.0983C17.8728 14.5739 18.541 14.2167 19.2684 14.072C19.9958 13.9273 20.7498 14.0016 21.4351 14.2854C22.1203 14.5692 22.7059 15.0499 23.118 15.6666C23.5301 16.2833 23.75 17.0083 23.75 17.75C23.7488 18.7442 23.3533 19.6973 22.6503 20.4003C21.9473 21.1033 20.9942 21.4988 20 21.5Z" fill="white"></path></svg>`;

// Re-exported: scripts/pages.mjs imports `esc` from here, and it now lives in its own module so
// catalog-image.mjs can share it without an import cycle.
export { esc };
const paras = (arr) => (arr || []).map((t) => `<p>${esc(t)}</p>`).join("\n");

/** Shared advantages-grid section wrapper (reused by process/scenarios/stats). */
function advGrid(h2, caption, intro, itemsHtml, extraClass = "") {
  return `<section class="section section-advantages ${extraClass}"><div class="container">
    ${caption ? `<p class="section-caption"><span>${esc(caption)}</span></p>` : ""}
    <h2>${esc(h2)}</h2>
    ${intro ? `<div class="text text-top"><p>${esc(intro)}</p></div>` : ""}
    <div class="grid-wrap">${itemsHtml}</div>
  </div></section>`;
}

/** Font Awesome 5 icon (the theme ships FA5 Pro + line-awesome; .fas is loaded). */
const faIcon = (name) => `<i class="fas fa-${name}" aria-hidden="true"></i>`;

// Shared business-wide stats — rendered on every page for a consistent "by the numbers" band.
/**
 * Fallback for pages that do not author their own `stats`.
 *
 * ⚠️ THIS RENDERS ON ~55 PAGES. Everything here is asserted sitewide, so it must contain only
 * facts that survive docs/business-facts.md. The previous version did not, and shipped to
 * production on 2026-08-25: it claimed "25+ שנות ניסיון" (⛔ — the manifest has
 * `foundedYear: null`), "30–60 ד׳ זמן מענה ממוצע" (an unbacked response-time promise),
 * "100% אחריות מלאה" and "פריסה ארצית" on 60+ pages that never authored any of it. It was
 * missed because review checked the authored modules and never the *rendered* page.
 *
 * Rule for anything added here: it must be a description of what the business does, or a
 * ✅ row in docs/business-facts.md. Never a number, a duration, a guarantee, or a count.
 */
const DEFAULT_STATS = [
  { icon: "car-side", value: "רכב ובית", label: "מנעולנות לרכב ולדלתות הבית" },
  { icon: "key", value: "שכפול וקידוד", label: "מפתחות חכמים ושלטים לרכב" },
  { icon: "tools", value: "בשטח", label: "הניידת מגיעה אליכם עם הציוד" },
  { icon: "headset", value: PHONE, label: "מענה בטלפון ובוואטסאפ" },
];

/** Breadcrumb trail derived from page kind. */
function crumbs(page) {
  const trail = [{ label: "בית", href: "/" }];
  if (page.kind === "location")
    trail.push({ label: "אזורי שירות", href: "/אזורי-שירות/" });
  else if (page.kind === "service" || page.kind === "brand-key")
    trail.push({ label: "שירותים", href: "/services" });
  const items = trail
    .map(
      (c) =>
        `<li><a href="${c.href}">${esc(c.label)}</a></li><li><span class="divider">/</span></li>`,
    )
    .join("");
  return `<ul class="breadcrumbs">${items}<li><span>${esc(page.keyword)}</span></li></ul>`;
}

/**
 * The hero image, from the central catalog when one is published and the legacy upload otherwise.
 *
 * The fallback is load-bearing, not defensive: the whole pipeline has to keep building — byte for
 * byte identically — before a single image has been generated. CI asserts exactly that
 * (`git diff --quiet -- content/site.json` after `npm run enrich`), so an unconditional switch to
 * catalog URLs would fail the build on day one.
 *
 * The catalog path picks car / home / both by page kind and id; see heroBucket in catalog-image.mjs.
 * It is the LCP element, so it is eager with fetchpriority=high.
 */
function heroImg(page) {
  const img = catalogImg(heroRefFor(page), {
    sizes: SIZES.hero,
    eager: true,
    alt: undefined, // use the catalog's Hebrew alt; it describes the actual photograph
  });
  return img ?? `<img src="${HERO_IMG}" alt="${esc(page.keyword)}">`;
}

/**
 * The contact avatar. Rendered twice per page across 112 pages — the most-repeated image on the
 * site after the hero. The legacy file is a stock photograph of a woman who does not work here,
 * presented beside the contact form as the person you reach.
 */
function avatarImg() {
  const img = catalogImg(imageRef("avatar"), { sizes: SIZES.avatar, fixed: true });
  return img ?? `<img src="${AVATAR}" alt>`;
}

export function renderHero(page) {
  return `<section class="section-header-banner">
  <div class="container"><div class="row">
    <div class="col-lg-6"><div class="header-banner-left">
      ${crumbs(page)}
      <h1>${esc(page.hero.h1)}</h1>
      <div class="d-flex">
        <div class="text section-description"><p>${esc(page.hero.tagline)}</p></div>
        <a class="btn-link btn-green" href="tel:${PHONE_TEL}" data-cta="hero-call">${SVG_PHONE}${PHONE}</a>
      </div>
    </div></div>
    <div class="col-lg-6"><div class="header-banner-right">
      ${heroImg(page)}
      <div class="home-goole-box-wrap"><div class="home-google-box">
        ${avatarImg()}
        <div class="form-wrap-bar-text"><h3>צור קשר למענה מהיר</h3>
          <div class="work-time"><div class="caption"><p>${HOURS}</p></div></div>
        </div>
      </div></div>
    </div></div>
  </div></div>
</section>`;
}

/** Sidebar widget of related links (service-item: caption + arrow icon). */
function renderSidebar(links) {
  const items = links
    .map(
      (l) =>
        `<a href="${l.href}" class="service-item"><span class="caption">${esc(l.label)}</span><span class="icon">${SVG_ARROW}</span></a>`,
    )
    .join("\n");
  return `<div class="sidebar"><div class="services-widget">
    <strong class="h5 services-widget__title">שירותים קשורים</strong>
    ${items}
  </div></div>`;
}

function renderPricing(rows) {
  if (!rows || !rows.length) return "";
  const body = rows
    .map((r) => `<tr><td>${esc(r.service)}</td><td>${esc(r.price)}</td></tr>`)
    .join("");
  return `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>סוג השירות</th><th>עלות ממוצעת (₪)</th></tr></thead><tbody>${body}</tbody></table></figure>`;
}

/** page-content: 2-column (post-content main + related-links sidebar). */
function renderPageContent(page) {
  const sidebar = renderSidebar(
    [...(page.related?.services || []), ...(page.related?.locations || [])].slice(0, 10),
  );
  return `<section class="page-content section-gutenberg"><div class="container"><div class="section-row">
    <div class="post-content">
      <h2 class="wp-block-heading">${esc(page.intro.heading)}</h2>
      ${paras(page.intro.paragraphs)}
      ${renderPricing(page.pricing)}
      ${paras(page.intro.outro)}
    </div>
    ${sidebar}
  </div></div></section>`;
}

function renderAdvantages(page) {
  const feats =
    page.advantages?.features && page.advantages.features.length === 6
      ? page.advantages.features
      : DEFAULT_FEATURES;
  const caption = page.advantages?.caption || "היתרונות שלנו";
  // No customer counts here — "אלפי לקוחות מרוצים" was unsourced social proof rendering on
  // ~55 pages. See the DEFAULT_STATS note above.
  const intro =
    page.advantages?.intro || "מה שאתם מקבלים כשאתם מזמינים מנעולן משלושה מנעולנים.";
  const cards = feats
    .map(
      (f) => `<div class="grid-item">
      <div class="grid-item-top"><div class="icon"><img src="${ADV_ICON}" alt></div><h3>${esc(f.title)}</h3></div>
      <div class="description"><p>${esc(f.text)}</p></div>
    </div>`,
    )
    .join("\n");
  return `<section class="section section-advantages enrich-why"><div class="container">
    <p class="section-caption"><span>${esc(caption)}</span></p>
    <h2>למה לבחור בנו?</h2>
    <div class="text text-top"><p>${esc(intro)}</p></div>
    <div class="grid-wrap">${cards}</div>
  </div></section>`;
}

function renderFaq(page) {
  const items = (page.faq?.items || [])
    .map(
      (it, i) => `<div class="acc-item">
        <a href="#faq-${i + 1}" id="faq_${i + 1}" class="acc-item__header">
          <div class="acc-item__header__title">${esc(it.q)}</div>
          <div class="acc-item__header__icon">${SVG_PLUS}${SVG_MINUS}</div>
        </a>
        <div class="acc-item__body"><div><p>${esc(it.a)}</p></div></div>
      </div>`,
    )
    .join("\n");
  const sub = page.faq?.subtitle || "מענה לשאלות הנפוצות ביותר שלקוחות שואלים אותנו.";
  return `<section id="faq" class="section section-faq"><div class="container"><div class="row-faq">
    <div class="text-left">
      <p class="section-caption"><span>שאלות נפוצות בנושא ${esc(page.keyword)}</span></p>
      <h2>כל מה שצריך לדעת</h2>
      <div class="section-content"><p>${esc(sub)}</p></div>
      <div class="btn-row"><a class="btn-link btn-green" href="tel:${PHONE_TEL}" data-cta="content-call">${SVG_PHONE}${PHONE}</a></div>
    </div>
    <div class="qa"><div class="acc-wrap"><div class="acc-column">${items}</div></div></div>
  </div></div></section>`;
}

/** Related services + locations as the s-services-list carousel (internal-link silo). */
function renderServicesList(page) {
  const links = [...(page.related?.services || []), ...(page.related?.locations || [])];
  if (!links.length) return "";
  const items = links
    .map(
      (l) =>
        `<a href="${l.href}" class="service-item">${SVG_CUBE}<span class="caption">${esc(l.label)}</span></a>`,
    )
    .join("\n");
  return `<section id="services" class="s-services-list"><div class="container">
    <h2>שירותים קשורים</h2>
    <div class="rows"><div class="column-serv"><div class="offer-list">${items}</div></div></div>
  </div></section>`;
}

function renderMarquee() {
  const imgs = MARQUEE_LOGOS.map(
    (src) =>
      `<div class="client-item"><img src="${src}" class="attachment-full size-full" alt decoding="async"></div>`,
  ).join("\n");
  return `<section class="section-marquee"><div class="container">
    <div class="clients-carousel"><div class="marquee"><div class="clients-carousel__inner">${imgs}</div></div></div>
  </div></section>`;
}

export function renderForm(page) {
  const heading =
    page.cta?.heading || `זקוקים ל${page.keyword}? מלאו את הטופס וקבלו שירות מהיר!`;
  const body =
    page.cta?.body ||
    "הצוות שלנו כאן כדי לספק לכם פתרון מקצועי, מהיר וללא טרחה, עם זמינות גבוהה ואחריות מלאה.";
  return `<section class="s-serv-form-wrap"><div class="container"><div class="s-serv-form"><div class="row">
    <div class="col"><div class="content-serv">
      <h2>${esc(heading)}</h2>
      <div class="home-hero-it"><img src="${FORM_IMG}" alt><div class="text-hero"><p>${esc(body)}</p></div></div>
    </div></div>
    <div class="col"><div class="serv-form"><div class="form-wrap form-talk-to-expert">
      <div class="form-wrap-bar">${avatarImg()}<div class="form-wrap-bar-text">
        <h3 class="h6 form-title">צור קשר למענה מהיר</h3>
        <div class="work-time"><div class="caption"><p>${HOURS}</p></div></div>
      </div></div>
      <div class="wpcf7 no-js">
        <form action="${WEB3FORMS_ENDPOINT}" method="POST" class="wpcf7-form init" aria-label="Contact form" novalidate="novalidate">
          <input type="hidden" name="access_key" value="${WEB3FORMS_KEY}">
          <input type="hidden" name="subject" value="פנייה חדשה מהאתר – שלושה מנעולנים">
          <input type="hidden" name="from_name" value="שלושה מנעולנים">
          <input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden">
          <p><span class="wpcf7-form-control-wrap" data-name="form-name"><input size="40" class="wpcf7-form-control wpcf7-text" placeholder="שם" value type="text" name="name"></span></p>
          <p><span class="wpcf7-form-control-wrap" data-name="form-email"><input size="40" class="wpcf7-form-control wpcf7-email wpcf7-text" placeholder="האימייל שלך" value type="email" name="email"></span></p>
          <p><span class="wpcf7-form-control-wrap" data-name="message"><textarea cols="40" rows="10" class="wpcf7-form-control wpcf7-textarea" placeholder="כתוב את ההודעה שלך כאן" name="message"></textarea></span></p>
          <p><button class="wpcf7-submit" type="submit"><span class="caption">שלח הודעה</span></button></p>
        </form>
      </div>
    </div></div></div>
  </div></div></div></section>`;
}

/** "How it works" — numbered process steps (reuses advantages grid; drives HowTo schema). */
function renderProcess(page) {
  if (!page.process?.length) return "";
  const items = page.process
    .map(
      (s, i) => `<div class="grid-item enrich-step">
      <div class="grid-item-top"><div class="enrich-step__num">${i + 1}</div><h3>${esc(s.title)}</h3></div>
      <div class="description"><p>${esc(s.text)}${s.time ? ` <span class="step-time">(${esc(s.time)})</span>` : ""}</p></div>
    </div>`,
    )
    .join("\n");
  return advGrid(
    "איך זה עובד",
    "תהליך השירות",
    "השירות מתבצע בשטח, במהירות ובשקיפות מלאה – שלב אחר שלב.",
    items,
    "enrich-cols-4",
  );
}

/** Key-types / systems comparison table (reuses wp-block-table inside post-content). */
function renderSpecsTable(page) {
  const t = page.specsTable;
  if (!t?.columns?.length || !t?.rows?.length) return "";
  const head = t.columns.map((c) => `<th>${esc(c)}</th>`).join("");
  const body = t.rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("");
  return `<section class="page-content section-gutenberg"><div class="container"><div class="post-content">
    ${t.caption ? `<h2 class="wp-block-heading">${esc(t.caption)}</h2>` : ""}
    ${t.intro ? `<p>${esc(t.intro)}</p>` : ""}
    <figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></figure>
  </div></div></section>`;
}

/**
 * "Which key do you have" — a per-model key/remote grid on brand-key pages.
 *
 * This is product photography, not decoration: the grid's job is letting an owner match the key in
 * their hand to a row in the price table above. So the media box uses `fit=contain` on a light
 * ground rather than the `cover` crop every other slot on this site uses — a key fob cropped to
 * fill a square is unidentifiable, which defeats the whole section.
 *
 * Each item names a catalog slot (`image: "ford-key-focus"`). Per catalog-image.mjs EVERY caller
 * must survive an empty catalog, so an unpublished slot falls back to a key glyph. The fallback is
 * deliberately a glyph and not a borrowed photograph: the reference catalogue these models were
 * drawn from is a competitor's, and its product shots are its own copyrighted assets.
 *
 * Light section (page-content/section-gutenberg) so it reads as a continuation of the key-types
 * table it follows, rather than opening another dark band between two of them.
 */
function renderKeyModels(page) {
  const k = page.keyModels;
  if (!k?.items?.length) return "";
  const cards = k.items
    .map((m) => {
      // The per-card computed alt deliberately WINS over the catalog's own altHe here.
      //
      // `image` names a key TYPE, so three plates serve all eight cards. Letting the catalog's
      // altHe through would announce the same sentence on three consecutive cards — a screen
      // reader would hear one photograph described identically under three different model
      // headings. The computed string names the model, so all eight stay distinct while still
      // describing what is actually in the frame.
      //
      // (An earlier revision routed altHe through, which was correct while every card had its own
      // photograph. Sharing the plates inverted it.) An explicit `alt` on an item still wins.
      const media =
        catalogImg(imageRef(m.image), {
          sizes: SIZES.keyModel,
          fit: "contain",
          alt: m.alt ?? `${m.keyType} ל${m.model}`,
          className: "enrich-keycard__img",
        }) ?? `<span class="enrich-keycard__ph">${faIcon("key")}</span>`;
      const meta = [m.keyType, m.buttons].filter(Boolean).join(" · ");
      return `<li class="enrich-keycard">
      <div class="enrich-keycard__media">${media}</div>
      <div class="enrich-keycard__body">
        <h3 class="enrich-keycard__title">${esc(m.model)}</h3>
        ${m.years ? `<p class="enrich-keycard__years">${esc(m.years)}</p>` : ""}
        ${meta ? `<p class="enrich-keycard__meta">${esc(meta)}</p>` : ""}
        <p class="enrich-keycard__note">${esc(m.note)}</p>
      </div>
    </li>`;
    })
    .join("\n");
  const heading = k.heading || `דגמי מפתחות ${page.brand ?? ""} שאנחנו משכפלים`.trim();
  const foot = k.outro
    ? `<div class="enrich-keygrid__foot">
      <p>${esc(k.outro)}</p>
      <a class="btn-link btn-green" href="tel:${PHONE_TEL}" data-cta="keymodels-call">${SVG_PHONE}${PHONE}</a>
    </div>`
    : "";
  return `<section class="page-content section-gutenberg enrich-keymodels"><div class="container">
    <div class="post-content">
      <h2 class="wp-block-heading">${esc(heading)}</h2>
      ${k.intro ? `<p>${esc(k.intro)}</p>` : ""}
    </div>
    <ul class="enrich-keygrid${[2, 3, 5, 6].includes(k.items.length) ? ` enrich-keygrid--n${k.items.length}` : ""}">${cards}</ul>
    ${foot}
  </div></section>`;
}

/** "When you need this service" — scenario cards (advantages grid). */
function renderScenarios(page) {
  if (!page.scenarios?.length) return "";
  const items = page.scenarios
    .map(
      (s) => `<div class="grid-item">
      <div class="grid-item-top"><div class="icon">${faIcon(s.icon || "exclamation-triangle")}</div><h3>${esc(s.title)}</h3></div>
      <div class="description"><p>${esc(s.text)}</p></div>
    </div>`,
    )
    .join("\n");
  return advGrid(
    "מתי תזדקקו לשירות",
    "מקרים נפוצים",
    "כמה מהמצבים השכיחים שבהם הלקוחות שלנו פונים אלינו.",
    items,
    "enrich-cols-4",
  );
}

/** Long-form guides: accent headings, optional callout box / 2-column text,
 *  checklist bullets, and subsections rendered as a responsive card grid. */
function renderGuides(page) {
  if (!page.guides?.length) return "";
  const list = (items) =>
    `<ul class="enrich-checklist">${items.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;
  const blocks = page.guides
    .map((g) => {
      const inner = [`<h2 class="wp-block-heading">${esc(g.heading)}</h2>`];
      if (g.paragraphs?.length) {
        const ps = paras(g.paragraphs);
        inner.push(g.columns ? `<div class="enrich-2col">${ps}</div>` : ps);
      }
      if (g.bullets?.length) inner.push(list(g.bullets));
      if (g.subsections?.length) {
        const cards = g.subsections
          .map(
            (sub) =>
              `<div class="enrich-subcard"><h3>${esc(sub.heading)}</h3>${paras(sub.paragraphs)}${sub.bullets?.length ? list(sub.bullets) : ""}</div>`,
          )
          .join("");
        inner.push(`<div class="enrich-subgrid">${cards}</div>`);
      }
      const content = inner.join("\n");
      return g.box
        ? `<div class="enrich-callout">${content}</div>`
        : `<div class="enrich-guide-block">${content}</div>`;
    })
    .join("\n");
  return `<section class="page-content section-gutenberg enrich-guide"><div class="container"><div class="post-content">${blocks}</div></div></section>`;
}

/** "By the numbers" stat counters (advantages grid, large accent number). */
function renderStats(page) {
  const authored = Boolean(page.stats?.length);
  const stats = authored ? page.stats : DEFAULT_STATS;
  const items = stats
    .map(
      (s) => `<div class="grid-item enrich-stat">
      <div class="grid-item-top"><div class="icon">${faIcon(s.icon || "check-circle")}</div><h3 class="enrich-stat__num">${esc(s.value)}</h3></div>
      <div class="description"><p>${esc(s.label)}</p></div>
    </div>`,
    )
    .join("\n");
  // "במספרים" only when the page actually authored numbers. The claim-free fallback is a
  // service-scope strip, not a metrics brag, and must not be captioned as one.
  return advGrid(
    "למה אנחנו",
    authored ? "במספרים" : "בקצרה",
    "",
    items,
    "enrich-cols-4 enrich-stats",
  );
}

/** "Areas we serve" — harvested section-areas markup, links to location pages. */
function renderAreas(page) {
  if (!page.areas?.length) return "";
  const items = page.areas
    .map(
      (a) =>
        `<li><a href="${a.href}" class="location-item"><span class="icon">${SVG_PIN}</span><span class="caption">${esc(a.label)}</span></a></li>`,
    )
    .join("\n");
  return `<section class="section-areas"><div class="container">
    <h2>אזורי השירות שלנו</h2>
    <ul class="location-list">${items}</ul>
  </div></section>`;
}

/** Assemble the full inner HTML for <div class="content-blocks">. */
export function renderContentBlocks(page) {
  return [
    renderHero(page),
    renderPageContent(page),
    renderProcess(page),
    renderSpecsTable(page),
    renderKeyModels(page),
    renderScenarios(page),
    renderGuides(page),
    renderAdvantages(page),
    renderStats(page),
    renderFaq(page),
    renderServicesList(page),
    renderAreas(page),
    renderMarquee(),
    renderForm(page),
  ].join("\n");
}
