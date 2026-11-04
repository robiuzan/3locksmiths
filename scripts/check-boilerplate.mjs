/**
 * No answer may be copied verbatim across pages.
 *
 * WHY — the answer engines and Google's helpful-content systems read a paragraph repeated on 25
 * city pages as one paragraph, not 25 answers; it adds nothing on page two and marks every copy as
 * template filler. On 2026-11-03 the 25 city pages shared about 21 FAQ answers word for word and
 * the brand pages about 32. The first paragraph is the answer block (scripts/check-answer-block.mjs),
 * so it matters most of all.
 *
 * THE RULE, on two fields of every authored module — `intro.paragraphs[0]` and each
 * `faq.items[].a`, compared after collapsing whitespace:
 *   - a page marked done (content/geo-ratchet.json) may share neither with ANY other module;
 *   - on every other page, a text found in three or more modules counts once per module, and that
 *     count may only fall (scripts/check-ratchet.mjs).
 * The city pages' shared block (Phase 3, C1–C3) is rendered from constants, not authored per
 * module, so it is outside this check by construction — that is the point of rendering it once.
 *
 *   node scripts/check-boilerplate.mjs [--verbose] [--ratchet] [--init]
 */
import { judge, loadRatchet } from "./check-ratchet.mjs";
import { loadModules } from "./check-answer-block.mjs";

const norm = (s) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();

export function boilerplate(mods, done) {
  const owners = new Map(); // text → [{ id, field }]
  for (const m of mods) {
    const texts = [];
    if (m.intro?.paragraphs?.[0]) texts.push(["first paragraph", m.intro.paragraphs[0]]);
    for (const it of m.faq?.items ?? []) if (it?.a) texts.push(["FAQ answer", it.a]);
    for (const [field, raw] of texts) {
      const t = norm(raw);
      if (t.length < 40) continue; // "כן." is not boilerplate
      if (!owners.has(t)) owners.set(t, []);
      const list = owners.get(t);
      if (!list.some((o) => o.id === m.id)) list.push({ id: m.id, field });
    }
  }
  const violations = [];
  for (const [text, list] of owners) {
    if (list.length < 2) continue;
    for (const o of list) {
      const others = list.filter((x) => x.id !== o.id).map((x) => x.id);
      if (done.has(o.id) || list.length >= 3) {
        violations.push({ id: o.id, field: o.field, text, others });
      }
    }
  }
  return violations;
}

if (process.argv[1] && process.argv[1].endsWith("check-boilerplate.mjs")) {
  const mods = await loadModules();
  const done = new Set(loadRatchet().done);
  const violations = boilerplate(mods, done);
  const verdict = judge("boilerplate", violations, {
    verbose: process.argv.includes("--verbose"),
    describe: (v) =>
      `id ${v.id} ${v.field} shared with ${v.others.length} other page(s) (${v.others.slice(0, 6).join(", ")}${v.others.length > 6 ? ", …" : ""}): "${v.text.slice(0, 60)}…"`,
  });
  for (const l of verdict.lines) (verdict.failed ? console.error : console.log)(l);
  console.log(
    `boilerplate: ${violations.length} shared answer(s) counted` +
      (verdict.failed ? " — FAILED" : " ✅"),
  );
  process.exit(verdict.failed ? 1 : 0);
}
