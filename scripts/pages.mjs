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
const GUIDES_SEGMENT = "מדריכים"; // encPath() percent-encodes it
const CHROME_SOURCE_ID = 119; // a plain inner page — its header carries no "current page" state

const manifest = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf8"));
const PHONE = manifest.contact.phoneDisplay;
const PHONE_TEL = manifest.contact.phoneE164;
const EMAIL = manifest.contact.email;
const BRAND = manifest.brandName;
const HOURS = "זמינים 24/7, כל ימות השבוע";
// Last review date of the legal/accessibility copy. Bump when the text is revised.
const LEGAL_UPDATED = "2 באוגוסט 2026";

// ---- markup helpers (gogo theme classes, same vocabulary as lib/enrich/render.mjs) ----
const P = (arr) => arr.map((t) => `<p>${t}</p>`).join("\n");
const UL = (arr) =>
  `<ul class="enrich-checklist">${arr.map((t) => `<li>${t}</li>`).join("")}</ul>`;
const H2 = (t) => `<h2 class="wp-block-heading">${esc(t)}</h2>`;
const H3 = (t) => `<h3>${esc(t)}</h3>`;

/** Gutenberg-style prose section (same wrapper renderPageContent/renderGuides use). */
const prose = (blocks, extraClass = "") =>
  `<section class="page-content section-gutenberg ${extraClass}"><div class="container"><div class="post-content">
    ${blocks.join("\n")}
  </div></div></section>`;

/** Icon-card grid (same wrapper renderScenarios uses). */
const cardGrid = (
  caption,
  h2,
  intro,
  cards,
) => `<section class="section section-advantages enrich-cols-4"><div class="container">
    ${caption ? `<p class="section-caption"><span>${esc(caption)}</span></p>` : ""}
    <h2>${esc(h2)}</h2>
    ${intro ? `<div class="text text-top"><p>${esc(intro)}</p></div>` : ""}
    <div class="grid-wrap">${cards
      .map(
        (c) => `<div class="grid-item">
      <div class="grid-item-top"><div class="icon"><i class="fas fa-${c.icon}" aria-hidden="true"></i></div>${H3(c.title)}</div>
      <div class="description"><p>${c.html}</p></div>
    </div>`,
      )
      .join("\n")}</div>
  </div></section>`;

/** One titled group inside an s-services-list band (styled in app/enrich.css). */
const linkList = (heading, links) => `<div class="column-serv enrich-linkgroup">
    <h3 class="enrich-linkgroup__title">${esc(heading)}</h3>
    <div class="offer-list">${links
      .map(
        (l) =>
          `<a href="${l.href}" class="service-item"><span class="caption">${esc(l.label)}</span></a>`,
      )
      .join("\n")}</div>
  </div>`;

const linkSection = (
  id,
  h2,
  groups,
) => `<section id="${id}" class="s-services-list"><div class="container">
    <h2>${esc(h2)}</h2>
    <div class="rows">${groups.map((g) => linkList(g.heading, g.links)).join("\n")}</div>
  </div></section>`;

// ---- page bodies ----------------------------------------------------------
const hero = (keyword, h1, tagline) =>
  renderHero({ kind: "core", keyword, hero: { h1, tagline } });

function contactBody() {
  return [
    hero(
      "צור קשר",
      "צור קשר – שלושה מנעולנים",
      "זמינים בטלפון, בוואטסאפ ובטופס. מגיעים אליכם בפריסה ארצית, כולל קריאות דחופות.",
    ),
    cardGrid(
      "דרכי התקשרות",
      "איך ליצור איתנו קשר",
      "בחרו את הדרך הנוחה לכם – נחזור אליכם במהירות עם מענה מקצועי ומחיר ברור מראש.",
      [
        {
          icon: "phone-alt",
          title: "טלפון",
          html: `הדרך המהירה ביותר, במיוחד בקריאה דחופה: <a href="tel:${PHONE_TEL}" data-cta="content-call">${esc(PHONE)}</a>`,
        },
        {
          icon: "comment-dots",
          title: "וואטסאפ",
          html: `שלחו תיאור קצר ותמונה של המנעול או הדלת: <a href="https://wa.me/${manifest.contact.whatsappE164.replace("+", "")}" target="_blank" rel="noopener">${esc(PHONE)}</a>`,
        },
        {
          icon: "envelope",
          title: "אימייל",
          html: `לפניות שאינן דחופות ולהצעות מחיר: <a href="mailto:${EMAIL}">${esc(EMAIL)}</a>`,
        },
        {
          icon: "clock",
          title: "שעות פעילות",
          // The trailing "and for emergencies we are available outside those hours too" made
          // sense while HOURS read 08:00–18:00. With 24/7 confirmed it contradicted itself —
          // there are no hours to be outside of. Replaced rather than deleted so the card keeps
          // saying something useful.
          html: `${esc(HOURS)} – כולל לילות, שבתות וחגים. תמיד יענה אדם, גם בשעות הקטנות.`,
        },
      ],
    ),
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
    prose(
      [
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
      ],
      "enrich-guide",
    ),
  ].join("\n");
}

