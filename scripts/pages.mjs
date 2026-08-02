/**
 * Curates the page set: prunes the WordPress demo content the source install shipped, then
 * generates the pages the source linked to but never had (every one of them was a 404 on the
 * live site and showed up in the QA broken-link report):
 *
 *   /contact/                     header + nav-side + calculator CTA "הזמינו פגישה"
 *   /privacy-policy/              footer menu "מדיניות פרטיות"
 *   /accessibility-statement/     footer menu "הצהרת נגישות"
 *   /sitemap/                     footer menu "מפת אתר"
 *   /services/                    inner-page breadcrumb "שירותים"
 *   /services/תיקון-דלתות/        services drop-down (column 2)
 *   /services/החלפת-מנעולים/      services drop-down (column 2)
 *
 * Each page reuses a real snapshot page as its chrome (header / nav / footer / floated
 * elements) and only swaps <main>, so it is styled by the vendored gogo theme CSS and the
 * replayed theme jQuery exactly like a scraped page. The two `services` pages are shells:
 * scripts/enrich.mjs replaces their <main> from content/enriched/<id>.mjs like any other
 * service page — this script only has to make them exist so the manifest/enrich step sees them.
 *
 * Idempotent: every generated page carries `generated: true` and is rebuilt from scratch on
 * each run. Runs after scripts/transform.mjs and before scripts/build-manifest.mjs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import he from "he";
import { parse } from "node-html-parser";
import { esc, renderHero, renderForm } from "../lib/enrich/render.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "content", "site.json");
const ORIGIN = "https://3locksmiths.co.il";
const CHROME_SOURCE_ID = 119; // a plain inner page — its header carries no "current page" state

const manifest = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf8"));
const PHONE = manifest.contact.phoneDisplay;
const PHONE_TEL = manifest.contact.phoneE164;
const EMAIL = manifest.contact.email;
const BRAND = manifest.brandName;
const HOURS = "א׳–ו׳: 8:00–18:00 | שבת: 8:00–17:00";
// Last review date of the legal/accessibility copy. Bump when the text is revised.
const LEGAL_UPDATED = "2 באוגוסט 2026";

// ---- markup helpers (gogo theme classes, same vocabulary as lib/enrich/render.mjs) ----
const P = (arr) => arr.map((t) => `<p>${t}</p>`).join("\n");
const UL = (arr) => `<ul class="enrich-checklist">${arr.map((t) => `<li>${t}</li>`).join("")}</ul>`;
const H2 = (t) => `<h2 class="wp-block-heading">${esc(t)}</h2>`;
const H3 = (t) => `<h3>${esc(t)}</h3>`;

/** Gutenberg-style prose section (same wrapper renderPageContent/renderGuides use). */
const prose = (blocks, extraClass = "") =>
  `<section class="page-content section-gutenberg ${extraClass}"><div class="container"><div class="post-content">
    ${blocks.join("\n")}
  </div></div></section>`;

/** Icon-card grid (same wrapper renderScenarios uses). */
const cardGrid = (caption, h2, intro, cards) => `<section class="section section-advantages enrich-cols-4"><div class="container">
    ${caption ? `<p class="section-caption"><span>${esc(caption)}</span></p>` : ""}
    <h2>${esc(h2)}</h2>
    ${intro ? `<div class="text text-top"><p>${esc(intro)}</p></div>` : ""}
    <div class="grid-wrap">${cards.map((c) => `<div class="grid-item">
      <div class="grid-item-top"><div class="icon"><i class="fas fa-${c.icon}" aria-hidden="true"></i></div>${H3(c.title)}</div>
      <div class="description"><p>${c.html}</p></div>
    </div>`).join("\n")}</div>
  </div></section>`;

/** One titled group inside an s-services-list band (styled in app/enrich.css). */
const linkList = (heading, links) => `<div class="column-serv enrich-linkgroup">
    <h3 class="enrich-linkgroup__title">${esc(heading)}</h3>
    <div class="offer-list">${links.map((l) =>
      `<a href="${l.href}" class="service-item"><span class="caption">${esc(l.label)}</span></a>`).join("\n")}</div>
  </div>`;

const linkSection = (id, h2, groups) => `<section id="${id}" class="s-services-list"><div class="container">
    <h2>${esc(h2)}</h2>
    <div class="rows">${groups.map((g) => linkList(g.heading, g.links)).join("\n")}</div>
  </div></section>`;

