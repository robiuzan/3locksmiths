/**
 * Enrich build step (runs after scrape + transform). For every authored page in
 * content/enriched/<id>.mjs it renders the gogo-classed content (lib/enrich/render.mjs),
 * replaces that page's <main> body, sets seo.title/description, and builds the JSON-LD
 * schema (BreadcrumbList + Service + FAQPage; LocalBusiness on the homepage). Also decodes
 * every page.title (fixes the Peugeot &#8217; entity). Idempotent: always rebuilds <main>
 * from the authored data, so `npm run snapshot` is safely repeatable.
 *
 * Run: node scripts/enrich.mjs   (chained into `npm run snapshot`)
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import he from "he";
import { renderContentBlocks } from "../lib/enrich/render.mjs";
import { heroRefFor, imageRef, originalUrl } from "../lib/enrich/catalog-image.mjs";
import { parse } from "node-html-parser";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "content", "site.json");
const ENRICHED = join(ROOT, "content", "enriched");
const ORIGIN = "https://3locksmiths.co.il";
const LB_ID = `${ORIGIN}/#LocalBusiness`;
// The header logo the scraped chrome already serves (public/wp-content/uploads — vendored, never
// edited). Percent-encoded so the schema URL is plain ASCII, as Google's examples are.
const HEADER_LOGO = encodeURI(
  `${ORIGIN}/wp-content/uploads/2025/11/3-מנעולנים-לוגו.webp`,
);

// NAP for the LocalBusiness node comes from the manifest — never hardcoded (backlog §4.3).
// Values themselves change in the roster (Israeli services sites/roster/sites/3locksmiths.json).
const manifest = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf8"));

// `areaServed` for the LocalBusiness node. Derived from the location pages in the build manifest
// rather than hardcoded: this list used to be a literal of 15 cities and silently went stale the
// moment a location page was added, so the schema claimed a smaller service area than the site.
const PAGE_MANIFEST = JSON.parse(readFileSync(join(ENRICHED, "_manifest.json"), "utf8"));
const CITIES = [
  ...new Set(
    PAGE_MANIFEST.pages.filter((p) => p.kind === "location" && p.city).map((p) => p.city),
  ),
];

// Homepage (id 7) SEO. The WordPress source shipped the bare brand name as <title> (14 chars,
// under the 15-char floor) and no meta description at all, so both are set here — the homepage
// has no content/enriched/ module because its <main> is kept exactly as scraped.
const HOME_ID = 7;
// 🔶 confirm: the description used to claim "מנעולן מוסמך" and "מעל 25 שנות ניסיון" — both
// unverified (docs/business-facts.md §A.1, §A "credentials"). Restore only once sourced.
const HOME_SEO = {
  // 24/7 restored to the title 2026-08-30, now that the owner has confirmed it and the schema
  // publishes 00:00–23:59 all week (§D.3). It leads the title because after-hours availability
  // is the strongest differentiator this business has in the SERP — a lockout at 02:00 is the
  // highest-intent query in the trade, and the category leader has been claiming it unopposed.
  //
  // 2026-11-04 pivot (owner decision): the homepage leads with car-key duplication, but the
  // ranking page for "שכפול מפתח לרכב" stays /services/שכפול-מפתח-לרכב/ (id 95). So the head term
  // "מנעולן 24/7 לרכב ולבית" keeps first position and the keyword comes second — leading with it
  // would make the homepage a second page 95 for the same query. 57 code points, brand once.
  title: "מנעולן 24/7 לרכב ולבית – שכפול מפתח לרכב | שלושה מנעולנים",
  description: `שכפול מפתח לרכב בשטח, ליד הרכב: חיתוך, קידוד שבב, שלט ומפתח חכם, בלי גרירה למוסך. מנעולן 24/7 גם לבית – פתיחת דלת והחלפת מנעולים. חייגו ${manifest.contact.phoneDisplay} בכל שעה.`,
};

const site = JSON.parse(readFileSync(SITE, "utf8"));
const byId = new Map(site.pages.map((p) => [p.id, p]));

// --- Peugeot/entity fix: decode every page.title ---
for (const p of site.pages) p.title = he.decode(p.title || "");

// --- load authored modules ---
const files = readdirSync(ENRICHED).filter((f) => /^\d+\.mjs$/.test(f));
const enriched = [];
for (const f of files) {
  const mod = await import(pathToFileURL(join(ENRICHED, f)).href);
  if (mod.default && typeof mod.default.id === "number") enriched.push(mod.default);
  else console.warn(`  ! ${f}: missing default export with numeric id`);
}

// Service areas that are regions, not cities (a module sets `areaKind: "region"`). קריות is a
// cluster of towns around Haifa Bay; typing it as a schema.org City states something false about
// the place (docs/schema-graph.md §5, docs/keyword-map.md §6).
const REGIONS = new Set(
  enriched.filter((m) => m.areaKind === "region" && m.city).map((m) => m.city),
);
const placeType = (name) => (REGIONS.has(name) ? "AdministrativeArea" : "City");

/**
 * Fill `related` / `areas` from the build manifest when a module does not author them.
 *
 * WHY — until 2026-08-26 every module hand-wrote its related links as percent-encoded href
 * literals (a 40-character `%d7%…` string per link). That is both unreadable and the easiest way
 * in this repo to ship a link to a route that does not exist; `fix-links.mjs` fails the build on
 * exactly that, after the fact. scripts/build-manifest.mjs already computes `relatedServices` and
 * `relatedLocations` as ID lists, so the encoding can simply be looked up instead of retyped.
 *
 * Authored `related` still wins — the existing modules keep the link sets they were written with.
 * This is a fallback for modules that omit it, which is now the preferred way to author one.
 */
