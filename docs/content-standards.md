# Content standards — the depth bar

The acceptance bar for any page that ships. Cited by `hebrew-copywriter`, `seo-auditor`,
`eeat-trust-auditor`, `/new-service`, `/new-city` and `/new-article`.

**Start from a position of strength.** Unlike most sites in this fleet, 3locksmiths is _not_ thin.
Measured on the 2026-08-02 export: median **~1,500 words** per page, one `<h1>` on all 66 emitted
pages, no duplicate titles or descriptions. The 53 authored modules in `content/enriched/` did real
work. **The job here is to protect that bar, not to climb to it.**

---

## 1. Word floors

Unique body words, chrome excluded. The gogo theme's header/nav/footer contributes roughly 120–200
words to every page — subtract it before measuring.

| Page type                                               | Floor | Current (measured 2026-08-02)      |
| ------------------------------------------------------- | ----- | ---------------------------------- |
| Service page (`/services/…`)                            | 900   | median ~1,500 · thinnest 763       |
| Location page (`/locations/…`)                          | 900   | 1,282–1,598 — **all pass**         |
| Top-level Hebrew landing                                | 900   | pass                               |
| Index / hub (`/services/`, `/אזורי-שירות/`)             | 350   | `/services/` = 371 — barely passes |
| Legal (`/privacy-policy/`, `/accessibility-statement/`) | —     | exempt                             |
| `/step/…` calculator fragments                          | —     | exempt — see §1.1                  |

### 1.1 The `/step/` pages are not content pages

The four `/step/` routes (173–182 words) are fragments of the price-calculator flow, not landing
pages. `app/sitemap.ts` already excludes them. **Do not "fix" them by padding.** Do not add them to
the sitemap. If they should not be crawlable at all, that is a `robots`/`noindex` decision, not a
content one — see `docs/optimization-backlog.md` §1.5.

### 1.2 The one service page below floor

`/services/שכפול-מפתח-לרכב/` is 763 words — the thinnest real page. It is page id **95**, which
`content/enriched/_manifest.json` records as the `referenceId`: the structural reference the other 53
authored modules were written against. It therefore has **no `95.mjs`**, and consequently no meta
description, no `BreadcrumbList`, no `Service` node, and it ships the scraped source's malformed
JSON-LD.

It is also a head term ("שכפול מפתח לרכב"). **Authoring `content/enriched/95.mjs` is the single
highest-value content task on the site.** See `/new-service`.

---

## 2. The doorway test — the gate

> Replace the city name (or the service name) with a different one. Is the page now correct and
> publishable for that other city or service? **If yes, it does not ship.**

**The existing 25 location pages pass**, and that is worth stating plainly because it is unusual.
`content/enriched/137.mjs` (תל אביב) names דיזנגוף, רוטשילד, פלורנטין, נווה צדק, רמת אביב, הבורסה and
שכונת התקווה, and reasons about מרכז העיר parking and the older buildings of לב העיר. Substituting
"חיפה" would make the page wrong, not merely generic. That is the standard.

Any new or retrofitted page must clear the same bar with **three or more** genuinely local or
genuinely service-specific items:

- Named neighbourhoods, streets, junctions or landmarks.
- Physical reality — building stock, parking, access, typical lock or key types in that area.
- Travel and scheduling reality for that distance, stated honestly.
- A city- or service-specific FAQ that would read oddly anywhere else.
- Local pricing reality where it genuinely differs.
- A real job reference (🔶 — needs owner confirmation, see `docs/business-facts.md` §G).

**If none of those can be said truthfully, that page does not warrant existing.** Record the decision
in `docs/business-facts.md` §E rather than padding.

---

## 3. Required blocks per page type

The authored modules are typed by `lib/enrich/types.ts` (`EnrichedPage`) and rendered by
`lib/enrich/render.mjs`. Required fields are enforced by the type; the _bar_ below is editorial.

### Service page (`kind: "service"` / `"brand-key"`)

1. `hero.h1` + `hero.tagline` — the H1 is the keyword, naturally phrased.
2. `intro.heading` + 2–3 `paragraphs`, opening with the §5 answer block.
3. `pricing[]` — rows specific to this service.
4. `process[]` — the real sequence with realistic `time` values.
5. `specsTable` — the citable artifact. Key types, systems, complexity, duration, price band.
6. `scenarios[]` — when this service is the right call.
7. `faq.items[]` — 4–6, **specific to this service**.
8. `related.services[]` + `related.locations[]` — by relevance, never by array order.
9. `cta`.