function accessibilityBody() {
  return [
    hero(
      "הצהרת נגישות",
      "הצהרת נגישות",
      `${BRAND} פועלים להנגיש את האתר והשירות לכלל הלקוחות, לרבות אנשים עם מוגבלות.`,
    ),
    prose(
      [
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
      ],
      "enrich-guide",
    ),
  ].join("\n");
}

/**
 * /מדריכים/ — the editorial hub index. Lists every guide page so each one has an inbound link
 * and the hub itself carries real prose rather than a bare list (docs/content-standards.md §1,
 * 350-word floor for index pages).
 */
function guidesIndexBody(guides) {
  return [
    hero(
      "מדריכים",
      "מדריכים – כל מה שכדאי לדעת על מפתחות ומנעולים",
      "תשובות מלאות לשאלות שאנחנו נשאלים הכי הרבה – מחירים, זמנים, סוגי מפתחות ומה עושים ברגע שנתקעתם.",
    ),
    prose([
      H2("המדריכים של שלושה מנעולנים"),
      P([
        `אספנו כאן את השאלות שחוזרות אצלנו בטלפון כמעט כל יום: כמה באמת עולה שכפול מפתח לרכב, מה עושים כשאבד המפתח היחיד, ומה ההבדל בין מפתח עם שבב למפתח חכם. כל מדריך נכתב כדי לענות על השאלה עד הסוף – עם טווחי מחירים, זמני ביצוע ומה משפיע עליהם – ולא כדי למכור לכם משהו.`,
        `המטרה פשוטה: שתגיעו לשיחה איתנו כשאתם כבר יודעים מה מגיע לכם, כמה זה אמור לעלות וכמה זמן זה אמור לקחת. אם אחרי הקריאה נשארה שאלה, אנחנו זמינים בטלפון ${esc(PHONE)} ונשמח לענות גם בלי שתזמינו שירות.`,
      ]),
    ]),
    linkSection("guides", "כל המדריכים", [
      {
        heading: "מדריכים",
        links: guides.map((g) => ({
          label: g.title,
          href: `/${GUIDES_SEGMENT}/${g.slug}/`,
        })),
      },
    ]),
    renderForm({
      keyword: "מנעולן",
      cta: {
        heading: "לא מצאתם תשובה? דברו איתנו",
        body: "תארו לנו את המצב ונאמר לכם מה צריך להיעשות, כמה זה עולה וכמה זמן זה לוקח – עוד לפני שיצאנו לדרך.",
      },
    }),
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
// `.s-feedback` — the theme's review carousel, added to this list 2026-08-26.
//
// It shipped the gogo demo's own testimonials, machine-translated into Hebrew, and they were
// LIVE on the production homepage: three fabricated reviews attributed to three fabricated
// customers ("חנה מלמד", "ג׳ורג׳יה אקרס", "ליליאנה פונס"), complete with star-rating markup —
// and the text was not even about locksmithing. It was translated from a US garage-gate
// company's sample content, so the homepage praised a gate opener and a technician named
// Andrew, and one line rendered as a mistranslation about costumes and Jesus.
//
// docs/business-facts.md §B: this business has zero collected reviews. Fabricated reviews are a
// Google policy violation and a consumer-protection exposure, not a content placeholder, so the
// whole band is removed rather than emptied. There is nothing here to keep: the section carried
// no links and no CTA. Restore a reviews section only when real, attributable reviews exist.
const PRUNE_SELECTORS = [".s-latest-posts", ".s-feedback"];

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
if (!chrome)
  throw new Error(`pages: chrome source page ${CHROME_SOURCE_ID} missing from site.json`);

const encPath = (segments) =>
  "/" +
  segments
    .map((s) => encodeURIComponent(s).replace(/%[0-9A-F]{2}/g, (m) => m.toLowerCase()))
    .join("/") +
  "/";

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

/**
 * BreadcrumbList + CollectionPage for a generated hub page (backlog §4.8 — nine real pages
 * emitted no schema at all). Authored pages get theirs from scripts/enrich.mjs; these
 * generated hubs have no module, so they need it here.
 */
function hubJsonLd({ name, segments, crumb, type = "CollectionPage" }) {
  const url = `${ORIGIN}${encPath(segments)}`;
  const trail = [{ name: "בית", item: `${ORIGIN}/` }];
  if (crumb) trail.push(crumb);
  trail.push({ name, item: url });
  return [
    JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: trail.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: c.item,
      })),
    }),
    JSON.stringify({
      "@context": "https://schema.org",
      "@type": type,
      name,
      url,
      isPartOf: { "@id": `${ORIGIN}/#LocalBusiness` },
      inLanguage: "he-IL",
    }),
  ];
}