// ---- page bodies ----------------------------------------------------------
const hero = (keyword, h1, tagline) => renderHero({ kind: "core", keyword, hero: { h1, tagline } });

function contactBody() {
  return [
    hero(
      "צור קשר",
      "צור קשר – שלושה מנעולנים",
      "זמינים בטלפון, בוואטסאפ ובטופס. מגיעים אליכם בפריסה ארצית, כולל קריאות דחופות.",
    ),
    cardGrid("דרכי התקשרות", "איך ליצור איתנו קשר", "בחרו את הדרך הנוחה לכם – נחזור אליכם במהירות עם מענה מקצועי ומחיר ברור מראש.", [
      { icon: "phone-alt", title: "טלפון", html: `הדרך המהירה ביותר, במיוחד בקריאה דחופה: <a href="tel:${PHONE_TEL}" data-cta="content-call">${esc(PHONE)}</a>` },
      { icon: "comment-dots", title: "וואטסאפ", html: `שלחו תיאור קצר ותמונה של המנעול או הדלת: <a href="https://wa.me/${manifest.contact.whatsappE164.replace("+", "")}" target="_blank" rel="noopener">${esc(PHONE)}</a>` },
      { icon: "envelope", title: "אימייל", html: `לפניות שאינן דחופות ולהצעות מחיר: <a href="mailto:${EMAIL}">${esc(EMAIL)}</a>` },
      { icon: "clock", title: "שעות פעילות", html: `${esc(HOURS)}. לקריאות חירום אנו זמינים גם מחוץ לשעות אלה.` },
    ]),
    prose([
      H2("מה כדאי להכין לפני הפנייה"),
      P([
        "כדי שנוכל למסור לכם מחיר מדויק וזמן הגעה ריאלי כבר בשיחה הראשונה, כמה פרטים עוזרים לנו מאוד:",
      ]),
      UL([
        "<strong>מיקום</strong> – עיר ורחוב, וכן אם מדובר בבניין, בחניון או ברכב בצד הדרך.",
        "<strong>סוג השירות</strong> – פתיחת דלת, החלפת מנעול, שכפול מפתח לרכב או תקלה אחרת.",
        "<strong>פרטי הרכב</strong> (לשירותי רכב) – יצרן, דגם ושנת ייצור, וכן האם קיים מפתח נוסף.",
        "<strong>סוג המנעול או הדלת</strong> (לשירותי בית) – רב בריח, מולטילוק, דלת פלדלת או דלת ממ״ד.",
        "<strong>מסמכים</strong> – רישיון רכב או הוכחת בעלות/מגורים, שנדרשים לפני ביצוע העבודה.",
      ]),
      H2("אזורי השירות שלנו"),
      P([
        `${esc(BRAND)} פועלים בפריסה ארצית עם ניידות המצוידות בכל הציוד הנדרש לביצוע העבודה במקום – מתל אביב והמרכז, דרך חיפה והקריות והשרון, ועד ירושלים, השפלה והדרום. אין צורך בגרירה או בהגעה למעבדה.`,
      ]),
      `<p><a class="btn-link btn-green" href="tel:${PHONE_TEL}" data-cta="content-call">${esc(PHONE)}</a></p>`,
    ]),
    renderForm({
      keyword: "צור קשר",
      cta: {
        heading: "השאירו פרטים ונחזור אליכם",
        body: "מלאו את הטופס ונחזור אליכם עם מענה מקצועי, זמן הגעה מוערך ומחיר ברור מראש – ללא התחייבות.",
      },
    }),
  ].join("\n");
}

