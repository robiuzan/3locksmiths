/**
 * Shape of an authored page in `content/enriched/<id>.mjs` (each file `export default` this).
 * Documentation/type-checking only — the data is plain `.mjs` consumed by scripts/enrich.mjs
 * at build time (the Next app renders the resulting site.json, not these modules).
 */
export type PageKind = "service" | "brand-key" | "location" | "core" | "guide";

export interface RelatedLink {
  label: string;
  href: string; // existing route path, e.g. "/services/שכפול-מפתח-מאזדה/"
}

export interface FeatureCard {
  title: string;
  text: string;
}

export interface PricingRow {
  service: string;
  price: string; // pre-formatted, e.g. "200 – 350 ₪"
}

export interface FaqItem {
  q: string;
  a: string;
}

// --- value-add sections (all optional; renderers skip when absent) ---
export interface ProcessStep {
  title: string;
  text: string;
  time?: string;
}

export interface SpecsTable {
  caption?: string;
  intro?: string;
  columns: string[];
  rows: string[][];
}

export interface ScenarioCard {
  title: string;
  text: string;
  icon?: string; // Font Awesome 5 name without the "fa-" prefix, e.g. "key", "wrench"
}

export interface GuideSubsection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  subsections?: GuideSubsection[];
  box?: boolean; // render as an accent-tinted callout box
  columns?: boolean; // render paragraphs in 2 columns (desktop)
}

/**
 * One key/remote variant on a brand page's model grid.
 *
 * Presentational only — no Product or Offer JSON-LD is emitted from these, and the card carries
 * no price: the page already publishes its ranges once, in `pricing` and `specsTable`, and
 * repeating them per model invited eight more numbers to keep in sync for no reader benefit.
 */
export interface KeyModelCard {
  model: string; // "פורד פוקוס"
  years?: string; // "2011–2018" — its own text run, so bidi resolves it LTR inside RTL copy
  keyType: string; // "מפתח מתקפל עם שלט"
  buttons?: string; // "3 לחצנים"
  note: string; // ONE short sentence: what the owner sees, not a parts-catalogue spec
  // A catalog gallery name: a per-model photograph "key-<brand>-<model>" (business-facts §D.15),
  // or one of the nine key-type plates (TYPE_PLATES in catalog-image.mjs, קיה and פורד only).
  // A per-model name is written by scripts/attach-key-images.mjs, never by hand.
  // Unpublished → key-glyph placeholder.
  image?: string;
  // The Hebrew alt the card renders, written next to `image` by scripts/attach-key-images.mjs.
  // Absent → `${keyType} ל${model}`. The catalog's own altHe/alt is never used on a card.
  alt?: string;
}

/**
 * "What to check before you choose a locksmith" (Phase 3 GEO pattern). Items state only practices
 * docs/business-facts.md confirms (§D.13) or checks the reader can make; never a credential.
 * `links` are page ids — scripts/enrich.mjs resolves each to { label, href } from the manifest and
 * fails the build on an unknown id — or an explicit RelatedLink for an exceptional anchor.
 */
export interface Checklist {
  heading: string; // a question, e.g. "מה חשוב לבדוק לפני שמזמינים שכפול מפתח לרכב?"
  intro?: string;
  items: string[]; // at least 4 on a page marked done (scripts/check-answer-block.mjs)
  links?: Array<number | RelatedLink>;
}

export interface StatItem {
  value: string;
  label: string;
  icon?: string; // Font Awesome 5 name without the "fa-" prefix
}

export interface AreaItem {
  label: string;
  href: string;
}

/** One entry in the family hub. `current` marks the page being rendered (shown as text). */
export interface HubLink extends RelatedLink {
  current?: boolean;
}

/**
 * The "שכפול מפתח" family hub — set by scripts/enrich.mjs withDerivedLinks from the manifest's
 * `family` key; never authored. A module may write `family: false` to opt its page out.
 */
export interface FamilyHub {
  role: "parent" | "child";
  parent: RelatedLink; // page 95, /services/שכפול-מפתח-לרכב/
  brands: HubLink[]; // all brand pages, code-point order
  locations: HubLink[]; // one page per city, code-point order
}

export interface EnrichedPage {
  id: number; // matches SitePage.id in content/site.json
  kind: PageKind;
  keyword: string; // primary keyword == page title (decoded)
  brand?: string; // brand-key pages
  city?: string; // location pages → schema areaServed
  areaKind?: "region"; // the place is a region, not a city (קריות) → AdministrativeArea in schema
  // Optional heading overrides for the price table and the process band (render.mjs).
  pricingHeading?: string;
  processHeading?: string;
  processIntro?: string;

  seo: { title: string; description: string };
  hero: { h1: string; tagline: string };
  intro: { heading: string; paragraphs: string[]; outro?: string[] };
  pricing: PricingRow[];
  advantages?: { caption?: string; intro?: string; features?: FeatureCard[] };
  faq: { subtitle?: string; items: FaqItem[] };
  // Omit to derive it from content/enriched/_manifest.json (enrich.mjs withDerivedLinks): a
  // rotating window of siblings plus default services. Author it when relevance or geographic
  // adjacency matters (docs/content-standards.md §3.8).
  related?: { services: RelatedLink[]; locations: RelatedLink[] };
  cta: { heading: string; body?: string };

  // Guide pages (kind: "guide") — editorial content under /מדריכים/. Drive Article schema.
  datePublished?: string; // ISO date
  dateModified?: string; // ISO date
  authorName?: string; // 🔶 a REAL named person only — never invent a byline

  // Optional value-add sections (see render.mjs). Absent → section skipped.
  process?: ProcessStep[];
  specsTable?: SpecsTable;
  scenarios?: ScenarioCard[];
  guides?: GuideSection[];
  checklist?: Checklist;
  stats?: StatItem[];
  areas?: AreaItem[];
  /** Set by withDerivedLinks when `areas` was not authored (a rotating window, not geography). */
  areasDerived?: boolean;
  /** Derived family hub; `false` opts the page out. */
  family?: FamilyHub | false;

  // Per-model key grid (brand-key pages). Absent → section skipped.
  keyModels?: {
    heading?: string;
    intro?: string;
    items: KeyModelCard[];
    outro?: string; // closing line above the call CTA — never write the phone number here
  };
}
