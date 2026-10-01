/**
 * The homepage updates strip (docs/dynamic-presence-plan.md §3.3) — one line of real news a week.
 *
 * scripts/live-surfaces.mjs renders the newest three after the "למה לבחור בשלושה מנעולנים" band;
 * public/assets/live.js hides the strip once the newest item is 45 days old, so an empty month
 * shows nothing rather than old news. A new item is a real content change and moves the
 * homepage's sitemap date.
 *
 * Each item: { date: "YYYY-MM-DD" (the day it happened, never in the future), text (one sentence,
 * ≤ 140 characters, no typed phone number), href (a page of this site), linkLabel (≤ 18),
 * source (the fact it rests on) }. One item per date. scripts/check-campaigns.mjs enforces it.
 * Never a customer, street, plate, review, count, price, arrival time or technician's name —
 * see .claude/agents/announcement-editor.md. Owner-approved 2026-10-01 (items 1–3 of the list
 * proposed that day).
 */
export default {
  heading: "עדכונים אחרונים",
  items: [
    {
      date: "2026-10-01",
      text: "עדכנו את הצהרת הנגישות: מה כבר נגיש באתר, מה עוד לא, ואיך לפנות אלינו בכל דרך שנוחה לכם.",
      href: "/accessibility-statement/",
      linkLabel: "להצהרת הנגישות",
      source:
        "The statement was rewritten and published 2026-10-01 (commit dfc2332, deployment 87535dbf; docs/dynamic-presence-plan.md Phase 2 step 6)",
    },
    {
      date: "2026-09-02",
      text: "מספר הטלפון שלנו התעדכן. המספר החדש מופיע בעמוד יצירת הקשר ובראש כל עמוד באתר.",
      href: "/contact/",
      linkLabel: "ליצירת קשר",
      source: "docs/business-facts.md §C.5 — the phone number changed 2026-09-02 (owner-supplied)",
    },
    {
      date: "2026-08-25",
      text: "פתחנו מדור מדריכים: מה עושים כשמפתח הרכב היחיד אבד, מה ההבדל בין מפתח עם שבב למפתח חכם ועוד.",
      href: "/מדריכים/",
      linkLabel: "לכל המדריכים",
      source:
        "The /מדריכים/ hub shipped and deployed 2026-08-25 with guides 9201–9203 (docs/optimization-backlog.md, 2026-08-25 DEPLOYED; content/enriched/9202.mjs, 9203.mjs datePublished 2026-08-25)",
    },
  ],
};