function privacyBody() {
  return [
    hero(
      "מדיניות פרטיות",
      "מדיניות פרטיות",
      `כיצד ${BRAND} אוספים, משתמשים ושומרים על המידע שנמסר באתר.`,
    ),
    prose([
      P([`<em>עודכן לאחרונה: ${esc(LEGAL_UPDATED)}</em>`]),
      H2("כללי"),
      P([
        `${esc(BRAND)} (להלן: "אנחנו" או "החברה") מכבדים את פרטיות המשתמשים באתר ${esc(ORIGIN.replace("https://", ""))} (להלן: "האתר"). מדיניות זו מתארת אילו נתונים נאספים באתר, לאילו מטרות נעשה בהם שימוש וכיצד ניתן לממש את הזכויות הקבועות בחוק הגנת הפרטיות, התשמ״א-1981 ובתקנותיו.`,
        "השימוש באתר מהווה הסכמה לתנאי מדיניות זו. אם אינכם מסכימים לתנאים, אנא הימנעו משימוש באתר.",
      ]),
      H2("איזה מידע נאסף"),
      UL([
        "<strong>מידע שאתם מוסרים ביוזמתכם</strong> – שם, כתובת דוא״ל ותוכן ההודעה שאתם ממלאים בטופס יצירת הקשר, וכן פרטים שתמסרו בשיחת טלפון או בהודעת וואטסאפ (למשל מיקום, סוג הרכב או סוג המנעול).",
        "<strong>מידע טכני הנאסף אוטומטית</strong> – כתובת IP, סוג הדפדפן והמכשיר, העמודים שנצפו, משך השהייה באתר והעמוד שממנו הגעתם. מידע זה נאסף בצורה סטטיסטית ואינו מזהה אתכם אישית.",
      ]),
      H2("המטרות שלשמן נעשה שימוש במידע"),
      UL([
        "יצירת קשר חוזר ומתן מענה לפנייה, כולל מסירת הצעת מחיר ותיאום הגעה.",
        "אספקת השירות בפועל ותיעודו, לרבות מילוי חובות חשבונאיות ומשפטיות החלות עלינו.",
        "שיפור האתר, התוכן והשירות באמצעות ניתוח סטטיסטי של דפוסי השימוש.",
        "מניעת שימוש לרעה, הונאה וספאם.",
      ]),
      H2("מסירת מידע לצדדים שלישיים"),
      P([
        "איננו מוכרים ואיננו משכירים את המידע שלכם. מידע נמסר לצדדים שלישיים רק במידה הנדרשת לצורך תפעול האתר והשירות, ובכלל זה:",
      ]),
      UL([
        "<strong>Web3Forms</strong> – שירות חיצוני המעביר את תוכן טופס יצירת הקשר לתיבת הדוא״ל שלנו.",
        "<strong>Google Analytics / Google Tag Manager</strong> – שירותי מדידה וניתוח תנועה של Google, הפועלים באמצעות קובצי Cookie.",
        "<strong>רשויות מוסמכות</strong> – ככל שנידרש לכך על פי דין, צו שיפוטי או לצורך הגנה על זכויותינו.",
      ]),
      H2("קובצי Cookie"),
      P([
        "האתר עושה שימוש בקובצי Cookie – קבצי טקסט קטנים הנשמרים במכשיר שלכם – לצורך תפעול תקין של האתר ולצורך מדידה סטטיסטית. ניתן לחסום או למחוק קובצי Cookie דרך הגדרות הדפדפן; חסימה עלולה לפגוע בחלק מהפונקציונליות של האתר.",
      ]),
      H2("אבטחת מידע ושמירתו"),
      P([
        "האתר מוגן בתעודת SSL והמידע מועבר בתקשורת מוצפנת. אנו נוקטים באמצעי אבטחה סבירים ומקובלים כדי להגן על המידע מפני גישה, שימוש או גילוי בלתי מורשים, אך אין באפשרותנו להבטיח חסינות מוחלטת. המידע נשמר למשך הזמן הנדרש למטרות שלשמן נאסף ולמילוי חובות שבדין, ולאחר מכן נמחק או מוסתר.",
      ]),
      H2("הזכויות שלכם"),
      P([
        "על פי חוק הגנת הפרטיות, התשמ״א-1981, אתם רשאים לעיין במידע שנאסף עליכם, לבקש את תיקונו אם אינו נכון, שלם או מדויק, ולבקש את מחיקתו. כמו כן תוכלו לבקש בכל עת להסיר את פרטיכם מרשימת הדיוור. לפניות בנושא זה:",
      ]),
      UL([
        `דוא״ל: <a href="mailto:${EMAIL}">${esc(EMAIL)}</a>`,
        `טלפון: <a href="tel:${PHONE_TEL}">${esc(PHONE)}</a>`,
      ]),
      H2("קישורים לאתרים חיצוניים"),
      P([
        "באתר עשויים להופיע קישורים לאתרים של צדדים שלישיים. מדיניות פרטיות זו אינה חלה עליהם, ואיננו אחראים לתוכנם או לאופן שבו הם אוספים מידע.",
      ]),
      H2("שינויים במדיניות"),
      P([
        "אנו רשאים לעדכן מדיניות זו מעת לעת. הנוסח המחייב הוא הנוסח המפורסם בעמוד זה, ותאריך העדכון האחרון מופיע בראשו.",
      ]),
    ], "enrich-guide"),
  ].join("\n");
}