const MANIFEST_BY_ID = new Map(PAGE_MANIFEST.pages.map((p) => [p.id, p]));
const FAMILY = PAGE_MANIFEST.family ?? null;
// Manifest titles are the scraped WordPress titles with curly quotes folded to ASCII for
// matching (build-manifest.mjs dec()), so "שכפול מפתח פיג'ו" arrives with U+0027. A visible
// label must use גרש/גרשיים (CLAUDE.md §8), and check-typography.mjs only scans authored
// modules, so derived labels are the one place nothing else would catch it.
const hebrewPunct = (s) =>
  s.replace(/([א-ת])['’]/g, "$1׳").replace(/([א-ת])"(?=[א-ת])/g, "$1״");
const linkTo = (id) => {
  const row = MANIFEST_BY_ID.get(id);
  return row ? { label: hebrewPunct(row.title), href: row.path } : null;
};
function withDerivedLinks(data) {
  const row = MANIFEST_BY_ID.get(data.id);
  if (!row) return data;
  const out = { ...data };
  if (!out.related) {
    out.related = {
      services: (row.relatedServices || []).map(linkTo).filter(Boolean),
      locations: (row.relatedLocations || []).map(linkTo).filter(Boolean),
    };
  }
  // `areas` is the location-page "other cities we serve" band. Default it to the sibling
  // locations the manifest already picked, so a new city page links into the mesh for free.
  // `areasDerived` marks that default: it is a rotating window, not geography, so the family hub
  // never calls it "nearby" (renderFamilyHub shows the nearby line only for authored areas).
  if (!out.areas && out.kind === "location") {
    out.areas = (row.relatedLocations || []).map(linkTo).filter(Boolean);
    out.areasDerived = true;
  }
  // The "before you choose a locksmith" checklist (Phase 3) links to the pages that answer its
  // questions in full — the vetting guide, the cost guide, שחזור. Authored as page ids so a module
  // never types a percent-encoded href; an id that does not resolve fails the build, because a
  // checklist link that quietly disappears is a broken promise in the copy above it.
  if (out.checklist?.links?.length) {
    out.checklist = {
      ...out.checklist,
      links: out.checklist.links.map((l) => {
        if (typeof l !== "number") return l;
        const r = linkTo(l);
        if (!r)
          throw new Error(
            `enrich: checklist link ${l} on page ${data.id} is not in the manifest`,
          );
        return r;
      }),
    };
  }
  // The "שכפול מפתח" family hub (scripts/build-manifest.mjs `family`). Unlike `related`, an id that
  // does not resolve is a hard failure: a hub that silently loses a brand is the starvation this
  // block exists to end. `family: false` in a module opts a page out.
  if (row.inFamily && out.family !== false && FAMILY) {
    const entry = (id) => {
      const r = MANIFEST_BY_ID.get(id);
      if (!r) throw new Error(`enrich: family hub id ${id} is not in the manifest`);
      return {
        label: hebrewPunct(r.brand ?? r.city ?? r.title),
        href: r.path,
        current: id === data.id,
      };
    };
    const parent = MANIFEST_BY_ID.get(FAMILY.parent);
    if (!parent)
      throw new Error(`enrich: family parent ${FAMILY.parent} is not in the manifest`);
    out.family = {
      role: data.id === FAMILY.parent ? "parent" : "child",
      parent: { label: hebrewPunct(parent.title), href: parent.path },
      brands: FAMILY.brands.map(entry),
      locations: FAMILY.locations.map(entry),
    };
  }
  return out;
}

// --- schema builders ---
const J = (o) => JSON.stringify(o);
const abs = (page) => page.seo?.canonical || `${ORIGIN}${page.path}`;

function breadcrumbSchema(data, page) {
  const list = [{ name: "בית", item: `${ORIGIN}/` }];
  if (data.kind === "location")
    list.push({ name: "אזורי שירות", item: `${ORIGIN}/אזורי-שירות/` });
  else if (data.kind === "guide")
    list.push({ name: "מדריכים", item: `${ORIGIN}/מדריכים/` });
  else if (data.kind === "brand-key") {
    // A brand page sits under page 95 (2026-11-04): בית › שירותים › שכפול מפתח לרכב › <brand>.
    // The visible trail (lib/enrich/render.mjs crumbs) carries the same four levels.
    list.push({ name: "שירותים", item: `${ORIGIN}/services/` });
    if (data.family?.parent)
      list.push({
        name: data.family.parent.label,
        item: `${ORIGIN}${data.family.parent.href}`,
      });
  } else if (data.kind === "service")
    // Trailing slash (2026-11-04): /services 301s to /services/, and the visible crumb already
    // links the slashed form.
    list.push({ name: "שירותים", item: `${ORIGIN}/services/` });
  list.push({ name: data.keyword, item: abs(page) });
  return J({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: list.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.item,
    })),
  });
}