function makePage({ id, title, segments, seo, body, jsonLd = [] }) {
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
    jsonLd,
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
const CAR_SLUGS = [
  "מנעולן-רכב",
  "שכפול-מפתח-לרכב",
  "שחזור-מפתח-לרכב",
  "שכפול-שלט-לרכב",
  "קודן-לרכב",
];
const HOME_SLUGS = [
  "מנעולן-לבית",
  "תיקון-דלתות",
  "דלת-פלדלת",
  "דלת-ממד",
  "מנעול-רב-בריח",
  "החלפת-מנעולים",
  "מולטילוק",
];

// ---- the two missing service pages (shells; enrich.mjs fills them in) ----
const NEW_SERVICES = [
  {
    id: 9101,
    slug: "תיקון-דלתות",
    title: "תיקון דלתות",
    h1: "תיקון דלתות – פתרון מהיר לדלת שנתקעה או ירדה מהציר",
    tagline:
      "דלת שלא נסגרת, ידית שבורה או צילינדר תקוע – אנו מתקנים במקום, בלי להחליף את הדלת.",
    description:
      "תיקון דלתות בפריסה ארצית: דלת שלא נסגרת, ידית שבורה, צילינדר תקוע ודלת שירדה מהציר. תיקון בשטח ביום העבודה, עם אחריות מלאה. חייגו 055-6601006.",
  },
  {
    id: 9102,
    slug: "החלפת-מנעולים",
    title: "החלפת מנעולים",
    h1: "החלפת מנעולים – שדרוג אבטחה מהיר לבית ולעסק",
    tagline:
      "מעבר לדירה, מפתח שאבד או מנעול שנשחק – מחליפים צילינדר או מנעול שלם באותו ביקור.",
    description:
      "החלפת מנעולים וצילינדרים לבית ולעסק: החלפה מהירה בשטח לאחר אובדן מפתח, מעבר דירה או פריצה, כולל שדרוג אבטחה ואחריות מלאה. חייגו 055-6601006.",
  },
];

// ---- the emergency / lockout cluster -------------------------------------
// Tier E in docs/keyword-universe.md — the single biggest coverage gap on the site and the
// highest-intent demand in the trade: someone standing next to a locked car or door who will
// call the first credible result. Shells; content/enriched/<id>.mjs supplies the copy.
//
// Only THREE pages, deliberately. "נעלתי מפתחות ברכב" is the same intent as "פתיחת רכב נעול"
// and "ננעלתי מחוץ לבית" the same as "פתיחת דלת נעולה" — giving each its own page would be a
// doorway cluster (docs/content-standards.md §2). Those phrasings are handled INSIDE the
// relevant page instead.
//
// "מנעולן 24 שעות" was deliberately NOT built until 2026-08-30, because it is purely an
// availability claim and availability was 🔶 unconfirmed while the schema said 08:00–18:00.
// The owner confirmed 24/7 on 2026-08-30 (docs/business-facts.md §D.3) and the schema now
// publishes 00:00–23:59 all week, so the page has a source and is built below.
const EMERGENCY = [
  {
    id: 9304,
    slug: "מנעולן-24-שעות",
    title: "מנעולן 24 שעות",
    h1: "מנעולן 24 שעות – מי עונה באמת בשתיים לפנות בוקר?",
    tagline:
      "נעילה לא בוחרת שעה. אנחנו זמינים בלילות, בשבתות ובחגים – מגיעים אליכם עם ניידת מצוידת.",
    description:
      "מנעולן 24 שעות ביממה לרכב ולבית – מענה בלילות, בשבתות ובחגים, פתיחה בשטח בלי נזק ומחיר שנמסר לפני היציאה. חייגו 055-6601006 בכל שעה.",
  },
  {
    id: 9301,
    slug: "פתיחת-רכב-נעול",
    title: "פתיחת רכב נעול",
    h1: "פתיחת רכב נעול – חילוץ מהיר בלי לשבור חלון",
    tagline:
      "מפתחות ננעלו בפנים או המנעול לא נפתח? מגיעים אליכם ופותחים את הרכב בלי לגרום נזק.",
    description:
      "פתיחת רכב נעול בשטח: חילוץ מפתחות שננעלו בתוך הרכב בלי לשבור חלון ובלי נזק לדלת, לכל סוגי הרכבים. חייגו 055-6601006 לפתיחה מהירה.",
  },
  {
    id: 9302,
    slug: "פתיחת-דלת-נעולה",
    title: "פתיחת דלת נעולה",
    h1: "פתיחת דלת נעולה – כניסה חזרה הביתה בלי לפרוץ",
    tagline:
      "ננעלתם מחוץ לבית או שהדלת לא נפתחת? פותחים את הדלת בשיטות עדינות, בלי להרוס את המנעול.",
    description:
      "פתיחת דלת נעולה לבית ולעסק: פתיחה עדינה בלי נזק לדלת ולמנעול, כולל דלתות פלדלת ומנעולים רב-נקודתיים. חייגו 055-6601006 לפתיחה מהירה.",
  },
  {
    id: 9303,
    slug: "מפתח-נשבר-במנעול",
    title: "מפתח נשבר במנעול",
    h1: "מפתח נשבר במנעול – חילוץ השבר והחזרת הדלת לפעולה",
    tagline:
      "חצי מפתח נשאר בתוך הצילינדר? מחלצים את השבר במקום ובודקים אם המנעול עדיין תקין.",
    description:
      "מפתח נשבר במנעול או בסוויץ׳ הרכב? חילוץ השבר בכלים ייעודיים בלי להרוס את הצילינדר, והכנת מפתח חלופי במקום. חייגו 055-6601006.",
  },
];

// ---- the קודן (immobiliser / code unit) silo -----------------------------
// The single largest coverage gap found in the 2026-08-26 competitor teardown: the category
// leader runs a hub plus seven sub-topics against this demand while we had one page. These are
// genuinely distinct jobs with different tools, prices and failure modes — not one intent split
// seven ways — so they do not trip the doorway rule in docs/content-standards.md §2.
//
// City variants of these (`קודן לרכב ב<עיר>`) are deliberately NOT built: that would be a
// 7 × 17 doorway matrix. Geography is handled by the /locations/ pages.
const KODAN = [
  {
    id: 9401,
    slug: "ניתוק-קודן-לרכב",
    title: "ניתוק קודן לרכב",
    h1: "ניתוק קודן לרכב – מתי זה נדרש ואיך זה מתבצע",
    tagline:
      "קודן שחוסם התנעה, נתקע או הותקן בעבר ואינו נחוץ עוד – מנתקים אותו נכון, בלי לפגוע במערכת החשמל.",
    description:
      "ניתוק קודן לרכב בשטח: מתי מותר לנתק, איך זה משפיע על הביטוח ועל ההתנעה, וכמה זה עולה. חייגו 055-6601006 לבדיקה וייעוץ.",
  },
  {
    id: 9402,
    slug: "התקנת-קודן-לרכב",
    title: "התקנת קודן לרכב",
    h1: "התקנת קודן לרכב – שכבת אבטחה נוספת מפני גניבה",
    tagline:
      "קודן מונע התנעה ללא הקשת קוד אישי. מתקינים בשטח, מסתירים את היחידה ומדריכים על השימוש.",
    description:
      "התקנת קודן לרכב בשטח – בחירת דגם, מיקום מוסתר, חיווט נכון והדרכה מלאה. קודן מונע התנעה ללא קוד. חייגו 055-6601006.",
  },
  {
    id: 9403,
    slug: "תיקון-קודן-לרכב",
    title: "תיקון קודן לרכב",
    h1: "תיקון קודן לרכב – כשהקודן לא מגיב או חוסם התנעה",
    tagline:
      "לחצנים שלא מגיבים, קוד שלא מתקבל או קודן שמנתק את הרכב באמצע – מאבחנים ומתקנים במקום.",
    description:
      "תיקון קודן לרכב בשטח: אבחון תקלות חיווט, לוח מקשים ויחידת בקרה, תיקון במקום והחזרת הרכב לפעולה. חייגו 055-6601006.",
  },
  {
    id: 9404,
    slug: "קודן-מצפצף-ברכב",
    title: "קודן מצפצף ברכב",
    h1: "הקודן מצפצף ברכב – מה הצפצוף אומר ואיך מפסיקים אותו",
    tagline:
      "צפצוף מחזורי הוא כמעט תמיד סימן מוסכם – סוללה חלשה, מצב תקלה או מצב שירות. מאתרים את הסיבה ומטפלים.",
    description:
      "קודן שמצפצף ברכב – מה המשמעות של כל סוג צפצוף, מה אפשר לבדוק לבד ומתי צריך מנעולן. חייגו 055-6601006.",
  },
  {
    id: 9405,
    slug: "החלפת-לוח-מקשים-לקודן",
    title: "החלפת לוח מקשים לקודן",
    h1: "החלפת לוח מקשים לקודן – כשהספרות נשחקו או לא מגיבות",
    tagline:
      "לוח מקשים שנשחק, נדבק או הפסיק להגיב מוחלף במקום, בלי להחליף את יחידת הקודן כולה.",
    description:
      "החלפת לוח מקשים לקודן רכב: מקשים שחוקים או תקועים מוחלפים בשטח תוך שמירה על הקוד הקיים. חייגו 055-6601006.",
  },
  {
    id: 9406,
    slug: "סוגי-קודן-לרכב",
    title: "סוגי קודן לרכב",
    h1: "סוגי קודן לרכב – איזה קודן מתאים לרכב שלכם?",
    tagline:
      "קודן מקשים, קודן נסתר, קודן משולב אימובילייזר – השוואה מלאה של רמות האבטחה והעלות.",
    description:
      "סוגי קודן לרכב בהשוואה: קודן מקשים, קודן נסתר וקודן משולב, רמות אבטחה, התאמה לדגם וטווחי מחיר. חייגו 055-6601006.",
  },
  {
    id: 9407,
    slug: "קודן-לרכב-ננעל",
    title: "קודן לרכב ננעל",
    h1: "הקודן ננעל ולא מאפשר להתניע – מה עושים עכשיו",
    tagline:
      "קוד שגוי חוזר נועל את המערכת להגנה. מגיעים, משחררים את הנעילה ומאפסים את הקוד במקום.",
    description:
      "הקודן ננעל אחרי הקשות שגויות והרכב לא מתניע? שחרור הנעילה ואיפוס הקוד בשטח, בלי גרירה. חייגו 055-6601006.",
  },
];

// ---- brand key pages the fleet was missing --------------------------------
// Chosen by Israeli market share and by the competitor gap: Nissan alone is a top-five seller
// here and had no page at all. Slugs stay ASCII-Hebrew (no גרש) to match the 18 existing brand
// slugs — `שכפול-מפתח-פיגו` for פיג׳ו is the established precedent.
const NEW_BRANDS = [
  { id: 9501, slug: "שכפול-מפתח-ניסאן", title: "שכפול מפתח ניסאן", brand: "ניסאן" },
  { id: 9502, slug: "שכפול-מפתח-אאודי", title: "שכפול מפתח אאודי", brand: "אאודי" },
  { id: 9503, slug: "שכפול-מפתח-גיפ", title: "שכפול מפתח ג׳יפ", brand: "ג׳יפ" },
  { id: 9504, slug: "שכפול-מפתח-סיאט", title: "שכפול מפתח סיאט", brand: "סיאט" },
  { id: 9505, slug: "שכפול-מפתח-דאצה", title: "שכפול מפתח דאצ׳יה", brand: "דאצ׳יה" },
  { id: 9506, slug: "שכפול-מפתח-גילי", title: "שכפול מפתח ג׳ילי", brand: "ג׳ילי" },
  {
    id: 9507,
    slug: "שכפול-מפתח-בי-וואי-די",
    title: "שכפול מפתח לרכבי BYD",
    brand: "BYD",
  },
  // Added 2026-08-30 — the last brands the category leader covered and we did not. With these,
  // brand coverage is complete against keyforme.co.il at 32 pages to their 31.
  //
  // These are longer-tail than the 2026-08-26 batch: smaller Israeli parc, so lower volume but
  // also far less competition, and an owner searching for a Daihatsu key has nowhere good to go.
  // Slugs stay ASCII-Hebrew with no גרש, matching the 25 existing brand slugs.
  {
    id: 9508,
    slug: "שכפול-מפתח-מיני-קופר",
    title: "שכפול מפתח מיני קופר",
    brand: "מיני קופר",
  },
  { id: 9509, slug: "שכפול-מפתח-קרייזלר", title: "שכפול מפתח קרייזלר", brand: "קרייזלר" },
  { id: 9510, slug: "שכפול-מפתח-קאדילק", title: "שכפול מפתח קאדילק", brand: "קאדילק" },
  { id: 9511, slug: "שכפול-מפתח-איסוזו", title: "שכפול מפתח איסוזו", brand: "איסוזו" },
  { id: 9512, slug: "שכפול-מפתח-דייהטסו", title: "שכפול מפתח דייהטסו", brand: "דייהטסו" },
  { id: 9513, slug: "שכפול-מפתח-ביואיק", title: "שכפול מפתח ביואיק", brand: "ביואיק" },
  {
    id: 9514,
    slug: "שכפול-מפתח-אינפיניטי",
    title: "שכפול מפתח אינפיניטי",
    brand: "אינפיניטי",
  },
];

const created = [];
for (const s of [...EMERGENCY, ...KODAN]) {
  created.push(
    makePage({
      id: s.id,
      title: s.title,
      segments: ["services", s.slug],
      seo: { title: `${s.title} | ${BRAND}`, description: s.description },
      body: [
        hero(s.title, s.h1, s.tagline),
        renderForm({ keyword: s.title, cta: {} }),
      ].join("\n"),
    }),
  );
}

for (const s of NEW_SERVICES) {
  created.push(
    makePage({
      id: s.id,
      title: s.title,
      segments: ["services", s.slug],
      seo: { title: `${s.title} | ${BRAND}`, description: s.description },
      // Placeholder body — scripts/enrich.mjs rebuilds <main> from content/enriched/<id>.mjs.
      body: [
        hero(s.title, s.h1, s.tagline),
        renderForm({ keyword: s.title, cta: {} }),
      ].join("\n"),
    }),
  );
}
for (const b of NEW_BRANDS) {
  created.push(
    makePage({
      id: b.id,
      title: b.title,
      segments: ["services", b.slug],
      seo: {
        title: `${b.title} | ${BRAND}`,
        description: `${b.title} וקידוד בשטח לכל הדגמים – מפתח עם שבב, מפתח חכם ושלט. מחיר ברור מראש ואחריות מלאה. חייגו ${PHONE}.`,
      },
      body: [
        hero(
          b.title,
          `${b.title} – קידוד והעתקה מקצועית לכל דגם`,
          `מפתח נוסף, מפתח שאבד או שלט שהפסיק לעבוד לרכב ${b.brand} – מגיעים אליכם ומקודדים במקום.`,
        ),
        renderForm({ keyword: b.title, cta: {} }),
      ].join("\n"),
    }),
  );
}

// ---- location pages the fleet was missing ---------------------------------
// The 15 highest-value cities from the 2026-08-26 gap analysis, by population and vehicle
// density. Each one is a SHELL; content/enriched/<id>.mjs must supply genuinely local copy —
// the doorway bar in docs/content-standards.md §2 applies, and the existing 17 pass it. A city
// page that only swaps a name into a template is the one thing this site must not start doing.
const NEW_LOCATIONS = [
  { id: 9601, slug: "שכפול-מפתח-אשדוד", city: "אשדוד" },
  { id: 9602, slug: "שכפול-מפתח-הרצליה", city: "הרצליה" },
  { id: 9603, slug: "שכפול-מפתח-רחובות", city: "רחובות" },
  { id: 9604, slug: "שכפול-מפתח-בני-ברק", city: "בני ברק" },
  { id: 9605, slug: "שכפול-מפתח-מודיעין", city: "מודיעין" },
  { id: 9606, slug: "שכפול-מפתח-בית-שמש", city: "בית שמש" },
  { id: 9607, slug: "שכפול-מפתח-אשקלון", city: "אשקלון" },
  { id: 9608, slug: "שכפול-מפתח-רמת-השרון", city: "רמת השרון" },
  { id: 9609, slug: "שכפול-מפתח-הוד-השרון", city: "הוד השרון" },
  { id: 9610, slug: "שכפול-מפתח-לוד", city: "לוד" },
  { id: 9611, slug: "שכפול-מפתח-נס-ציונה", city: "נס ציונה" },
  { id: 9612, slug: "שכפול-מפתח-ראש-העין", city: "ראש העין" },
  { id: 9613, slug: "שכפול-מפתח-כרמיאל", city: "כרמיאל" },
  { id: 9614, slug: "שכפול-מפתח-עכו", city: "עכו" },
  { id: 9615, slug: "שכפול-מפתח-עפולה", city: "עפולה" },
];

for (const l of NEW_LOCATIONS) {
  const title = `שכפול מפתח ב${l.city}`;
  created.push(
    makePage({
      id: l.id,
      title,
      segments: ["locations", l.slug],
      seo: {
        title: `${title} – מנעולן זמין בעיר | ${BRAND}`,
        description: `${title} בשטח ובזמינות מהירה – שכפול וקידוד מפתח רכב אצלכם, במחיר הוגן ועם אחריות. חייגו ${PHONE} לשירות מהיר ב${l.city}.`,
      },
      body: [
        hero(
          title,
          `${title} – שירות מנעולן מהיר ומקצועי`,
          `אבד או נשבר לכם מפתח ב${l.city}? ניידת מגיעה אליכם ומבצעת שכפול וקידוד בשטח.`,
        ),
        renderForm({ keyword: title, cta: {} }),
      ].join("\n"),
    }),
  );
}

site.pages.push(...created);

// -- now that the new services exist, build the grouped link lists --
const services = byPrefix("/services/");
const pick = (slugs) =>
  slugs.map((s) => services.find((p) => p.slug === s)).filter(Boolean);
const carServices = pick(CAR_SLUGS);
const homeServices = pick(HOME_SLUGS);
const emergencyServices = pick(EMERGENCY.map((s) => s.slug));
const kodanServices = pick(KODAN.map((s) => s.slug));
// Anything left over is a brand key page. This is a fallback, so every non-brand service MUST be
// claimed by one of the lists above — until 2026-08-26 the three emergency pages were not, and
// "פתיחת רכב נעול" was filed on the services hub under "שכפול מפתח לפי יצרן".
const grouped = new Set([
  ...carServices,
  ...homeServices,
  ...emergencyServices,
  ...kodanServices,
]);
const brandServices = services.filter((p) => !grouped.has(p));

const serviceGroups = [
  {
    heading: "מנעולן רכב",
    links: carServices.map((p) => ({ label: label(p), href: href(p) })),
  },
  {
    heading: "חירום ופתיחת נעילות",
    links: emergencyServices.map((p) => ({ label: label(p), href: href(p) })),
  },
  {
    heading: "קודן לרכב",
    links: kodanServices.map((p) => ({ label: label(p), href: href(p) })),
  },
  {
    heading: "מנעולן בית ודלתות",
    links: homeServices.map((p) => ({ label: label(p), href: href(p) })),
  },
  {
    heading: "שכפול מפתח לפי יצרן",
    links: brandServices.map((p) => ({ label: label(p), href: href(p) })),
  },
];

const CORE_PATHS = [
  "/",
  "/מנעולן-רכב/",
  "/מנעולן-לבית/",
  "/מחירון/",
  "/אזורי-שירות/",
  "/אודותינו/",
];
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
    jsonLd: hubJsonLd({ name: "צור קשר", segments: ["contact"], type: "ContactPage" }),
    seo: {
      // 24/7 restored 2026-08-30 — owner-confirmed, and the schema now publishes 00:00–23:59
      // all week (docs/business-facts.md §D.3). On the contact page it is the single most
      // useful thing the snippet can say: the question a visitor has here is "will anyone
      // actually answer".
      title: `צור קשר – מנעולן 24/7 לרכב ולבית | ${BRAND}`,
      description: `צריכים מנעולן עכשיו? התקשרו ל-${PHONE}, שלחו וואטסאפ או מלאו את הטופס. ${BRAND} – מענה 24 שעות ביממה לרכב ולבית, עם מחיר ברור מראש.`,
    },
    body: contactBody(),
  }),
  makePage({
    id: 9002,
    title: "מדיניות פרטיות",
    segments: ["privacy-policy"],
    jsonLd: hubJsonLd({
      name: "מדיניות פרטיות",
      segments: ["privacy-policy"],
      type: "WebPage",
    }),
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
    jsonLd: hubJsonLd({
      name: "הצהרת נגישות",
      segments: ["accessibility-statement"],
      type: "WebPage",
    }),
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
    jsonLd: hubJsonLd({ name: "מפת אתר", segments: ["sitemap"], type: "CollectionPage" }),
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
    jsonLd: hubJsonLd({ name: "שירותים", segments: ["services"] }),
    seo: {
      title: `שירותי מנעולנות לרכב ולבית – פריסה ארצית | ${BRAND}`,
      description: `כל שירותי המנעולנות של ${BRAND}: שכפול ושחזור מפתחות לרכב, קודן, פתיחת דלתות, החלפת מנעולים ותיקון דלתות – בשטח, בפריסה ארצית.`,
    },
    body: servicesIndexBody(serviceGroups),
  }),
);