function accessibilityBody() {
  return [
    hero(
      "הצהרת נגישות",
      "הצהרת נגישות",
      `${BRAND} פועלים להנגיש את האתר והשירות לכלל הלקוחות, לרבות אנשים עם מוגבלות.`,
    ),
    prose([
      P([`<em>עודכן לאחרונה: ${esc(LEGAL_UPDATED)}</em>`]),
      H2("המחויבות שלנו לנגישות"),
      P([
        `${esc(BRAND)} רואים חשיבות רבה במתן שירות שוויוני ונגיש לכלל הציבור, ופועלים בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, התשנ״ח-1998 ולתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע״ג-2013.`,
        "אתר זה הונגש במטרה לעמוד בדרישות תקן ישראלי 5568 ברמת AA, המבוסס על הנחיות WCAG 2.0 של ארגון W3C.",
      ]),
      H2("התאמות הנגישות שבוצעו באתר"),
      UL([
        "מבנה כותרות היררכי ותקין (H1–H3) בכל עמודי האתר, המאפשר ניווט יעיל בקורא מסך.",
        "האתר בנוי בעברית ובכיוון ימין-לשמאל (RTL) עם הגדרת שפת מסמך תקינה.",
        "ניווט מלא באמצעות מקלדת, כולל מעבר בין קישורים, תפריטים ושדות טופס.",
        "טקסט חלופי לתמונות בעלות משמעות, ותיוג נגיש לרכיבים גרפיים ולטפסים.",
        "ניגודיות צבעים מספקת בין הטקסט לרקע וגופנים ברורים לקריאה.",
        "תצוגה מותאמת (רספונסיבית) למחשב, לטאבלט ולנייד, המאפשרת הגדלת תצוגה ללא אובדן תוכן.",
        "טופס יצירת קשר עם תוויות מזוהות ואפשרות לפנייה חלופית בטלפון, בוואטסאפ ובדוא״ל.",
      ]),
      H2("נגישות השירות"),
      P([
        "השירות שלנו ניתן בשטח, בבית הלקוח או במקום הימצאות הרכב, ולכן אינו כרוך בהגעה למשרד. אנו מקבלים פניות בטלפון, בהודעת טקסט ובוואטסאפ ובדוא״ל, כדי לאפשר בחירת ערוץ הפנייה הנוח ביותר. ניתן לבקש מאיתנו הסבר מפורט יותר על מהלך העבודה, על העלות ועל משך הביצוע לפני תחילת השירות.",
      ]),
      H2("מגבלות ידועות"),
      P([
        "למרות מאמצינו להנגיש את כל רכיבי האתר, ייתכן שיימצאו בו חלקים שטרם הונגשו במלואם – בין היתר תכנים או רכיבים המסופקים על ידי צד שלישי. אנו ממשיכים לשפר את נגישות האתר באופן שוטף. אם נתקלתם בקושי, נשמח לשמוע ולטפל בו.",
      ]),
      H2("פניות בנושא נגישות"),
      P([
        "אם נתקלתם בבעיית נגישות באתר או בשירות, או שיש לכם הצעה לשיפור, נשמח שתפנו אלינו. נשתדל לטפל בפנייה ולתת מענה בהקדם האפשרי:",
      ]),
      UL([
        `טלפון: <a href="tel:${PHONE_TEL}" data-cta="content-call">${esc(PHONE)}</a>`,
        `דוא״ל: <a href="mailto:${EMAIL}">${esc(EMAIL)}</a>`,
        `טופס מקוון: <a href="/contact/">עמוד יצירת הקשר</a>`,
      ]),
      P([
        "בפנייתכם אנא פרטו את העמוד שבו נתקלתם בבעיה, את מהות הקושי ואת אמצעי העזר שבו אתם משתמשים (למשל קורא מסך או דפדפן מסוים) – פרטים אלה יסייעו לנו לאתר ולתקן את התקלה במהירות.",
      ]),
    ], "enrich-guide"),
  ].join("\n");
}