/**
 * Article for guide pages (/מדריכים/…). `author` is emitted ONLY when the module supplies a
 * real named person — docs/business-facts.md §A records that nobody is currently named on this
 * site, and a fabricated byline is a worse trust signal than an absent one. Publishing without
 * `author` is the deliberate choice until the owner supplies one.
 */
function articleSchema(data, page) {
  const o = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.seo?.title || data.keyword,
    description: data.seo?.description || "",
    mainEntityOfPage: { "@type": "WebPage", "@id": abs(page) },
    publisher: { "@id": LB_ID },
    inLanguage: "he-IL",
  };
  if (data.datePublished) o.datePublished = data.datePublished;
  if (data.dateModified) o.dateModified = data.dateModified;
  if (data.authorName) o.author = { "@type": "Person", name: data.authorName };
  // `image` is a recommended property for Article rich results and was absent entirely. Emitted
  // only when a catalog image exists, so it never points at borrowed stock we cannot vouch for.
  const img = catalogSchemaImage(data);
  if (img) o.image = img;
  return J(o);
}

/** The page's own catalog image, or null. Used only where schema.org treats `image` as optional. */
function catalogSchemaImage(data) {
  return originalUrl(heroRefFor(data) ?? imageRef("hero"));
}

function serviceSchema(data, page) {
  if (data.kind === "core") return null;
  return J({
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: data.keyword,
    name: data.keyword,
    description: data.seo?.description || "",
    provider: { "@id": LB_ID },
    // A service page is served where the business is: the same places as the LocalBusiness
    // node. It used to say { Country: "IL" } — the whole country, which the business does not
    // cover since 7 cities were withdrawn on 2026-09-02 (live audit 2026-11-04, business-facts §E).
    areaServed:
      data.kind === "location" && data.city
        ? { "@type": placeType(data.city), name: data.city }
        : CITIES.map((c) => ({ "@type": placeType(c), name: c })),
    url: abs(page),
  });
}

function howToSchema(data) {
  if (!data.process?.length) return null;
  // One image for the HowTo as a whole rather than a fake per-step image: we have one photograph
  // per bucket, and claiming a distinct picture of each step would be inventing evidence.
  const img = catalogSchemaImage(data);
  return J({
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: data.keyword,
    ...(img ? { image: img } : {}),
    step: data.process.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.text,
    })),
  });
}

