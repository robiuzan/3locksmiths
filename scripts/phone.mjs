/**
 * Carries a phone-number change into everything this site publishes but does not author:
 * the SCRAPED WordPress HTML in content/site.json, and the text assets under public/.
 *
 * WHY A PIPELINE PASS — same reason as scripts/claims.mjs. The header CTA, the footer info
 * panel and the mobile call strip are scraped WordPress chrome, not authored modules, and
 * `content/site.json` is a build artifact that must never be hand-edited (CLAUDE.md §3 rule 2).
 * `npm run enrich` refills `<main>` and the JSON-LD from content/enriched/*.mjs but leaves the
 * chrome alone, and `npm run snapshot` re-fetches it from a WordPress origin that still
 * publishes the retired number. So the only place a number change survives a rebuild is here.
 *
 * WHY A BLANKET SUBSTITUTION IS OK HERE — claims.mjs argues hard against broad regexes, and it
 * is right: a loose match over Hebrew marketing prose silently mangles a page. A phone number is
 * the opposite kind of token. `055-6601006` is a unique digit string that cannot legitimately
 * mean anything but this business's retired line, so every occurrence is a hit by construction.
 *
 * WHY A WHOLE-FILE PASS — a phone number contains no quotes and no markup, so it appears
 * byte-identically in the raw JSON and inside the double-escaped `jsonLd` strings. That is
 * exactly the condition claims.mjs names for its raw pass, so one string pass reaches bodyHtml,
 * seo.title, seo.description and every JSON-LD block at once.
 *
 * ⚠️ WHATSAPP IS DELIBERATELY EXEMPT. The 076 line is a non-geographic/VoIP prefix and is not
 * WhatsApp-capable, so `contact.whatsappE164` in the manifest is still +972556601006 by owner
 * decision (2026-09-02). WhatsApp URLs are therefore protected before the substitution and
 * restored after it — rewriting them would replace conversion goal #2 with a dead link on every
 * page. This is the one place in the codebase where the retired number is still correct.
 *
 * Idempotent: every replacement's output does not match its own input, and the pass is a no-op
 * once the tree is clean.
 *
 *   node scripts/phone.mjs      (exit 1 if the retired number survives outside a WhatsApp URL)
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PATH = join(ROOT, "content", "site.json");

// The live number comes from the manifest, which syncs down from the roster. CLAUDE.md §6: a
// phone number typed anywhere else is a bug — including in this file.
const manifest = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf8"));
const DISPLAY = manifest.contact?.phoneDisplay;
const E164 = manifest.contact?.phoneE164;
const WHATSAPP = manifest.contact?.whatsappE164 ?? E164;
if (!DISPLAY || !E164) {
  console.error(
    "phone: site.config.json is missing contact.phoneDisplay or contact.phoneE164.",
  );
  process.exit(1);
}

/**
 * Numbers this business has retired, newest last. Add a row when the number changes again —
 * the manifest only ever tells us the CURRENT number, so without this list the previous one
 * stays frozen in the scrape forever.
 */
const RETIRED = [
  { display: "055-6601006", e164: "+972556601006", retired: "2026-09-02" },
];

/** Every spelling of one number that the WordPress scrape is known to carry. */
function spellings({ display, e164 }) {
  const digits = e164.replace(/\D/g, ""); // 972556601006
  const local = "0" + digits.slice(3); // 0556601006
  const prefix = digits.slice(3, 5); // 55
  return {
    digits,
    local,
    // Longest first: a shorter form can be a substring of a longer one.
    tel: [`tel:${e164}`, `tel:${digits}`, `tel:${display}`, `tel:${local}`],
    e164Forms: [e164, `+972-${prefix}-${display.split("-").slice(1).join("-")}`],
    displayForms: [display, local],
  };
}

// wa.me/<digits> and api.whatsapp.com/send?phone=<digits>. `?` and `=` are not escaped in JSON,
// so these match in a raw string pass too. The sentinels contain no digits, so no rewrite below
// can hit them.
const WA_DIGITS = WHATSAPP.replace(/\D/g, "");
const SENTINELS = [
  [`wa.me/${WA_DIGITS}`, " WA_ME "],
  [`phone=${WA_DIGITS}`, " WA_PHONE "],
];

const counts = new Map();
const bump = (id, n) => counts.set(id, (counts.get(id) ?? 0) + n);
let waProtected = 0;

/** Rewrite every retired spelling in one blob of text, leaving the WhatsApp URLs alone. */
function rewrite(text) {
  let out = text;
  const swap = (id, from, to) => {
    if (from === to) return;
    const n = out.split(from).length - 1;
    bump(id, n);
    if (n) out = out.split(from).join(to);
  };

  for (const [from, token] of SENTINELS) {
    const n = out.split(from).length - 1;
    waProtected += n;
    if (n) out = out.split(from).join(token);
  }

  // The unresolved WordPress `[phone]` shortcode — a tel: href that dials nothing at all
  // (docs/optimization-backlog.md §8.1). fix-links.mjs has always folded it into the business
  // number via isBusinessTel(), but only inside content/site.json; the copies in the two
  // fake-icon assets below were out of its reach. Both encodings occur.
  for (const dead of ["tel:%5Bphone%5D", "tel:[phone]"])
    swap("dead [phone] shortcode→E164", dead, `tel:${E164}`);

  for (const number of RETIRED) {
    const s = spellings(number);
    // tel: hrefs first — fix-links.mjs normally gets these, this is the belt-and-braces pass
    // that also covers any tel: the scrape hid outside an <a href> (onclick, data-* attributes).
    for (const form of s.tel) swap(`tel:${number.display}→E164`, form, `tel:${E164}`);
    // Bare E.164 spellings — JSON-LD `telephone`, og/meta tags, inline scripts.
    for (const form of s.e164Forms) swap(`${number.display}→${E164}`, form, E164);
    swap(`${number.display}→${E164}`, s.digits, E164.replace(/\D/g, ""));
    // Human-readable spellings — the header CTA, the footer panel, prose.
    for (const form of s.displayForms)
      swap(`${number.display}→${DISPLAY}`, form, DISPLAY);
  }

  for (const [from, token] of SENTINELS) out = out.split(token).join(from);
  return out;
}