function servicesIndexBody(groups) {
  return [
    hero(
      "שירותים",
      "שירותי מנעולנות – רכב, בית ודלתות",
      "כל שירותי המנעולנות שאנו מספקים בפריסה ארצית, בשטח וללא צורך בגרירה או בהגעה למעבדה.",
    ),
    prose([
      H2("השירותים של שלושה מנעולנים"),
      P([
        `${esc(BRAND)} מספקים מענה מלא לשני עולמות – מנעולנות רכב ומנעולנות בית ודלתות. הניידות שלנו מצוידות בכל הציוד הנדרש לחיתוך, קידוד והחלפה במקום, כך שרוב הקריאות נסגרות בביקור אחד. בחרו את השירות המבוקש כדי לקרוא על התהליך, על משך הביצוע ועל טווח המחירים.`,
      ]),
    ]),
    linkSection("services", "כל השירותים", groups),
    renderForm({
      keyword: "שירותי מנעולנות",
      cta: {
        heading: "לא בטוחים איזה שירות אתם צריכים? דברו איתנו",
        body: "תארו לנו את התקלה ונכוון אתכם לפתרון הנכון, עם הערכת מחיר וזמן הגעה עוד לפני היציאה לדרך.",
      },
    }),
  ].join("\n");
}

function sitemapBody(groups) {
  return [
    hero(
      "מפת אתר",
      "מפת אתר",
      "כל עמודי האתר במקום אחד – שירותים, אזורי שירות ומידע על החברה.",
    ),
    linkSection("sitemap", "כל עמודי האתר", groups),
  ].join("\n");
}

// WordPress demo content that shipped with the source install — no business content and
// indexable dead weight. scripts/scrape.mjs no longer captures these; this prunes them from a
// snapshot taken before that change.
const PRUNE_PATHS = new Set(["/hello-world/", "/sample-page/"]);

// The homepage's "המאמרים האחרונים שלנו" band, whose only card was the "Hello world!" demo post
// — English boilerplate naming an unrelated domain. The site has no other posts, so the band has
// nothing left to show and goes with them.
const PRUNE_SELECTORS = [".s-latest-posts"];

// ---- page assembly --------------------------------------------------------
const site = JSON.parse(readFileSync(FILE, "utf8"));

// Drop pages from a previous run so this script is repeatable, plus the WordPress demo posts.
const pruned = site.pages.filter((p) => PRUNE_PATHS.has(p.path)).length;
site.pages = site.pages.filter((p) => !p.generated && !PRUNE_PATHS.has(p.path));

// Strip the sections that only existed to show that demo content.
let prunedSections = 0;
for (const p of site.pages) {
  const root = parse(p.bodyHtml, {
    blockTextElements: { script: true, style: true, noscript: true, pre: true },
  });
  let changed = false;
  for (const sel of PRUNE_SELECTORS) {
    for (const node of root.querySelectorAll(sel)) {
      node.remove();
      prunedSections++;
      changed = true;
    }
  }
  if (changed) p.bodyHtml = root.toString();
}

const chrome = site.pages.find((p) => p.id === CHROME_SOURCE_ID);
if (!chrome) throw new Error(`pages: chrome source page ${CHROME_SOURCE_ID} missing from site.json`);

const encPath = (segments) =>
  "/" + segments.map((s) => encodeURIComponent(s).replace(/%[0-9A-F]{2}/g, (m) => m.toLowerCase())).join("/") + "/";

/** Wrap a <main> body in the shared theme chrome cloned from `chrome`. */
function withChrome(innerHtml) {
  const root = parse(chrome.bodyHtml, {
    blockTextElements: { script: true, style: true, noscript: true, pre: true },
  });
  const main = root.querySelector("main");
  if (!main) throw new Error("pages: chrome source page has no <main>");
  main.removeAttribute("data-rocket-location-hash");
  main.removeAttribute("data-enriched");
  main.setAttribute("class", "page-template-builder");
  main.set_content(`<div class="content-blocks">${innerHtml}</div>`);
  return root.toString();
}

