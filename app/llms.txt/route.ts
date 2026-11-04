import siteManifest from "@/site.config.json";
import pageManifest from "@/content/enriched/_manifest.json";

/**
 * /llms.txt — a plain-language index of the site for answer engines (added 2026-11-04).
 *
 * WHY NOW — the live robots.txt allows every AI crawler since at least 2026-11-03 (the Cloudflare
 * managed block of August is gone), so there is something for this file to point at. No major
 * engine has confirmed it reads llms.txt; it is cheap, honest hygiene, not a ranking lever
 * (docs/geo-observations.md §2).
 *
 * GENERATED, NOT HAND-WRITTEN — every list below comes from content/enriched/_manifest.json, the
 * same data the pages and the family hub are built from, so a page added or withdrawn changes this
 * file by itself. scripts/check-llms.mjs (run after `npm run build`) asserts every URL here is in
 * out/sitemap.xml and that no gated claim is stated.
 *
 * DELIBERATELY ABSENT — this file bypasses every content gate that reads content/site.json, so it
 * carries only facts that are ✅ in docs/business-facts.md:
 *   · no prices (🔶 §D.1 — the cost guide and the service pages carry them with their context);
 *   · no warranty wording, no years in business, no ratings or review counts, no response times;
 *   · no coverage phrase ("פריסה רחבה" is 🔶 §E.2) — the cities are listed by name instead;
 *   · no line about the imagery (disclosure is repo-only by the owner's decision, §G.1);
 *   · the 076 line and info@ only — the WhatsApp number is shared across the fleet;
 *   · /מחירון/ is not listed: its car rows still contradict the sitewide rows (owner task).
 *
 * `force-static`: `output: "export"` has no server, so this is evaluated at build time and written
 * to out/llms.txt.
 */
export const dynamic = "force-static";

interface ManifestRow {
  id: number;
  kind: string;
  title: string;
  canonical: string;
  brand?: string;
  city?: string;
}
interface PageManifest {
  family?: { parent: number; brands: number[]; locations: number[] };
  pages: ManifestRow[];
}

const ORIGIN = "https://3locksmiths.co.il";
// Hebrew punctuation for labels that arrive with an ASCII apostrophe from the scrape (פיג'ו).
const he = (s: string): string =>
  s.replace(/([א-ת])['’]/g, "$1׳").replace(/([א-ת])"(?=[א-ת])/g, "$1״");

function body(): string {
  const m = pageManifest as unknown as PageManifest;
  const byId = new Map(m.pages.map((p) => [p.id, p]));
  const row = (id: number): ManifestRow => {
    const r = byId.get(id);
    if (!r) throw new Error(`llms.txt: page ${id} is not in the manifest`);
    return r;
  };
  const link = (r: ManifestRow, label = r.title): string =>
    `- [${he(label)}](${r.canonical})`;

  const start = [
    [95, "מה כולל שכפול מפתח לרכב, סוגי המפתחות, זמני העבודה ושאלות נפוצות"],
    [96, "כשאין אף מפתח מקורי: הפקת מפתח חדש וקידודו למחשב הרכב"],
    [9201, "ממה מורכב המחיר של שכפול מפתח לרכב"],
    [9202, "מה עושים כשאבד המפתח היחיד לרכב"],
    [9204, "מה כדאי לבדוק לפני שמזמינים מנעולן"],
  ] as const;
  const startLines = start.map(([id, desc]) => `${link(row(id))}: ${desc}`).join("\n");

  const services = m.pages.filter((p) => p.kind === "service");
  const brands = (m.family?.brands ?? []).map(row);
  const cities = (m.family?.locations ?? []).map(row);
  const guides = m.pages.filter(
    (p) =>
      p.kind === "guide" &&
      p.canonical !== `${ORIGIN}/%d7%9e%d7%93%d7%a8%d7%99%d7%9b%d7%99%d7%9d/`,
  );

  const hubs = [
    ["/services/", "כל השירותים, לפי נושא"],
    ["/%d7%90%d7%96%d7%95%d7%a8%d7%99-%d7%a9%d7%99%d7%a8%d7%95%d7%aa/", "אזורי השירות"],
    ["/%d7%9e%d7%93%d7%a8%d7%99%d7%9b%d7%99%d7%9d/", "מדריכים"],
    ["/%d7%90%d7%95%d7%93%d7%95%d7%aa%d7%99%d7%a0%d7%95/", "מי אנחנו"],
    ["/contact/", "יצירת קשר"],
    ["/accessibility-statement/", "הצהרת נגישות"],
    ["/privacy-policy/", "מדיניות פרטיות"],
  ]
    .map(([path, label]) => `- [${label}](${ORIGIN}${path})`)
    .join("\n");

  return `# ${siteManifest.brandName} (${siteManifest.brandNameEn})

> מנעולנים לרכב ולבית שעובדים בשטח: שכפול, שחזור וקידוד מפתחות לרכב, שלטים ומפתחות חכמים, פתיחת רכב ודלת נעולים, והחלפת צילינדרים ומנעולים – ליד הרכב או בבית, בלי גרירה למוסך. זמינים 24/7.

## על העסק

- שם: ${siteManifest.brandName} (${siteManifest.brandNameEn})
- מי מבצע את העבודה: שלושה מנעולנים קבועים, כל אחד עם ניידת מאובזרת
- שעות: 24/7, כל ימות השבוע
- אתר: ${ORIGIN}/

## להתחיל כאן

${startLines}

## שירותים (${services.length})

${services.map((r) => link(r)).join("\n")}

## שכפול מפתח לפי יצרן הרכב (${brands.length})

${brands.map((r) => link(r, r.brand ?? r.title)).join("\n")}

## אזורי שירות (${cities.length})

${cities.map((r) => link(r, r.city ?? r.title)).join("\n")}

## מדריכים (${guides.length})

${guides.map((r) => link(r)).join("\n")}

## עמודים נוספים

${hubs}

## יצירת קשר

- טלפון: ${siteManifest.contact.phoneDisplay}
- דוא״ל: ${siteManifest.contact.email}

## הערות לשימוש במידע

- טווחי המחיר מופיעים בעמודי השירות ובמדריך העלויות, יחד עם מה שקובע אותם (סוג המפתח, היצרן ושנת הייצור). אין לצטט אותם כמחיר סופי של עבודה מסוימת.
- אין באתר שנות ותק, תעודות או מספרי לקוחות. אם נתון כזה מיוחס לעסק במקור אחר, הוא אינו מגיע מהאתר הזה.
- ${ORIGIN}/sitemap.xml מכיל את כל הדפים הניתנים לאינדוקס.
`;
}

export function GET(): Response {
  return new Response(body(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
