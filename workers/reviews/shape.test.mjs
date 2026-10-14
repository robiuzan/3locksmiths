// node --test workers/reviews/   (also in npm prebuild)
import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, israelDate, originalText, shapeReviews, textDir } from "./shape.mjs";

const review = (over = {}) => ({
  reviewId: "r",
  reviewer: { displayName: "Dana K", isAnonymous: false },
  starRating: "FIVE",
  comment: "שירות מעולה",
  createTime: "2026-10-01T10:00:00Z",
  updateTime: "2026-10-01T10:00:00Z",
  ...over,
});
const raw = (reviews, extra = {}) => ({
  reviews,
  averageRating: 4.8,
  totalReviewCount: reviews.length,
  ...extra,
});

test("israelDate uses the Israel calendar day, not UTC", () => {
  assert.deepEqual(israelDate("2026-11-27T22:30:00Z"), {
    text: "28/11/2026",
    iso: "2026-11-28",
  });
  assert.deepEqual(israelDate("2026-07-01T20:59:00Z"), {
    text: "01/07/2026",
    iso: "2026-07-01",
  });
  assert.deepEqual(israelDate("2026-07-01T21:00:00Z"), {
    text: "02/07/2026",
    iso: "2026-07-02",
  });
  assert.equal(israelDate("nonsense"), null);
});

test("originalText keeps the reviewer's words, never Google's translation", () => {
  assert.deepEqual(originalText("Great job\n\n(Translated by Google)\nעבודה מצוינת"), {
    text: "Great job",
  });
  assert.deepEqual(
    originalText("(Translated by Google) Great job\n\n(Original)\nעבודה מצוינת"),
    { text: "עבודה מצוינת" },
  );
  assert.deepEqual(originalText("(תורגם על ידי Google) Great\n\n(המקור)\nמעולה"), {
    text: "מעולה",
  });
  assert.deepEqual(originalText(""), { text: null });
  assert.deepEqual(originalText(undefined), { text: null });
  assert.ok(originalText("(Translated by Google) only a translation").error);
});

test("textDir: Hebrew that opens with a car brand stays rtl; English and Russian are ltr", () => {
  assert.equal(textDir("BMW שלי נפתחה תוך עשר דקות, ממליץ בחום"), "rtl");
  assert.equal(textDir("Fast and friendly, thank you!"), "ltr");
  assert.equal(textDir("Отличный сервис"), "ltr");
});

test("shapeReviews: anonymous, rating-only, edited, newest update first, nothing filtered", () => {
  const out = shapeReviews(
    raw([
      review({
        reviewId: "a",
        starRating: "ONE",
        comment: "לא הגיעו",
        updateTime: "2026-10-02T09:00:00Z",
        createTime: "2026-10-02T09:00:00Z",
      }),
      review({
        reviewId: "b",
        reviewer: { isAnonymous: true },
        comment: "",
        updateTime: "2026-10-05T09:00:00Z",
        createTime: "2026-09-20T09:00:00Z",
      }),
      review({
        reviewId: "c",
        starRating: "THREE",
        updateTime: "2026-10-03T09:00:00Z",
        createTime: "2026-10-03T09:00:00Z",
      }),
    ]),
  );
  assert.equal(out.ok, true);
  const r = out.data.reviews;
  assert.equal(r.length, 3, "a 1-star review is never dropped");
  assert.deepEqual(
    r.map((x) => x.stars),
    [5, 3, 1],
    "newest update first",
  );
  assert.equal(r[0].anon, true);
  assert.equal(r[0].name, null);
  assert.equal(r[0].text, null, "rating-only");
  assert.equal(r[0].edited, true);
  assert.equal(r[2].stars, 1);
  assert.equal(r[2].text, "לא הגיעו");
});

test("shapeReviews refuses rather than guesses", () => {
  assert.equal(
    shapeReviews(raw([review({ starRating: "STAR_RATING_UNSPECIFIED" })])).ok,
    false,
  );
  assert.equal(
    shapeReviews(raw([review({ comment: "(Translated by Google) x" })])).ok,
    false,
  );
  assert.equal(shapeReviews(raw([review()], { averageRating: 0 })).ok, false);
  assert.equal(shapeReviews(raw([review()], { totalReviewCount: 0 })).ok, false);
  assert.equal(shapeReviews({}).ok, false);
});

const stored = (reviews, fetchedAt = "2026-10-14T06:00:00Z") => ({
  fetchedAt,
  total: 13,
  average: 4.9,
  reviews,
});
const shaped = (n, created = "2026-10-01") =>
  Array.from({ length: n }, (_, i) => ({
    anon: false,
    name: `N${i}`,
    stars: 5,
    date: "01/10/2026",
    datetime: "2026-10-01",
    edited: false,
    text: "x",
    dir: "rtl",
    created,
  }));
const ledger = {
  open: true,
  live: true,
  genuine: 13,
  asOf: "2026-10-13",
  tolerance: 10,
  cap: 10,
};
const now = Date.parse("2026-10-14T08:00:00Z");

test("decide fails closed: mode, ledger, empty, stale", () => {
  assert.equal(
    decide({ stored: stored(shaped(3)), ledger, mode: null, now }).reason,
    "mode",
  );
  assert.equal(
    decide({ stored: stored(shaped(3)), ledger, mode: "off", now }).reason,
    "mode",
  );
  assert.equal(
    decide({
      stored: stored(shaped(3)),
      ledger: { ...ledger, live: false },
      mode: "on",
      now,
    }).reason,
    "ledger",
  );
  assert.equal(decide({ stored: null, ledger, mode: "on", now }).reason, "empty");
  assert.equal(
    decide({ stored: stored(shaped(3), "2026-10-12T06:00:00Z"), ledger, mode: "on", now })
      .reason,
    "stale",
  );
});

test("decide: up to `tolerance` reviews newer than the confirmed read; above that, withhold all", () => {
  const ten = [...shaped(10, "2026-10-14"), ...shaped(13)];
  assert.equal(decide({ stored: stored(ten), ledger, mode: "on", now }).state, "ok");
  const eleven = [...shaped(11, "2026-10-14"), ...shaped(13)];
  assert.equal(
    decide({ stored: stored(eleven), ledger, mode: "on", now }).reason,
    "unconfirmed",
  );
});

test("decide: ok carries only allowlisted fields, capped, with the fetch date in Israel time", () => {
  const out = decide({
    stored: stored([...shaped(15)].map((r) => ({ ...r, secret: "x" }))),
    ledger,
    mode: "on",
    now,
  });
  assert.equal(out.state, "ok");
  assert.equal(out.reviews.length, 10);
  assert.deepEqual(Object.keys(out.reviews[0]).sort(), [
    "anon",
    "date",
    "datetime",
    "dir",
    "edited",
    "name",
    "stars",
    "text",
  ]);
  assert.equal(out.asOf, "2026-10-14");
  assert.equal(out.asOfText, "14/10/2026");
});