function makePage({ id, title, segments, seo, body }) {
  const path = encPath(segments);
  return {
    id,
    generated: true,
    title,
    slug: segments[segments.length - 1],
    path,
    segments,
    isFront: false,
    bodyClass: `rtl wp-singular page-template-default page page-id-${id} wp-theme-gogo`,
    seo: { ...seo, canonical: `${ORIGIN}${path}` },
    jsonLd: [],
    scripts: chrome.scripts,
    bodyHtml: withChrome(body),
  };
}

// -- link groups for the /services/ index and the /sitemap/ page --
// Titles are decoded by scripts/enrich.mjs, which runs later — decode here too (e.g. פיג&#8217;ו).
const label = (p) => he.decode(p.title || "");
const href = (p) => "/" + p.segments.join("/") + "/";
const byPrefix = (prefix) => site.pages.filter((p) => p.path.startsWith(prefix));

// Ordered by the source's services drop-down, then everything else alphabetically.
const CAR_SLUGS = ["מנעולן-רכב", "שכפול-מפתח-לרכב", "שחזור-מפתח-לרכב", "שכפול-שלט-לרכב", "קודן-לרכב"];
const HOME_SLUGS = ["מנעולן-לבית", "תיקון-דלתות", "דלת-פלדלת", "דלת-ממד", "מנעול-רב-בריח", "החלפת-מנעולים", "מולטילוק"];

// ---- the two missing service pages (shells; enrich.mjs fills them in) ----
const NEW_SERVICES = [
  {
    id: 9101,
    slug: "תיקון-דלתות",
    title: "תיקון דלתות",
    h1: "תיקון דלתות – פתרון מהיר לדלת שנתקעה או ירדה מהציר",
    tagline: "דלת שלא נסגרת, ידית שבורה או צילינדר תקוע – אנו מתקנים במקום, בלי להחליף את הדלת.",
    description:
      "תיקון דלתות בפריסה ארצית: דלת שלא נסגרת, ידית שבורה, צילינדר תקוע ודלת שירדה מהציר. תיקון בשטח ביום העבודה, עם אחריות מלאה. חייגו 055-6601006.",
  },
  {
    id: 9102,
    slug: "החלפת-מנעולים",
    title: "החלפת מנעולים",
    h1: "החלפת מנעולים – שדרוג אבטחה מהיר לבית ולעסק",
    tagline: "מעבר לדירה, מפתח שאבד או מנעול שנשחק – מחליפים צילינדר או מנעול שלם באותו ביקור.",
    description:
      "החלפת מנעולים וצילינדרים לבית ולעסק: החלפה מהירה בשטח לאחר אובדן מפתח, מעבר דירה או פריצה, כולל שדרוג אבטחה ואחריות מלאה. חייגו 055-6601006.",
  },
];

const created = [];
for (const s of NEW_SERVICES) {
  created.push(
    makePage({
      id: s.id,
      title: s.title,
      segments: ["services", s.slug],
      seo: { title: `${s.title} | ${BRAND}`, description: s.description },
      // Placeholder body — scripts/enrich.mjs rebuilds <main> from content/enriched/<id>.mjs.
      body: [hero(s.title, s.h1, s.tagline), renderForm({ keyword: s.title, cta: {} })].join("\n"),
    }),
  );
}
site.pages.push(...created);

// -- now that the new services exist, build the grouped link lists --
const services = byPrefix("/services/");
const pick = (slugs) => slugs.map((s) => services.find((p) => p.slug === s)).filter(Boolean);
const carServices = pick(CAR_SLUGS);
const homeServices = pick(HOME_SLUGS);
const grouped = new Set([...carServices, ...homeServices]);
const brandServices = services.filter((p) => !grouped.has(p));

const serviceGroups = [
  { heading: "מנעולן רכב", links: carServices.map((p) => ({ label: label(p), href: href(p) })) },
  { heading: "מנעולן בית ודלתות", links: homeServices.map((p) => ({ label: label(p), href: href(p) })) },
  { heading: "שכפול מפתח לפי יצרן", links: brandServices.map((p) => ({ label: label(p), href: href(p) })) },
];

const CORE_PATHS = ["/", "/מנעולן-רכב/", "/מנעולן-לבית/", "/מחירון/", "/אזורי-שירות/", "/אודותינו/"];
const corePages = CORE_PATHS.map((path) => {
  if (path === "/") return { label: "עמוד הבית", href: "/" };
  const p = site.pages.find((x) => href(x) === path);
  return p ? { label: label(p), href: path } : null;
}).filter(Boolean);

