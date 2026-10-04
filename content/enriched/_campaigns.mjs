/**
 * The announcement bar's lines, and when each one shows (docs/dynamic-presence-plan.md §3.1).
 *
 * HOW A LINE REACHES THE PAGE
 *   scripts/live-surfaces.mjs renders every line below into the header of every page, hidden.
 *   A small script in <head> looks at the visitor's clock and reveals one. With JavaScript off,
 *   or outside every window, the `evergreen` line shows. Nothing here is fetched at runtime.
 *   After editing: `npm run format`, `npm run enrich`, then `npm run build` (its prebuild gate
 *   runs scripts/check-campaigns.mjs, which enforces everything below). Look at
 *   public/assets/live-schedule.json to see when a line will really show. A deploy is what
 *   makes it live. The off switch needs no deploy: https://imgquarry.com/status/fleet.json
 *   (`quiet` = the evergreen line only, `reduced` = the wartime line below, `off` = no bar, and
 *   no card in any of them) — runbook: ../Sys Admin/runbooks/fleet-status-switch.md.
 *
 * THE RULES
 *   - No offers exist (docs/business-facts.md §D.10, owner 2026-09-29): a line is advice,
 *     availability or safety. Never a price, a percent, a countdown, an arrival time, a count,
 *     a warranty, or the word מבצע.
 *   - A tip must be something the page it links to actually says. `source` starts with
 *     `content/enriched/<id>.mjs — ״the sentence״` and the gate checks the sentence is still in
 *     that module and that <id> is the page the line links to. Elide with … .
 *   - Length: a seasonal or safety line is read on a phone in one row — text + link label ≤ 46
 *     characters (the gate counts). The evergreen line shows from 992 px only — ≤ 70.
 *   - Never type a phone number, anywhere. `{phone}` prints and dials the call line from
 *     site.config.json; `{whatsapp:וואטסאפ}` links the word to the WhatsApp line, whose number
 *     is never printed (§C.5 — it is not the call line, and its old spelling is retired).
 *   - 100 / 101 stay plain text. A tappable emergency number tagged as a call would be counted
 *     by GTM as a lead for this business.
 *   - Do not repeat the header. Hours and the phone number are printed right under the bar on
 *     desktop and in the sticky bar on a phone; a line that says them again says nothing.
 *   - No quote characters in a line; Hebrew punctuation is גרש ׳ / גרשיים ״ (CLAUDE.md §8).
 *
 * WINDOWS
 *   from / until   ISO 8601 with Israel's offset FOR THAT DATE: +02:00 in winter, +03:00 in
 *                  summer. The clocks change 25/10/2026, 26/03/2027, 31/10/2027; the gate
 *                  rejects the wrong season. [from, until).
 *   during         instead of fixed dates: repeat in every calendar window of that kind
 *                  (content/enriched/_calendar.json — today only `pre-shabbat`, Thursday 17:00
 *                  → Friday 14:00). from / until then only bound the repetition.
 *   variant        the line's id on the page; windows that share a line share a variant, so a
 *                  returning holiday is a NEW window (id `hanukkah-2027`) with the OLD variant
 *                  (`hanukkah`). Safety variants start with `safety-` — app/enrich.css keys on
 *                  that prefix; nothing else may use it.
 *   priority       higher wins among seasonal windows live at once; ties between overlapping
 *                  windows fail the build. The ladder: 10 a season · 20 the weekly slot ·
 *                  30 a holiday · 50 safety (a safety window beats every seasonal one anyway).
 *   lifecycle      remove a window a month after it ends (the gate warns): its hidden line still
 *                  ships on every page. The calendar's quiet days silence every line, and
 *                  Shabbat and chag silence every SEASONAL line (a safety line stays on — owner,
 *                  2026-10-01) — so no window needs to be cut around them; a window may not
 *                  reach past the calendar's last Shabbat.
 *
 * Emergency pages (93xx) and the calculator steps never show a seasonal line — only the evergreen
 * line and a safety line. That is decided by the pipeline (lib/live/pages.mjs), not per window.
 * A fixed-date SEASONAL window may carry a `dialog` — the small card (plan §3.2): title, body,
 * call (must contain {phone}), whatsapp (a word), link { label, href } (the same page as the
 * line's link), capDays (7–60, default 14). Never on a safety window or a `during` slot. The
 * pipeline never renders a card on the calm pages, on a page that tells the reader to call
 * 100/101, or on the card's own link target; live.js opens it on the 2nd page of a visit, or
 * after 20 s and a scroll — never on the first page from a search engine.
 */
