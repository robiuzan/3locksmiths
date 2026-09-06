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

| Date       | Reviews | Rating | Name | Phone | Website | Category | Hours | How                             |
| ---------- | ------- | ------ | ---- | ----- | ------- | -------- | ----- | ------------------------------- |
| 2026-09-05 | 0       | none   | ✅   | ✅    | ✅      | ✅       | ✅    | `/maps/preview/place`, 17,754 B |

What the 2026-09-05 payload carried: `שלושה מנעולנים` · `076-599-1266` / `+972 76-599-1266` ·
`https://3locksmiths.co.il/` · `מנעולן` (secondary `Service establishment`) · `פתוח 24 שעות`. No
rating float and no `ביקורות` token anywhere in 17.7 KB. No address exposed — the only `ישראל`
strings are the timezone name.

## 2. Owner confirmations

Facts the payload cannot carry, answered by the owner directly. These are ✅ sources in their own
right; see `docs/business-facts.md` §B.4.

| Date       | Question                                                      | Answer             |
| ---------- | ------------------------------------------------------------- | ------------------ |
| 2026-09-05 | Is the listing claimed + ownership-verified                   | **Yes**            |
| 2026-09-05 | Do the service areas still list the 7 withdrawn cities (§E.1) | **No — corrected** |
| 2026-09-05 | Review count                                                  | **0**              |

## 3. Review log

One row per check. `Δ` is against the previous row, so the first row has none.

| Date       | Count | Δ   | Rating | Notes                                                                   |
| ---------- | ----- | --- | ------ | ----------------------------------------------------------------------- |
| 2026-09-05 | 0     | —   | none   | Profile claimed, verified, complete and empty. No ask flow running yet. |

> ⚠️ **0 is the number that matters on this site.** The profile is otherwise finished, so the map
> pack is gated on this row moving and on nothing else. It cannot be moved by code.

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