const sitemapGroups = [
  {
    heading: "עמודים ראשיים",
    links: [
      ...corePages,
      { label: "שירותים", href: "/services/" },
      { label: "צור קשר", href: "/contact/" },
      { label: "מדיניות פרטיות", href: "/privacy-policy/" },
      { label: "הצהרת נגישות", href: "/accessibility-statement/" },
    ],
  },
  ...serviceGroups,
  {
    heading: "אזורי שירות",
    links: byPrefix("/locations/").map((p) => ({ label: label(p), href: href(p) })),
  },
];

// ---- the utility pages ----------------------------------------------------
site.pages.push(
  makePage({
    id: 9001,
    title: "צור קשר",
    segments: ["contact"],
    seo: {
      title: `צור קשר – מנעולן זמין 24/7 בפריסה ארצית | ${BRAND}`,
      description: `צריכים מנעולן עכשיו? התקשרו ל-${PHONE}, שלחו וואטסאפ או מלאו את הטופס. ${BRAND} – שירות מהיר לרכב ולבית בפריסה ארצית, עם מחיר ברור מראש.`,
    },
    body: contactBody(),
  }),
  makePage({
    id: 9002,
    title: "מדיניות פרטיות",
    segments: ["privacy-policy"],
    seo: {
      title: `מדיניות פרטיות | ${BRAND}`,
      description: `מדיניות הפרטיות של ${BRAND}: איזה מידע נאסף באתר, לאילו מטרות נעשה בו שימוש, שימוש בקובצי Cookie והזכויות שלכם לפי חוק הגנת הפרטיות.`,
    },
    body: privacyBody(),
  }),
  makePage({
    id: 9003,
    title: "הצהרת נגישות",
    segments: ["accessibility-statement"],
    seo: {
      title: `הצהרת נגישות | ${BRAND}`,
      description: `הצהרת הנגישות של ${BRAND}: התאמות הנגישות שבוצעו באתר לפי תקן ישראלי 5568 ברמת AA, נגישות השירות ופרטי פנייה בנושא נגישות.`,
    },
    body: accessibilityBody(),
  }),
  makePage({
    id: 9004,
    title: "מפת אתר",
    segments: ["sitemap"],
    seo: {
      title: `מפת אתר | ${BRAND}`,
      description: `מפת האתר של ${BRAND}: כל עמודי השירותים, אזורי השירות ועמודי המידע של האתר במקום אחד.`,
    },
    body: sitemapBody(sitemapGroups),
  }),
  makePage({
    id: 9005,
    title: "שירותים",
    segments: ["services"],
    seo: {
      title: `שירותי מנעולנות לרכב ולבית – פריסה ארצית | ${BRAND}`,
      description: `כל שירותי המנעולנות של ${BRAND}: שכפול ושחזור מפתחות לרכב, קודן, פתיחת דלתות, החלפת מנעולים ותיקון דלתות – בשטח, בפריסה ארצית.`,
    },
    body: servicesIndexBody(serviceGroups),
  }),
);

// ---- assertions -----------------------------------------------------------
const problems = [];
const generated = site.pages.filter((p) => p.generated);
const paths = new Set();
for (const p of site.pages) {
  if (paths.has(p.path)) problems.push(`duplicate path ${decodeURIComponent(p.path)}`);
  paths.add(p.path);
}
for (const p of generated) {
  const h1 = (p.bodyHtml.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) problems.push(`${decodeURIComponent(p.path)}: expected 1 <h1>, found ${h1}`);
  if (!p.seo.title || !p.seo.description) problems.push(`${decodeURIComponent(p.path)}: missing seo title/description`);
}

writeFileSync(FILE, JSON.stringify(site, null, 2), "utf8");
console.log(`pages: generated ${generated.length} page(s) → ${generated.map((p) => decodeURIComponent(p.path)).join(", ")}`);
if (pruned || prunedSections) {
  console.log(
    `pages: pruned ${pruned} WordPress demo page(s) (${[...PRUNE_PATHS].join(", ")})` +
      ` and ${prunedSections} section(s) (${PRUNE_SELECTORS.join(", ")}).`,
  );
}
if (problems.length) {
  console.error(`\nPAGE PROBLEMS (${problems.length}):`);
  for (const p of problems) console.error("  ! " + p);
  process.exit(1);
}