export default {
  // Interface words the cards need. The ✕ button's accessible name.
  ui: { close: "סגירה" },

  // Shown from 992 px whenever nothing seasonal is live, and the JavaScript-off state. It is
  // about WhatsApp only, on purpose: the header row directly under the bar already prints the
  // hours and the phone number, and a visitor above 991 px has no other WhatsApp link (the
  // sticky bar is phone-only). It promises no reply time — none is confirmed.
  evergreen: {
    topbar: {
      text: "מעדיפים לכתוב ולא להתקשר? שלחו לנו הודעת {whatsapp:וואטסאפ}",
    },
    source:
      "docs/business-facts.md §C.5 (WhatsApp is live on its own number, which is never printed — the 076 call line cannot receive it)",
  },

  // The wartime line. Never shown by date: only while the fleet switch
  // (https://imgquarry.com/status/fleet.json) says `"mode": "reduced"` — written in advance so
  // nobody drafts copy under sirens (plan §4.4). Rendered on every page, the emergency pages
  // included. No link, no promise of hours or arrival; the site never repeats Home Front
  // Command alerts. Under `quiet` the evergreen line shows instead, under `off` no bar at all.
  reduced: {
    topbar: { text: "פועלים בכפוף להנחיות פיקוד העורף" },
    source:
      "docs/dynamic-presence-plan.md §4.4 (the pre-approved wartime state; owner decision 6, 2026-09-29) · docs/business-facts.md §D.12 (wording confirmed by the owner 2026-10-04) · §D.10 (no offer)",
  },

  windows: [
    // Every week, Thursday 17:00 → Friday 14:00 (the `pre-shabbat` windows in the calendar). A
    // quiet day or chag on the Thursday delays the line until that day ends; a chag on the
    // Friday (Shavuot 2027) removes it. A check the reader can do at home — deliberately not
    // "book before Shabbat", and no claim about Shabbat itself. Starts after the Tishrei
    // holidays. The link is a car guide, so the line names the car keys.
    {
      id: "before-shabbat",
      kind: "seasonal",
      during: "pre-shabbat",
      from: "2026-10-08T00:00:00+03:00",
      priority: 20,
      topbar: {
        text: "שני מפתחות הרכב בצרור אחד? זה לא גיבוי",
        link: { label: "למדריך", href: "/מדריכים/אבד-המפתח-היחיד-לרכב/" },
      },
      source:
        "content/enriched/9202.mjs — ״אל תשמרו את שני המפתחות באותו צרור ובאותו כיס. גיבוי שאבד יחד עם הראשון אינו גיבוי.״ · docs/business-facts.md §D.10 (advice only)",
    },

    // The cold months. Runs under the weekly line and under Hanukkah (lower priority). "השלט"
    // rather than "המפתח": on a door-lock page a key is a house key, and the guide itself says
    // השלט.
    {
      id: "winter-remote-2026",
      variant: "winter-remote",
      kind: "seasonal",
      from: "2026-11-15T00:00:00+02:00",
      until: "2027-03-01T00:00:00+02:00",
      priority: 10,
      topbar: {
        text: "השלט מגיב לאט בקור? סימן לסוללה חלשה",
        link: { label: "למדריך", href: "/מדריכים/תחזוקת-מפתח-חכם/" },
      },
      source:
        "content/enriched/9210.mjs — ״בקור או אחרי לילה בחוץ התגובה איטית יותר מהרגיל.״ (under ״הסימנים שהסוללה נחלשת״) · docs/business-facts.md §D.10 (advice only)",
    },

    // Hanukkah 5787: first candle Friday 04/12/2026, eighth day Saturday 12/12/2026. Opens the
    // Thursday before, while trips are still being planned, and ends inside the last Shabbat
    // so the Shabbat subtraction closes it on Friday afternoon — never after the holiday.
    {
      id: "hanukkah-2026",
      variant: "hanukkah",
      kind: "seasonal",
      from: "2026-12-03T06:00:00+02:00",
      until: "2026-12-12T12:00:00+02:00",
      priority: 30,
      topbar: {
        text: "נוסעים בחנוכה? השאירו מפתח אצל אדם אמין",
        link: { label: "למדריך", href: "/מדריכים/ננעלתי-מחוץ-לבית/" },
      },
      // The seasonal card (plan §3.2) — the one card of 2026. Copy drafted by hebrew-copywriter,
      // reviewed for claims and Hebrew, 2026-10-01. Opens at most once in 14 days per visitor.
      dialog: {
        title: "יוצאים לחופשת חנוכה?",
        body: "השאירו מפתח רזרבי אצל אדם שאתם סומכים עליו, ולא מתחת לשטיח או בעציץ – שם מחפשים ראשון. אין לכם מפתח נוסף? שכפלו אחד לפני שאתם יוצאים.",
        call: "חייגו {phone}",
        whatsapp: "וואטסאפ",
        link: { label: "ננעלתם מחוץ לבית?", href: "/מדריכים/ננעלתי-מחוץ-לבית/" },
        capDays: 14,
      },
      source:
        "content/enriched/9205.mjs — ״שכפלו מפתח נוסף והשאירו אותו אצל אדם שאתם סומכים עליו, לא מתחת לשטיח ולא בעציץ.״ · card: ״השאירו עותק אצל אדם שאתם סומכים עליו, ולא מתחת לשטיח או בעציץ – שם מחפשים ראשון.״ · docs/business-facts.md §D.10 (advice only)",
    },

    // The cleaning weeks before Pesach 5787 (seder night Wednesday 21/04/2027). Ends at noon on
    // the eve: nobody is cleaning for Pesach once it has begun. Links to the home lander, where
    // the maintenance list is visible without a click (the same advice sits in a collapsed FAQ
    // on the lock-replacement page).
    {
      id: "pesach-2027",
      variant: "pesach",
      kind: "seasonal",
      from: "2027-04-04T06:00:00+03:00",
      until: "2027-04-21T12:00:00+03:00",
      priority: 30,
      topbar: {
        text: "ניקיון לפסח? לצילינדר גרפיט, לא שמן מזון",
        link: { label: "פרטים", href: "/מנעולן-לבית/" },
      },
      source:
        "content/enriched/78.mjs — ״שמנו את הצילינדר בתרסיס גרפיט או בשמן מנעולים ייעודי – לא בשמן מזון ולא בחומר סיכה סמיך״ · docs/business-facts.md §D.10 (advice only)",
    },

    // Summer 2027 — from May, which is already hot (owner, 2026-10-01). Non-commercial, and the
    // one line allowed on the emergency pages. It tells the reader to call the emergency
    // services, not us — the wording of the locked-car page itself. A safety line stays on
    // through Shabbat and chag (owner, 2026-10-01); memorial days and fasts still silence it.
    {
      id: "safety-summer-2027",
      variant: "safety-summer",
      kind: "safety",
      from: "2027-05-01T00:00:00+03:00",
      until: "2027-09-16T00:00:00+03:00",
      priority: 50,
      topbar: {
        text: "ילד או בעל חיים ברכב נעול? חייגו 100/101",
        link: { label: "פרטים", href: "/services/פתיחת-רכב-נעול/" },
      },
      source:
        "content/enriched/9301.mjs — ״אם ננעלו בתוך הרכב ילד, תינוק או בעל חיים – התקשרו קודם כול ל-100 או ל-101.״ · docs/business-facts.md §D.10 (safety line, no offer)",
    },
  ],
};