function faqSchema(data) {
  if (!data.faq?.items?.length) return null;
  return J({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: `<p>${it.a}</p>` },
    })),
  });
}

/**
 * The business entity, emitted on EVERY enriched page — not just the homepage.
 *
 * WHY EVERY PAGE — `serviceSchema` sets `provider: {"@id": LB_ID}` and `articleSchema` sets
 * `publisher: {"@id": LB_ID}`, but until 2026-08-26 the node those pointed at existed only on
 * `/`. On all 60 other pages the reference dangled: a `Service` with a provider that resolves to
 * nothing on the page declaring it. Crawlers evaluate a page's structured data per page, so the
 * fix is to repeat the node, keyed by a stable `@id` so consumers de-duplicate it into one
 * entity. It costs well under a kilobyte per page.
 *
 * `address` is country-only ON PURPOSE. The street address (דרך שרה 25/2, זכרון יעקב 3092325) is
 * confirmed, but the owner chose 2026-10-13 to show it in the footer only and keep it out of the
 * structured data — the Business Profile hides it as a service-area listing (business-facts §C.1).
 * The spread below still reads the roster's `schema.address` should that decision change; never
 * invent one.
 * `sameAs` is spread in only when the manifest's array is non-empty: an empty array is noise, not
 * a signal. Since 2026-09-05 it carries the Google Business Profile (docs/business-facts.md §B.4),
 * so the guard is what keeps the node clean if a future site has nothing to point at — not a
 * statement that this one doesn't.
 */
/**
 * The business image for JSON-LD.
 *
 * Deliberately the PLAIN R2 URL, not a /cdn-cgi/image/ transform: a crawler wants one stable
 * canonical asset, and a transform URL bakes a width and a crop into what should be the original.
 * The markup gets the responsive variants; the graph gets the source.
 *
 * Order: hero slot -> OG card -> the legacy upload. The last of those is where it points today,
 * and it stops pointing there the moment anything is published to the catalog.
 */
function schemaImage(page) {
  const ref = (page ? heroRefFor(page) : null) ?? imageRef("hero") ?? imageRef("og");
  return originalUrl(ref) ?? `${ORIGIN}/wp-content/uploads/2025/04/157336036_m.jpg`;
}

/**
 * What the business does, for `knowsAbout` — the service pages' own titles, derived from the
 * manifest so a new service page is added here by itself. Strings, not invented Thing nodes.
 */
const SERVICE_TOPICS = [
  ...new Set(
    PAGE_MANIFEST.pages
      .filter((p) => p.kind === "service")
      .map((p) => hebrewPunct(p.title)),
  ),
];

function localBusinessSchema() {
  const sameAs = manifest.schema?.sameAs ?? [];
  // The Business Profile's Maps URL doubles as `hasMap`. Only a Google Maps URL qualifies.
  const map = sameAs.find((u) => /^https:\/\/www\.google\.com\/maps\//.test(u));
  // Entity fields added 2026-11-04, each from the roster or the owner and each omitted while
  // unset — an invented description or logo is worse than none (docs/business-facts.md §A):
  //   alternateName  the English brand, so "3 Locksmiths" resolves to the same entity;
  //   description    roster shortPitch / tagline — the owner's sentence, 2026-11-04;
  //   logo           the catalog's `logo` slot when Media Studio publishes one; until then the
  //                  header logo the site already serves. The owner supplied the logo on
  //                  2026-11-04 and it is byte-identical to that file (500×160, sha256 31855b40…).
  const description = manifest.shortPitch || manifest.tagline || null;
  const logo = originalUrl(imageRef("logo")) ?? HEADER_LOGO;
  return J({
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "Locksmith"],
    "@id": LB_ID,
    name: manifest.brandName,
    ...(manifest.brandNameEn ? { alternateName: manifest.brandNameEn } : {}),
    ...(description ? { description } : {}),
    url: `${ORIGIN}/`,
    ...(logo ? { logo } : {}),
    telephone: manifest.contact.phoneE164,
    email: manifest.contact.email,
    // Read from the manifest, never hardcoded. This was a literal pointing at
    // /wp-content/uploads/2025/04/157336036_m.jpg — a 0.96 MB stock photograph of a hand
    // unscrewing a COMPUTER POWER SUPPLY, published as this locksmith's business image on all
    // 106 routes. `schemaImage()` prefers the hero slot, then the OG card, and only falls back
    // to that upload while neither is published.
    image: schemaImage(),
    // Country-only by the owner's choice (2026-10-13, business-facts §C.1); the roster has no
    // schema.address. Adding one there is the only switch.
    address: {
      "@type": "PostalAddress",
      ...(manifest.schema?.address ?? {}),
      addressCountry: manifest.schema?.address?.addressCountry ?? "IL",
    },
    ...(sameAs.length ? { sameAs } : {}),
    ...(map ? { hasMap: map } : {}),
    knowsLanguage: "he",
    knowsAbout: SERVICE_TOPICS,
    priceRange: manifest.schema?.priceRange ?? "₪₪",
    // 24/7 — confirmed by the owner 2026-08-30 (docs/business-facts.md §D.3). Until then this
    // published 08:00–18:00 while parts of the copy claimed 24/7, so every page contradicted
    // itself in its own markup. Both halves now say the same thing.
    //
    // `00:00`–`23:59` is the schema.org convention for always-open; a single spec covering all
    // seven days is what Google reads as continuous availability.
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        opens: "00:00",
        closes: "23:59",
      },
    ],
    areaServed: CITIES.map((c) => ({ "@type": placeType(c), name: c })),
  });
}