// ---- the guides hub + guide pages -----------------------------------------
// Editorial content under /מדריכים/ — the topical-authority and AEO surface the site had none
// of (backlog §3.6). Each guide is a SHELL here; content/enriched/<id>.mjs supplies the copy
// and scripts/enrich.mjs fills <main>, exactly like the two generated service pages above.
//
// Hebrew path is fine: these are rendered by the ASCII catch-all app/[...slug]/, with the
// Hebrew living in the data. (Creating an actual app/מדריכים/ DIRECTORY would break the Next 16
// exporter — see app/thank-you/page.tsx.)
const GUIDES = [
  {
    id: 9201,
    slug: "כמה-עולה-שכפול-מפתח-לרכב",
    title: "כמה עולה שכפול מפתח לרכב",
  },
  {
    id: 9202,
    slug: "אבד-המפתח-היחיד-לרכב",
    title: "אבד המפתח היחיד לרכב – מה עושים",
  },
  {
    id: 9203,
    slug: "מפתח-עם-שבב-או-מפתח-חכם",
    title: "מפתח עם שבב או מפתח חכם – מה ההבדל",
  },
  // Added 2026-08-26. The competitor teardown found the category leader running ~30 editorial
  // articles against our 3 — the largest remaining breadth gap after the service and location
  // work. These are chosen to support the money pages rather than to chase volume: each one
  // answers a question that precedes a purchase decision and links into the relevant service.
  {
    id: 9204,
    slug: "איך-לבחור-מנעולן-אמין",
    title: "איך לבחור מנעולן אמין – מה לבדוק לפני שמזמינים",
  },
  {
    id: 9205,
    slug: "ננעלתי-מחוץ-לבית",
    title: "ננעלתי מחוץ לבית – מה עושים ומה לא לעשות",
  },
  {
    id: 9206,
    slug: "כמה-עולה-החלפת-צילינדר",
    title: "כמה עולה החלפת צילינדר – מחירון והסבר",
  },
  {
    id: 9207,
    slug: "מפתח-מקורי-או-חליפי",
    title: "מפתח מקורי או חליפי לרכב – מה עדיף",
  },
  {
    id: 9208,
    slug: "איך-עובד-אימובילייזר",
    title: "איך עובד אימובילייזר ברכב – הסבר מלא",
  },
  {
    id: 9209,
    slug: "סוגי-צילינדרים-לדלת",
    title: "סוגי צילינדרים לדלת – השוואה ובחירה",
  },
  {
    id: 9210,
    slug: "תחזוקת-מפתח-חכם",
    title: "תחזוקת מפתח חכם – סוללה, טווח ותקלות",
  },
  {
    id: 9211,
    slug: "מה-עושים-אחרי-פריצה-לבית",
    title: "מה עושים אחרי פריצה לבית – סדר פעולות",
  },
];

