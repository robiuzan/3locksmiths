/**
 * The image approval queue: what this site still wants, and what is blocking each one.
 *
 *   node scripts/check-placeholders.mjs
 *
 * The site declares which image slots it can use. The catalog (site.config.json `images`, synced by
 * ops/sync-media.ps1) says what is published. Media Studio's prompt files say what is written and
 * whether a human has approved it. This joins the three and prints what to do next.
 *
 * It exists because a placeholder is otherwise invisible: a slot with nothing published silently
 * falls back to the legacy stock photo and the build stays green forever. This makes the gap loud
 * without failing the build — the fallback is correct, it is just not finished.
 *
 * NON-MUTATING, so `check-` is the right prefix. check-freshness.mjs:43 excludes check-* from its
 * source list, which is only safe for scripts that never touch content/site.json — a MUTATING
 * script named check-* would silently drop out of the staleness check.
 *
 * Exit code is 0 unless --strict is passed: an unfinished queue is a normal state, not a failure.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { imageRef, _internals } from "../lib/enrich/catalog-image.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.argv.includes("--strict");

/** Where Media Studio keeps the prompt files. Optional: the report degrades if it is absent. */
const PROMPTS = resolve(ROOT, "..", "Media Studio", "prompts", "3locksmiths");

/**
 * Every image slot this site can render, and what falls back while it is empty.
 * Adding a row here is how a new image becomes visible to the queue.
 */
const SLOTS = [
  {
    name: "hero",
    label: "page hero — both",
    ratio: "4:3",
    pages: 49,
    fallback: "157336036_m.jpg (stock: a computer power supply)",
  },
  {
    name: "hero-car",
    label: "page hero — car",
    ratio: "4:3",
    pages: 48,
    fallback: "the `hero` slot, then the same stock photo",
  },
  {
    name: "hero-home",
    label: "page hero — home",
    ratio: "4:3",
    pages: 9,
    fallback: "the `hero` slot, then the same stock photo",
  },
  {
    name: "avatar",
    label: "contact-form avatar",
    ratio: "1:1",
    pages: 112,
    fallback: "avatar-1-1.png (stock: a woman who does not work here)",
  },
  {
    name: "home-tile-1",
    label: "homepage hero tile 1",
    ratio: "3:2",
    pages: 1,
    fallback: "stock: workshop / PC",
  },
  {
    name: "home-tile-2",
    label: "homepage hero tile 2",
    ratio: "3:2",
    pages: 1,
    fallback: "stock: consumer unit",
  },
  {
    name: "home-tile-3",
    label: "homepage hero tile 3",
    ratio: "3:2",
    pages: 1,
    fallback: "stock: hard-hat handshake",
  },
  {
    name: "home-tile-4",
    label: "homepage hero tile 4",
    ratio: "3:2",
    pages: 1,
    fallback: "stock: electrician",
  },
  // The "ננעלתם בחוץ" call-to-action band, further down the homepage. A different grid from the
  // hero tiles: rendered 476x276 css px (~1.73:1) with object-fit:cover over a 16:9 source.
  {
    name: "home-cta-1",
    label: "homepage CTA photo 1",
    ratio: "16:9",
    pages: 1,
    fallback: "stock: a gate intercom (not locksmithing)",
  },
  {
    name: "home-cta-2",
    label: "homepage CTA photo 2",
    ratio: "16:9",
    pages: 1,
    fallback: "stock: welding a steel frame (not locksmithing)",
  },
  {
    name: "home-cta-3",
    label: "homepage CTA photo 3",
    ratio: "16:9",
    pages: 1,
    fallback: "stock: drilling a garden fence (not locksmithing)",
  },
];

/** Parse just the front matter of a prompt file — enough for `key` and `approved`. */
function promptMeta(path) {
  const text = readFileSync(path, "utf8");
  const m = text.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  const meta = {};
  m[1].split(/\r?\n/).forEach((raw) => {
    const line = raw.replace(/\s+#.*$/, "").trim();
    const eq = line.indexOf(":");
    if (eq < 1) return;
    const v = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    meta[line.slice(0, eq).trim()] = v === "" || v === "null" || v === "~" ? null : v;
  });
  // 1-indexed line of `approved:`, so the editor link lands on the thing you have to change.
  const approvedLine =
    m[1].split(/\r?\n/).findIndex((l) => /^\s*approved\s*:/.test(l)) + 2;
  return { ...meta, _line: approvedLine, _body: m[2].trim() };
}

const prompts = new Map();
if (existsSync(PROMPTS)) {
  for (const f of readdirSync(PROMPTS)) {
    if (!f.endsWith(".md") || f.startsWith("_")) continue;
    try {
      const meta = promptMeta(join(PROMPTS, f));
      if (meta) prompts.set(f.replace(/\.md$/, ""), { ...meta, _file: join(PROMPTS, f) });
    } catch {
      /* an unreadable prompt file is reported as "no prompt", not a crash */
    }
  }
}

const rows = SLOTS.map((s) => {
  const ref = imageRef(s.name);
  const p = prompts.get(s.name);
  let state, action;
  if (ref) {
    state = "published";
    action = "";
  } else if (!p) {
    state = "no prompt";
    action = `write ${PROMPTS}\\${s.name}.md`;
  } else if (!p.approved) {
    state = "awaiting approval";
    action = `vscode://file/${p._file.replace(/\\/g, "/")}:${p._line}`;
  } else {
    state = "approved, not generated";
    action = `node scripts/generate-image.mjs prompts/3locksmiths/${s.name}.md   (in Media Studio)`;
  }
  return { ...s, ref, prompt: p, state, action };
});

const publishedCount = rows.filter((r) => r.ref).length;

console.log(`\nimage slots: ${publishedCount}/${SLOTS.length} published\n`);
if (!existsSync(PROMPTS)) {
  console.log(`  (no prompt directory at ${PROMPTS} — showing catalog state only)\n`);
}

const pad = (s, n) => String(s).padEnd(n);
for (const r of rows) {
  const mark = r.ref ? "OK  " : "TODO";
  console.log(
    `  ${mark} ${pad(r.label, 24)} ${pad(r.ratio, 5)} ${pad(r.pages + " pages", 11)} ${r.state}`,
  );
  if (!r.ref) {
    console.log(`       falls back to: ${r.fallback}`);
    if (r.action) console.log(`       ${r.action}`);
    if (r.prompt?._body && !r.prompt.approved) {
      const first = r.prompt._body.split("\n")[0];
      console.log(`       "${first.slice(0, 88)}${first.length > 88 ? "…" : ""}"`);
    }
  }
}

const awaiting = rows.filter((r) => r.state === "awaiting approval");
if (awaiting.length) {
  console.log(
    `\n${awaiting.length} prompt(s) awaiting approval. Open the link, read it, change ` +
      `'approved: null' to today's date, save.`,
  );
}

if (!_internals.IMAGES?.mediaHost) {
  console.log(
    "\n! site.config.json has no images.mediaHost — nothing can be served from the catalog.",
  );
}

console.log("");
process.exit(strict && publishedCount < SLOTS.length ? 1 : 0);