### Location page (`kind: "location"`)

Same spine, plus:

- `city` set — it drives `areaServed` in the `Service` node.
- `intro.paragraphs` must carry the named-neighbourhood substance from §2.
- `process[]` steps reference the actual geography ("הניידת הקרובה", named areas).
- `areas[]` where a neighbourhood list earns its place.
- `related.locations[]` = genuinely adjacent cities, both directions.

### Index / hub page

Intro prose that links contextually into its children — not a bare grid of links. 350-word floor.

---

## 4. Voice

- **Tone:** אמין · מקצועי · רגוע · ענייני · זמין. Confident without hype.
- **Person:** "אנחנו" / שלושה מנעולנים, addressing the reader as "אתם".
- **Favour:** בשטח · במקום · ללא גרירה · זמינות מיידית · מחיר הוגן ושקוף · ציוד דיאגנוסטי · אחריות.
- **Avoid:** "זול", unevidenced superlatives ("המובילים בישראל"), exclamation spam, "פתרון קסם", and
  any urgency the business cannot honour.
- Emoji: never in body copy.
- **Register reference:** _"אבד או נשבר לכם מפתח? ניידת מגיעה אליכם ומבצעת שכפול וקידוד בשטח, עם
  אחריות מלאה."_

The existing authored copy is the style guide. **Read two neighbouring modules before writing a
third** — match their length, rhythm and structure rather than generic best practice.

---

## 5. The answer block — 40–60 words

Every service, location and guide page opens with one. This is what an answer engine lifts.

- Sits directly under a question-form or intent-matching heading.
- **40–60 words.** Shorter reads thin; longer stops being liftable.
- **Complete in the first sentence.** No "יש כמה גורמים" preamble.
- Self-contained — no pronoun points outside the block, because that is how it gets quoted.
- Carries the concrete number, range or duration where one exists.

Today this lives as the first paragraph of `intro.paragraphs`. It is usually close but often longer
than 60 words and buried behind a scene-setting sentence. Tightening the first paragraph of each
authored module is a cheap, high-yield pass.

---

## 6. Which claims are gated

Free to state (traced to the manifest or to `content/site.json`):

- The phone number, the WhatsApp number, the brand name.
- The service list and the city list.
- Anything a technician physically does — cutting, coding, opening, replacing a cylinder.

**Gated — needs a `docs/business-facts.md` row before it appears on a page:**

- Years in business, including "מעל 25 שנות ניסיון" (⛔ contradicted — `foundedYear` is `null`).
- Any warranty term, duration, scope or exclusion.
- Any price, including the ranges already in `pricing[]` (🔶 authored, not owner-sourced).
- Response times and "24/7" availability.
- Coverage claims, including "פריסה ארצית".
- Licences, certifications, insurance, association membership, ח.פ.
- Any rating, review, review count, testimonial or customer name.
- Any superlative.

**Never invent a testimonial**, not even as a placeholder. It is a Google policy violation and it
stays in a codebase far longer than intended.

---

## 7. Hebrew mechanics

- Hebrew only in user-facing strings. No mid-sentence language mixing — a Latin brand or model name
  (BMW, Multilock) gets its own clause.
- Israeli formats: phone `076-599-1266`, `₪` **after** the number, dates `dd/mm/yyyy`.
- Ranges use an en dash: `200 – 350 ₪`, `20–45 דקות`. The existing modules use a spaced en dash in
  prices and an unspaced one in durations — **match the neighbouring module** rather than normalising
  unilaterally.
- Hebrew abbreviations use גרש `׳` and גרשיים `״`, never ASCII `'` / `"`.
- Write the plain value; the renderer and the theme CSS handle direction.

Full rules: `/hebrew-rtl`.

---

## 8. The checklist

- [ ] Meets the §1 floor in unique words, chrome excluded.
- [ ] Passes the §2 substitution test with three or more specific items.
- [ ] Opens with a 40–60 word answer block that is complete in its first sentence.
- [ ] Carries every required block for its type (§3).
- [ ] FAQ items are specific to this page and are rendered visibly.
- [ ] Every gated claim (§6) has a `docs/business-facts.md` row, or is absent.
- [ ] Title carries the brand exactly once and stays under ~60 characters.
- [ ] Related services and locations chosen by relevance, both directions.
- [ ] `npm run snapshot` (or `npm run enrich`) re-run, and the page verified in `out/`.