// --- pass 1: content/site.json -------------------------------------------------------------
const raw = readFileSync(PATH, "utf8");
const out = rewrite(raw);

// Parse before writing: a substitution that broke the JSON must never reach the next step.
try {
  JSON.parse(out);
} catch (err) {
  console.error(
    `phone: the pass produced invalid JSON — refusing to write. ${err.message}`,
  );
  process.exit(1);
}
if (out !== raw) writeFileSync(PATH, out);

// --- pass 2: text assets under public/ ------------------------------------------------------
// FOUND 2026-09-02, and the reason this pass is not limited to content/site.json.
//
// `public/wp-content/themes/gogo/img/icons/favicon.ico` and `touch.png` are NOT images. Each is
// a 391 KB byte-identical HTML copy of the old WordPress homepage: the scraper requested those
// icon paths, WordPress answered with a page, and the response was saved under the icon's name.
// content/site.json points `icons.icon` and `icons.apple` at them, so both ship to out/ and both
// are fetchable — publishing the retired number, a fabricated Google-rating badge, the
// "25 שנות ניסיון" claim and the personal Gmail at a live URL.
//
// They defeat every other guard in this repo (claims.mjs, check-claims.mjs, pass 1 above)
// because all of those read content/site.json and nothing else. So this sweep is deliberately
// content-based rather than extension-based: an asset is whatever the file actually contains.
//
// ⚠️ This does NOT fix the underlying defect — HTML served as a favicon is still a broken icon,
// 783 KB of dead weight and an indexable stale clone of the homepage. It only stops the retired
// number being published from there. See docs/business-facts.md §C.5.
function walk(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(p));
    else if (entry.isFile()) found.push(p);
  }
  return found;
}

const touched = [];
for (const file of walk(join(ROOT, "public"))) {
  const buf = readFileSync(file);
  // Skip real binaries: a NUL byte in the first 8 KB means this is not text.
  if (buf.subarray(0, 8192).includes(0)) continue;
  const text = buf.toString("utf8");
  const next = rewrite(text);
  if (next === text) continue;
  writeFileSync(file, next);
  touched.push(file.slice(ROOT.length + 1).replace(/\\/g, "/"));
}

const applied = [...counts].filter(([, n]) => n > 0);
console.log(
  `phone: rewrote ${applied.reduce((a, [, n]) => a + n, 0)} occurrence(s) across ${applied.length} rule(s); ` +
    `left ${waProtected} WhatsApp URL(s) on ${WHATSAPP} untouched.`,
);
for (const [id, n] of applied) console.log(`   ${id.padEnd(34)} ×${n}`);
for (const f of touched) console.log(`   asset swept: ${f}`);

// --- self-verify: no retired number may reach the browser -----------------------------------
// Checked against the rendered artifact, not the sources, for the reason docs/business-facts.md
// §D.4 records: a renderer default can ship a value every authored module is clean of.
const survivors = [];
for (const number of RETIRED) {
  const s = spellings(number);
  const re = new RegExp(
    `(?:\\+?${s.digits}|${number.display.replace(/-/g, "-?")}|${s.local})`,
    "g",
  );
  const scan = (label, hay) => {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(hay))) {
      // The WhatsApp exemption: a hit inside wa.me/… or ?phone=… is the number still in use.
      const around = hay.slice(Math.max(0, m.index - 40), m.index);
      if (/wa\.me\/$|phone=$|api\.whatsapp\.com[^\s"']*$/.test(around)) continue;
      survivors.push(`${label} :: "${m[0]}" :: …${around.slice(-30)}${m[0]}…`);
    }
  };

  const site = JSON.parse(out);
  const pages = Array.isArray(site) ? site : (site.pages ?? Object.values(site));
  for (const p of pages) {
    scan(
      decodeURIComponent(String(p.path ?? p.id)),
      [
        String(p.bodyHtml ?? p.body ?? p.html ?? ""),
        p.seo?.title ?? "",
        p.seo?.description ?? "",
        JSON.stringify(p.jsonLd ?? p.schema ?? ""),
      ].join(" "),
    );
  }

  for (const file of walk(join(ROOT, "public"))) {
    const buf = readFileSync(file);
    if (buf.subarray(0, 8192).includes(0)) continue;
    scan(file.slice(ROOT.length + 1).replace(/\\/g, "/"), buf.toString("utf8"));
  }
}

if (survivors.length) {
  console.error(`\nphone: the retired number SURVIVED in ${survivors.length} place(s):`);
  for (const s of survivors.slice(0, 20)) console.error("  ! " + s);
  if (survivors.length > 20) console.error(`  … and ${survivors.length - 20} more`);
  console.error(
    "\nAdd the spelling to spellings() above, or fix the authored module / renderer default.\n",
  );
  process.exit(1);
}
console.log(`phone: no retired number survives — every CTA dials ${DISPLAY} ✅`);