/**
 * The site itself, on the homepage (2026-11-04). It replaces the scraped WordPress `Organization`
 * block, which declared a second, unconnected entity (`@id` "…#Organization" with no slash and an
 * empty `sameAs`) beside the LocalBusiness — two answers to "who is this" on the same page.
 */
function webSiteSchema() {
  return J({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${ORIGIN}/#website`,
    url: `${ORIGIN}/`,
    name: manifest.brandName,
    ...(manifest.brandNameEn ? { alternateName: manifest.brandNameEn } : {}),
    inLanguage: "he-IL",
    publisher: { "@id": LB_ID },
  });
}

// --- inject ---
let injected = 0;
const problems = [];
for (const raw of enriched) {
  const data = withDerivedLinks(raw);
  const page = byId.get(data.id);
  if (!page) {
    problems.push(`id ${data.id}: not in site.json`);
    continue;
  }

  const inner = renderContentBlocks(data);
  const root = parse(page.bodyHtml, {
    blockTextElements: { script: true, style: true, noscript: true, pre: true },
  });
  const main =
    root.querySelector("main.page-template-builder") || root.querySelector("main");
  if (!main) {
    problems.push(`id ${data.id}: no <main>`);
    continue;
  }
  main.setAttribute("data-enriched", "1");
  main.set_content(`<div class="content-blocks">${inner}</div>`);
  page.bodyHtml = root.toString();

  // SEO
  page.seo = page.seo || {};
  if (data.seo?.title) page.seo.title = data.seo.title;
  if (data.seo?.description) page.seo.description = data.seo.description;

  // schema. A guide is editorial, so it emits Article instead of Service.
  // localBusinessSchema() leads so the entity every other node references is declared first.
  page.jsonLd = [
    localBusinessSchema(),
    breadcrumbSchema(data, page),
    data.kind === "guide" ? articleSchema(data, page) : serviceSchema(data, page),
    howToSchema(data),
    faqSchema(data),
  ].filter(Boolean);

  // assertions
  const h1count = (page.bodyHtml.match(/<h1[\s>]/g) || []).length;
  if (h1count !== 1) problems.push(`id ${data.id}: expected 1 <h1>, found ${h1count}`);
  for (const s of page.jsonLd) {
    try {
      JSON.parse(s);
    } catch {
      problems.push(`id ${data.id}: invalid JSON-LD`);
    }
  }
  injected++;
}

// Homepage (id 7): set the missing title/description and prepend LocalBusiness to its schema.
const home = byId.get(HOME_ID);
if (home) {
  home.seo = { ...home.seo, ...HOME_SEO };
  // Drop our own previous LocalBusiness/WebSite (rebuilt below) and the scraped Organization
  // (see webSiteSchema); keep the rest — the FAQPage mirror of the accordion.
  const existing = (home.jsonLd || []).filter(
    (s) =>
      !s.includes('"@id":"' + LB_ID + '"') &&
      !s.includes('"@id":"' + ORIGIN + '/#website"') &&
      !s.includes("#Organization"),
  );
  home.jsonLd = [localBusinessSchema(), webSiteSchema(), ...existing];
} else {
  problems.push(`homepage id ${HOME_ID} not in site.json`);
}

