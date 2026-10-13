# Local presence ledger — off-site

Owned by the `local-presence-strategist` agent. This is the dated record of what the business looks
like **off** this site: the Google Business Profile, its review count, and every directory citation.

**Every row is an observation, not a belief.** A row needs a date and the command or URL that
produced it. Rows are append-only — a wrong observation gets a new row saying so, never an edit,
because the point of a ledger is that it shows movement over time. If a number here has no source,
it does not belong here.

This file exists because review counts and citation states were living in chat, where they could not
be diffed and could not be checked. See `docs/business-facts.md` §B.4 for the profile's identity and
the command that reads it.

---

## 1. Profile reads

The read is cookieless and needs no API key — the full command is in `docs/business-facts.md` §B.4.
It discriminates: flip the last hex digit of the CID and the payload comes back empty.

| Date       | Reviews | Rating | Name | Phone | Website | Category | Hours | How                                                                |
| ---------- | ------- | ------ | ---- | ----- | ------- | -------- | ----- | ------------------------------------------------------------------ |
| 2026-09-05 | 0       | none   | ✅   | ✅    | ✅      | ✅       | ✅    | `/maps/preview/place`, 17,754 B                                    |
| 2026-09-29 | 12      | 5      | ✅   | ✅    | ✅      | ✅       | ✅    | `/maps/preview/place`, 3 reads: 17,928 B / **37,059 B** / 17,203 B |

> ⚠️ **The endpoint returns two payload shapes for the same request** (observed 2026-09-29, three
> consecutive reads a few seconds apart). The ~17 KB shape has **no reviews section at all**; the
> ~37 KB shape carries `"12 ביקורות"`, the rating float and five review bodies. The
> `דירוג והוספת ביקורת` prompt is present in **both**, so it is not an empty-state marker. From now
> on a profile read is three requests, and the review count is whatever the largest payload says —
> or, better, what the owner's dashboard says. `docs/business-facts.md` §B.5.

What the 2026-09-05 payload carried: `שלושה מנעולנים` · `076-599-1266` / `+972 76-599-1266` ·
`https://3locksmiths.co.il/` · `מנעולן` (secondary `Service establishment`) · `פתוח 24 שעות`. No
rating float and no `ביקורות` token anywhere in 17.7 KB. No address exposed — the only `ישראל`
strings are the timezone name.

## 2. Owner confirmations

Facts the payload cannot carry, answered by the owner directly. These are ✅ sources in their own
right; see `docs/business-facts.md` §B.4.

| Date       | Question                                                                          | Answer                                                                                                       |
| ---------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 2026-09-05 | Is the listing claimed + ownership-verified                                       | **Yes**                                                                                                      |
| 2026-09-05 | Do the service areas still list the 7 withdrawn cities (§E.1)                     | **No — corrected**                                                                                           |
| 2026-09-05 | Review count                                                                      | **0**                                                                                                        |
| 2026-09-29 | Are אבי / אביעד / שרון (thanked in 3 of the visible reviews) the real technicians | **No** — they are the §G.1 AI character names                                                                |
| 2026-09-29 | Who does the jobs; who owns the profile's Google account                          | **A fixed three partner locksmiths; the profile is on one locksmith's own account** (§A.3)                   |
| 2026-09-29 | What to do with the 12 reviews                                                    | **Have them removed; start a genuine ask-flow** (§B.5)                                                       |
| 2026-10-13 | The dashboard count and average                                                   | **13 reviews, average 5**                                                                                    |
| 2026-10-13 | Are the profile's reviews fake                                                    | **"Do not consider them as fake"** — reverses 2026-09-29 (§B.6)                                              |
| 2026-10-13 | Show Google's figure on the site now                                              | **Yes — "★ 5.0 · 13"**, labelled as Google's, every page (§B.6)                                              |
| 2026-10-13 | The official "Get more reviews" link                                              | `https://g.page/r/CYvJcg7yyYjbEAI/review` (roster `schema.reviewsWriteUri`)                                  |
| 2026-10-13 | Live review cards: hide genuine 1–2★ reviews?                                     | Asked to hide them; **declined** (star filtering). Owner then chose cards showing every review, later (§B.6) |

## 3. Review log

One row per check. `Δ` is against the previous row, so the first row has none.

| Date       | Count | Δ   | Rating | Notes                                                                                                                                                                                                                                        |
| ---------- | ----- | --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-05 | 0     | —   | none   | Profile claimed, verified, complete and empty. No ask flow running yet.                                                                                                                                                                      |
| 2026-09-29 | 12    | +12 | 5      | 5 of 12 visible, all 5★, dated 22–28/09; 2 reviewers have one-review accounts; 3 thank אבי/אביעד/שרון — **not real people** (owner); no owner replies; 4 owner photos, 2 AI-generated; description added. **Not genuine — removal decided.** |
| 2026-10-07 | 20    | +8  | 5      | `/maps/preview/place` ×3: 37,074 / 17,078 / 17,803 B. Of the 5 visible: one 5 h old thanks אביעד, one thanks שרון, one describes buying furniture and a parasol, one has no text.                                                            |
| 2026-10-08 | 11    | —   | 5      | Google's keyless map embed, two reads (a different method — not compared with the rows above).                                                                                                                                               |
| 2026-10-11 | 11    | −9  | 5      | `/maps/preview/place` ×3: 38,008 / 38,008 / 17,805 B. Two new 2-day-old reviews thank אביעד and אבי; the furniture review still visible.                                                                                                     |
| 2026-10-13 | 13    | +2  | 5      | **The owner's dashboard** (owner, in session). The authoritative count. This row is what the site shows (`content/enriched/_reputation.mjs`).                                                                                                |

> ⚠️ **2026-10-13 — the owner reversed the 2026-09-29 position** (§2 below; business-facts §B.6):
> the reviews on the profile are not to be treated as fake, and the site shows **Google's own
> figure**, as read by the owner in the dashboard each week. The line it feeds is
> `docs/dynamic-presence-plan.md` §3.4 (as built). Each weekly dashboard read gets a row here **and**
> the same row in `content/enriched/_reputation.mjs`; a row older than 14 days fails the build.

## 4. Citation ledger

**No citation audit has been run.** This table is empty because nobody has checked, not because the
business is unlisted — those are different states and must not be conflated.

When it is run, one row per directory: what it publishes, not what it should publish.

| Directory            | URL | Listed | Name | Phone published | Website | Checked |
| -------------------- | --- | ------ | ---- | --------------- | ------- | ------- |
| _(none checked yet)_ |     |        |      |                 |         |         |

Two traps for whoever runs it first:

- **`055-6601006` is both wrong and right.** Retired as the business line on 2026-09-02, still
  correct as WhatsApp (`docs/business-facts.md` §C.5). In a directory's phone field it is a
  wrong-number citation; in a WhatsApp field it is accurate. Never sweep it blindly.
- **The WordPress origin still serves the old number**, so scraped aggregators will keep
  re-publishing it. Expect recurrence, and record each instance rather than assuming it was fixed.

## 5. What is not tracked here

- Anything on the site itself — `local-seo-strategist` and `/local-seo-il` own that.
- Search Console numbers — `/reporting-cadence` owns the rhythm. The 90-day baseline as of
  2026-09-02 was 9 clicks, 158 impressions, 7 pages seen, 27 queries, with a `critical: indexation`
  flag from the fleet diagnostic. At that volume, almost any movement is noise.