for (const g of GUIDES) {
  site.pages.push(
    makePage({
      id: g.id,
      title: g.title,
      segments: [GUIDES_SEGMENT, g.slug],
      // Placeholder metadata — the authored module overwrites both in enrich.mjs. Kept
      // non-empty so the generated-page assertion below passes on a fresh build.
      seo: {
        title: `${g.title} | ${BRAND}`,
        description: `${g.title} – מדריך מלא של ${BRAND}. חייגו ${PHONE}.`,
      },
      body: [hero("מדריכים", g.title, "")].join("\n"),
    }),
  );
  created.push(g.slug);
}

site.pages.push(
  makePage({
    id: 9200,
    title: "מדריכים",
    segments: [GUIDES_SEGMENT],
    jsonLd: hubJsonLd({ name: "מדריכים", segments: [GUIDES_SEGMENT] }),
    seo: {
      title: `מדריכים למנעולנות רכב ובית | ${BRAND}`,
      description: `מדריכים של ${BRAND}: כמה עולה שכפול מפתח לרכב, מה עושים כשאבד המפתח היחיד, וההבדל בין מפתח עם שבב למפתח חכם – עם מחירים וזמנים.`,
    },
    body: guidesIndexBody(GUIDES),
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
  if (h1 !== 1)
    problems.push(`${decodeURIComponent(p.path)}: expected 1 <h1>, found ${h1}`);
  if (!p.seo.title || !p.seo.description)
    problems.push(`${decodeURIComponent(p.path)}: missing seo title/description`);
}

writeFileSync(FILE, JSON.stringify(site, null, 2), "utf8");
console.log(
  `pages: generated ${generated.length} page(s) → ${generated.map((p) => decodeURIComponent(p.path)).join(", ")}`,
);
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