// Generated pages with no module (the /services/ and /מדריכים/ hubs, /contact/, /sitemap/, the
// legal pages) point at the business with `isPartOf: {"@id": …#LocalBusiness}` but did not declare
// it, so the reference dangled — the same defect fixed for authored pages on 2026-08-26.
let lbAdded = 0;
for (const p of site.pages) {
  const blocks = p.jsonLd || [];
  const refers = blocks.some((s) => s.includes(`"@id":"${LB_ID}"`));
  const declares = blocks.some((s) => s.includes('"LocalBusiness"'));
  if (refers && !declares) {
    p.jsonLd = [localBusinessSchema(), ...blocks];
    lbAdded++;
  }
}

// --- validate EVERY JSON-LD block sitewide, including scraped pass-through blocks ---
// The WordPress scrape shipped blocks with raw control characters inside JSON strings
// (literal newlines), which fail JSON.parse — Google can't read them either (backlog §4.1).
// Repair by collapsing control chars to spaces (legal outside strings, the fix inside them),
// re-serialize minified; a block that still doesn't parse is dropped — a malformed block is
// worth strictly less than no block.
let repairedLd = 0;
let droppedLd = 0;
for (const p of site.pages) {
  p.jsonLd = (p.jsonLd || []).flatMap((s) => {
    try {
      JSON.parse(s);
      return [s];
    } catch {}
    const fixed = s.replace(/[\u0000-\u001f]+/g, " ");
    try {
      const clean = JSON.stringify(JSON.parse(fixed));
      repairedLd++;
      return [clean];
    } catch {
      droppedLd++;
      console.warn(
        `  ! id ${p.id} (${decodeURIComponent(p.path)}): dropped unparseable JSON-LD block`,
      );
      return [];
    }
  });
}

// --- Open Graph / Twitter card, on EVERY route ---
// The WordPress source emitted no OG tags at all, so extractSeo() found nothing and every one of
// the 106 routes shipped without og:image. Meanwhile site.config.json has carried a finished
// 1200x630 card at 3locksmiths/og.jpg that no code read. Every WhatsApp share of this site
// unfurled blank — on a business whose second conversion goal is WhatsApp.
//
// lib/content.ts:112 already maps seo.ogImage -> metadata.openGraph.images, so this is wiring
// existing data to an existing code path. Set on scraped pages too, not just authored ones.
const ogRef = imageRef("og");
const ogUrl = originalUrl(ogRef);
let ogSet = 0;
if (ogUrl) {
  for (const p of site.pages) {
    p.seo = p.seo || {};
    // Never clobber a page that already declares its own card.
    if (!p.seo.ogImage) {
      p.seo.ogImage = ogUrl;
      ogSet++;
    }
    p.seo.ogType = p.seo.ogType || (p.id === HOME_ID ? "website" : "article");
    p.seo.ogLocale = p.seo.ogLocale || "he_IL";
    // og:site_name (2026-11-04): share cards and some answer engines show it as the source name;
    // without it they fall back to the bare domain. lib/content.ts already maps the field.
    p.seo.ogSiteName = p.seo.ogSiteName || manifest.brandName;
    p.seo.ogUrl = p.seo.ogUrl || `${ORIGIN}${p.path}`;
    // summary_large_image needs an image to be worth anything, so it is set alongside one.
    p.seo.twitterCard = p.seo.twitterCard || "summary_large_image";
    p.seo.twitterImage = p.seo.twitterImage || ogUrl;
  }
}

writeFileSync(SITE, JSON.stringify(site, null, 2), "utf8");
console.log(
  `enrich: injected ${injected}/${enriched.length} pages, schema set, titles decoded, ` +
    `JSON-LD repaired ${repairedLd} / dropped ${droppedLd}, business node added to ${lbAdded} generated page(s).`,
);
console.log(
  ogUrl
    ? `enrich: og:image set on ${ogSet} page(s) -> ${ogUrl}`
    : `enrich: no og image in site.config.json images.og — og:image NOT set (run ops/sync-media.ps1)`,
);
if (problems.length) {
  console.error(`\nENRICH PROBLEMS (${problems.length}):`);
  for (const p of problems) console.error("  ! " + p);
  process.exit(1);
}
