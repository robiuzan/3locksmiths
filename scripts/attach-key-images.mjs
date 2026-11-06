/**
 * Puts the per-model key photographs on the brand pages' key grids: an `image:` and an `alt:` line
 * on each confirmed card whose picture is published in the catalog.
 *
 *   node scripts/attach-key-images.mjs --map <absolute path to cards.json> --dry-run
 *   node scripts/attach-key-images.mjs --map <absolute path to cards.json>
 *        [--allow <pageId> --ref "§D.n"]...   a page outside the built-in confirmed list
 *        [--replace-plate 99]                 swap פורד's key-type plates for its own images
 *        [--root <repo dir>] [--no-git-check] tests only: run against a scratch copy
 *
 * HUMAN-RUN AND OFFLINE. NEVER IN THE ENRICH CHAIN. The route a key picture takes (CLAUDE.md §6):
 * Media Studio renders it (toolkit site `threelocksmiths`), its catalog bridge uploads and
 * publishes it, `ops/sync-media.ps1` writes it into site.config.json, and THIS script writes the
 * card. Then `npx prettier --write <the files it names>` (never `npm run format` in a shared tree),
 * `npm run enrich` and the gates. The card map (`cards.json`) stays in Media Studio; nothing from
 * it is copied into this public repo except the slug and the Hebrew alt it writes.
 *
 * NAMED attach-, NOT check-. It edits authored modules, and check-freshness.mjs drops every
 * `check-*` script from its source list. It is therefore itself a freshness source: an edit to
 * this file makes content/site.json look stale until the next `npm run enrich`.
 *
 * WHICH PAGES. The confirmation doctrine lives in this repo, not in the map. A card may carry a
 * claim only once the owner confirmed that page's key types (docs/business-facts.md §D.5, §D.9),
 * so the B1 pages are listed below and any other page needs `--allow <id> --ref "§D.n"` naming
 * the business-facts row where its brand sheet was confirmed. `confirmed: true` in the map is
 * necessary, never sufficient. קיה (98) keeps its type plates and is never touched.
 *
 * WHICH CARD. A card is found by (page id, exact model text, exact years text or its absence)
 * inside `keyModels.items`, and exactly one item must match: model names repeat within a page
 * (9510 has three קאדילק אסקלייד cards that differ only by years). The map's `line` is an
 * assertion, never the locator; when it disagrees the map is stale and the run refuses.
 *
 * WHAT IT WRITES. Two lines before the item's closing `},` (every grid item is flat today):
 *         image: "<slug>",
 *         alt: "<Hebrew alt>",
 * An item that already has an `image` is skipped, except under `--replace-plate 99`, which
 * rewrites it only when it is one of the nine TYPE_PLATES. ALL OR NOTHING: any refusal writes no
 * file. After writing, every touched module is re-imported and compared with what was intended;
 * on any difference the original files are put back.
 *
 * Exit 0 = every row attached or skipped for a benign reason; 1 = a refusal or a failed check;
 * 2 = a usage error.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve, basename, isAbsolute, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { TYPE_PLATES, imageRef as repoImageRef } from "../lib/enrich/catalog-image.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** B1 — every model line confirmed by the owner on docs/claims-sheets/2026-11-b1.md (§D.5, 2026-11-04). */
const CONFIRMED_PAGES = new Map([
  [121, "פיג׳ו"],
  [118, "טויוטה"],
  [122, "יונדאי"],
  [119, "מאזדה"],
  [100, "סקודה"],
  [109, "סוזוקי"],
  [117, "רנו"],
]);
const KIA = 98;
const FORD = 99;

/** Catalog names a key card must never point at: the fixed slots and the page-level images. */
const RESERVED = new Set(["hero", "og", "logo", "avatar", "hero-car", "hero-home"]);
const RESERVED_PREFIXES = ["home-tile-", "home-cta-"];

const USAGE = `usage: node scripts/attach-key-images.mjs --map <absolute path to cards.json> [--dry-run]
         [--allow <pageId> --ref "<business-facts section, e.g. §D.15>"]... [--replace-plate 99]
         [--root <repo dir>] [--no-git-check]`;

function usage(msg) {
  console.error(`attach-key-images: ${msg}\n\n${USAGE}`);
  process.exit(2);
}

function parseArgs(argv) {
  const o = {
    map: null,
    dryRun: false,
    root: REPO,
    gitCheck: true,
    allow: new Map(),
    replacePlate: null,
  };
  let pendingAllow = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) usage(`${a} needs a value`);
      return v;
    };
    switch (a) {
      case "--map":
        o.map = value();
        break;
      case "--dry-run":
        o.dryRun = true;
        break;
      case "--root":
        o.root = resolve(value());
        break;
      case "--no-git-check":
        o.gitCheck = false;
        break;
      case "--allow": {
        if (pendingAllow !== null) usage(`--allow ${pendingAllow} has no --ref`);
        const v = value();
        const id = Number(v);
        if (!Number.isInteger(id) || id <= 0) usage(`--allow "${v}" is not a page id`);
        if (id === KIA)
          usage("page 98 (קיה) keeps its key-type plates and is never touched");
        pendingAllow = id;
        break;
      }
      case "--ref": {
        if (pendingAllow === null) usage("--ref must follow --allow <pageId>");
        const ref = value().trim();
        if (!/§[A-G]\.\d+/.test(ref)) {
          usage(
            `--ref "${ref}" must name a docs/business-facts.md section, e.g. "§D.15"`,
          );
        }
        o.allow.set(pendingAllow, ref);
        pendingAllow = null;
        break;
      }
      case "--replace-plate": {
        const v = value();
        if (Number(v) !== FORD)
          usage(`--replace-plate is for page 99 (פורד) only, not "${v}"`);
        o.replacePlate = FORD;
        break;
      }
      case "--help":
      case "-h":
        console.log(USAGE);
        process.exit(0);
        break;
      default:
        usage(`unknown argument "${a}"`);
    }
  }
  if (pendingAllow !== null) usage(`--allow ${pendingAllow} has no --ref`);
  if (!o.map) usage("--map is required");
  if (!isAbsolute(o.map)) {
    usage(
      "--map must be an absolute path (the card map lives in Media Studio, not in this repo)",
    );
  }
  return o;
}

/** @returns {{ rows: unknown[], sha256: string }} */
function readMap(path) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    usage(`cannot read --map ${path}: ${e.code ?? e.message}`);
  }
  let data;
  try {
    data = JSON.parse(raw.replace(/^﻿/, ""));
  } catch (e) {
    usage(`--map is not valid JSON: ${e.message}`);
  }
  const rows = Array.isArray(data)
    ? data
    : Array.isArray(data?.cards)
      ? data.cards
      : null;
  if (!rows)
    usage("--map must hold an array of card rows, or an object with a `cards` array");
  return { rows, sha256: createHash("sha256").update(raw).digest("hex") };
}

/** What is wrong with a row's shape, or null. Fields this script does not use are ignored. */
function shapeProblem(r) {
  if (!r || typeof r !== "object" || Array.isArray(r)) return "not an object";
  if (!Number.isInteger(r.pageId) || r.pageId <= 0)
    return "pageId must be a positive integer";
  if (typeof r.modelHe !== "string" || !r.modelHe.trim())
    return "modelHe must be a non-empty string";
  if (r.years != null && (typeof r.years !== "string" || !r.years.trim())) {
    return "years must be a non-empty string or null";
  }
  if (typeof r.confirmed !== "boolean") return "confirmed must be true or false";
  for (const k of ["attach", "excluded"]) {
    if (r[k] !== undefined && typeof r[k] !== "boolean")
      return `${k} must be true or false`;
  }
  for (const k of ["slug", "altPage"]) {
    if (r[k] != null && typeof r[k] !== "string") return `${k} must be a string`;
  }
  if (r.line != null && (!Number.isInteger(r.line) || r.line < 1)) {
    return "line must be a positive integer";
  }
  return null;
}

/** Media Studio's gallery-name normalisation (src/index.js buildKey): a slug must survive it unchanged. */
const workerName = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");

function slugProblem(slug) {
  if (typeof slug !== "string" || !slug) return "no slug";
  if (!/^key-[a-z0-9-]+$/.test(slug)) return "must match ^key-[a-z0-9-]+$";
  if (workerName(slug) !== slug) return "not in the form Media Studio stores it";
  if (TYPE_PLATES.has(slug)) return "a key-type plate, not a per-model image";
  if (RESERVED.has(slug) || RESERVED_PREFIXES.some((p) => slug.startsWith(p)))
    return "a reserved name";
  return null;
}

const HEBREW_LETTER = /[א-ת]/;
/** check-typography's residual rules, both sides: ASCII ' or " (or ’) touching a Hebrew character. */
const QUOTE_BY_HEBREW = /[֐-׿]['"’]|['"’][֐-׿]/;

const hasControlChar = (s) =>
  [...s].some((c) => {
    const n = c.codePointAt(0);
    return n < 0x20 || n === 0x7f || n === 0x2028 || n === 0x2029;
  });

/** What is wrong with a card's Hebrew alt, or null. `item` is the module's own card. */
function altProblem(alt, item) {
  if (typeof alt !== "string" || !alt) return "no altPage";
  if (hasControlChar(alt)) return "a control character";
  if (alt !== alt.trim() || /\s{2}/.test(alt)) return "stray whitespace";
  const n = [...alt].length;
  if (n < 20 || n > 160) return `${n} characters, must be 20-160`;
  if (!HEBREW_LETTER.test(alt)) return "no Hebrew letter";
  if (QUOTE_BY_HEBREW.test(alt))
    return "an ASCII quote next to a Hebrew letter (use ׳ or ״)";
  if (!alt.includes(item.model))
    return `does not contain the card's model "${item.model}"`;
  let rest = alt.split(item.model).join(" ");
  if (item.years) rest = rest.split(item.years).join(" ");
  if (/\p{Nd}/u.test(rest)) return "a digit outside the model and years text";
  if (alt.includes("תמונה של"))
    return "describes the picture (תמונה של) instead of what it shows";
  return null;
}

/** The same rule as lib/enrich/catalog-image.mjs imageRef, against <root>/site.config.json. */
function catalogFor(root) {
  const path = join(root, "site.config.json");
  if (!existsSync(path)) usage(`no site.config.json under --root ${root}`);
  const images = JSON.parse(readFileSync(path, "utf8")).images ?? null;
  const lookup = (name) => {
    if (!images) return null;
    if (Object.prototype.hasOwnProperty.call(images, name)) {
      const slot = images[name];
      return slot && slot.key ? slot : null;
    }
    const items = images.gallery?.items ?? [];
    return (
      items.find((it) => basename(String(it.key)).replace(/\.[^.]+$/, "") === name) ??
      null
    );
  };
  return { lookup, mediaHost: images?.mediaHost ?? null };
}

const ITEM_OPEN = /^ {6}\{$/;
const ITEM_CLOSE = /^ {6}\},$/;
const PROP = /^ {8}([A-Za-z]+):/;
const CONTINUATION = /^ {10,}\S/;
const COMMENT = /^ {8,}\/\//;

/**
 * The line layout of a module's `keyModels.items`: for each item its `{` and `},` line indexes
 * and the line indexes of each property. Refuses anything but the flat layout every grid has.
 */
function scanGrid(text) {
  if (text.includes("\r")) return { error: "CRLF line endings" };
  const lines = text.split("\n");
  const starts = lines.flatMap((l, i) => (/^ {2}keyModels: \{$/.test(l) ? [i] : []));
  if (starts.length !== 1)
    return { error: `${starts.length} "keyModels: {" lines at 2 spaces` };
  let i = starts[0] + 1;
  while (i < lines.length && !/^ {4}items: \[$/.test(lines[i])) {
    if (/^ {2}\S/.test(lines[i])) return { error: 'no "items: [" inside keyModels' };
    i++;
  }
  const items = [];
  for (i += 1; i < lines.length; i++) {
    if (/^ {4}\],$/.test(lines[i])) return { lines, items };
    if (!ITEM_OPEN.test(lines[i])) return { error: `line ${i + 1} is not an item's "{"` };
    const start = i;
    const props = new Map();
    for (i += 1; i < lines.length && !ITEM_CLOSE.test(lines[i]); i++) {
      const m = lines[i].match(PROP);
      if (m) props.set(m[1], [...(props.get(m[1]) ?? []), i]);
      else if (!CONTINUATION.test(lines[i]) && !COMMENT.test(lines[i])) {
        return { error: `line ${i + 1} is not a flat property of a grid item` };
      }
    }
    items.push({ start, end: i, props });
  }
  return { error: "the items array never closes" };
}

let importSerial = 0;
/** A fresh copy of a module's default export: the query defeats the ESM cache. */
async function importFresh(file) {
  importSerial += 1;
  const url = `${pathToFileURL(file).href}?attach=${Date.now()}-${importSerial}`;
  return (await import(url)).default;
}

async function loadPage(root, pageId) {
  const file = join(root, "content", "enriched", `${pageId}.mjs`);
  if (!existsSync(file)) return { unknown: "no content/enriched module with that id" };
  const text = readFileSync(file, "utf8");
  let mod;
  try {
    mod = await importFresh(file);
  } catch (e) {
    return { unknown: `the module does not import (${e.message})` };
  }
  const items = mod?.keyModels?.items;
  if (!Array.isArray(items) || !items.length)
    return { unknown: "the module has no key grid" };
  const layout = scanGrid(text);
  if (!layout.error && layout.items.length !== items.length) {
    layout.error = `${layout.items.length} item blocks in the source, ${items.length} in the module`;
  }
  return { file, text, mod, items, layout };
}

function gitProblem(root, file) {
  const rel = relative(root, file).split(sep).join("/");
  const run = (args) => spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
  const tracked = run(["ls-files", "--error-unmatch", "--", rel]);
  if (tracked.error)
    return `git did not run (${tracked.error.code ?? tracked.error.message})`;
  if (tracked.status !== 0) {
    return `not a committed file (${(tracked.stderr || "").trim().split("\n")[0] || `git exit ${tracked.status}`})`;
  }
  const diff = run(["diff", "--quiet", "HEAD", "--", rel]);
  if (diff.status === 0) return null;
  if (diff.status === 1)
    return "uncommitted changes (commit or wait for the other session)";
  return `git exit ${diff.status}`;
}

const escapeJs = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

/** JSON with object keys sorted, so two objects compare by content rather than key order. */
const canonical = (v) =>
  JSON.stringify(v, (_k, x) =>
    x && typeof x === "object" && !Array.isArray(x)
      ? Object.fromEntries(
          Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        )
      : x,
  );

// ---------------------------------------------------------------------------------------------

const opts = parseArgs(process.argv.slice(2));
const { rows, sha256 } = readMap(opts.map);
const catalog = catalogFor(opts.root);
const isRepoRoot = relative(opts.root, REPO) === "";
const allowed = new Map(
  [...CONFIRMED_PAGES].map(([id, brand]) => [id, `B1 ${brand}, §D.5`]),
);
for (const [id, ref] of opts.allow) {
  if (!allowed.has(id)) allowed.set(id, `${ref}, --allow`);
}

console.log(`\nattach-key-images${opts.dryRun ? " — DRY RUN, nothing is written" : ""}`);
console.log(
  `  root   ${opts.root}${isRepoRoot ? "" : "   (not this repo: a test copy)"}`,
);
console.log(
  `  map    ${opts.map}   sha256 ${sha256.slice(0, 12)}…   ${rows.length} row(s)`,
);
console.log(`  pages  ${[...allowed].map(([id, why]) => `${id} (${why})`).join(" · ")}`);
if (opts.replacePlate)
  console.log(
    `  --replace-plate ${opts.replacePlate}: type plates on that page may be rewritten`,
  );
if (!opts.gitCheck)
  console.log("  --no-git-check: uncommitted module changes are NOT refused");
if (!catalog.mediaHost)
  console.log(
    "  ! site.config.json has no images.mediaHost — no card would show a picture",
  );
console.log("");

// Load every page the map names, once.
const pages = new Map();
for (const r of rows) {
  if (shapeProblem(r) || pages.has(r.pageId)) continue;
  pages.set(r.pageId, await loadPage(opts.root, r.pageId));
}

const rowKey = (r) => `${r.pageId}\u0000${r.modelHe}\u0000${r.years ?? ""}`;
const keyCount = new Map();
const slugCount = new Map();
for (const r of rows) {
  if (shapeProblem(r)) continue;
  keyCount.set(rowKey(r), (keyCount.get(rowKey(r)) ?? 0) + 1);
  if (r.slug && !r.excluded) slugCount.set(r.slug, (slugCount.get(r.slug) ?? 0) + 1);
}

/** One decision per row, in map order. */
const plan = rows.map((r) => {
  const out = (action, reason, extra = {}) => ({ r, action, reason, ...extra });
  const shape = shapeProblem(r);
  if (shape) return out("refuse", `shape: ${shape}`);
  const page = pages.get(r.pageId);
  if (page.unknown) return out("refuse", `unknown page: ${page.unknown}`);
  if (keyCount.get(rowKey(r)) > 1)
    return out("refuse", "duplicate row: the map names this card twice");
  if (r.excluded) return out("skip", "excluded");
  if (r.attach === false) return out("skip", "attach: false");
  if (!r.confirmed) return out("skip", "unconfirmed");
  if (r.pageId === KIA) return out("refuse", "page 98 (קיה) keeps its key-type plates");
  const slug = slugProblem(r.slug);
  if (slug) return out("refuse", `slug: ${slug}`);
  if (slugCount.get(r.slug) > 1)
    return out("refuse", "duplicate slug: two cards would share one picture");
  const ref = catalog.lookup(r.slug);
  if (!ref) return out("skip", "unpublished");
  if (isRepoRoot && (repoImageRef(r.slug)?.key ?? null) !== ref.key) {
    return out("refuse", "imageRef mismatch: this script and catalog-image.mjs disagree");
  }
  if (!allowed.has(r.pageId)) {
    return out("refuse", `page not confirmed: needs --allow ${r.pageId} --ref "§D.n"`);
  }
  if (page.layout.error) return out("refuse", `layout: ${page.layout.error}`);

  const hits = page.items.flatMap((m, k) =>
    m.model === r.modelHe && (m.years ?? null) === (r.years ?? null) ? [k] : [],
  );
  if (hits.length === 0)
    return out("refuse", "not found: no card with that model and years");
  if (hits.length > 1)
    return out("refuse", `ambiguous: ${hits.length} cards with that model and years`);
  const k = hits[0];
  const item = page.items[k];
  const block = page.layout.items[k];
  const modelLines = block.props.get("model") ?? [];
  if (
    modelLines.length !== 1 ||
    page.layout.lines[modelLines[0]] !== `        model: ${JSON.stringify(item.model)},`
  ) {
    return out("refuse", "layout: the card's model line is not the plain one-line form");
  }

  // A card that already has an image is a no-op (or a plate swap) — decided before the line
  // assertion, so re-running a map after its own attach does not trip over the lines it shifted.
  let replaceLine = null;
  if (item.image !== undefined) {
    if (item.image === r.slug) {
      return out(
        "skip",
        item.alt === r.altPage
          ? "already attached"
          : "already attached (its alt differs from the map)",
      );
    }
    if (opts.replacePlate !== r.pageId) return out("skip", `has image "${item.image}"`);
    if (!TYPE_PLATES.has(item.image)) {
      return out(
        "refuse",
        `--replace-plate rewrites type plates only; this card has "${item.image}"`,
      );
    }
    const imageLines = block.props.get("image") ?? [];
    if (
      imageLines.length !== 1 ||
      page.layout.lines[imageLines[0]] !== `        image: ${JSON.stringify(item.image)},`
    ) {
      return out(
        "refuse",
        "layout: the card's image line is not the plain one-line form",
      );
    }
    replaceLine = imageLines[0];
  }
  if (r.line == null) return out("refuse", "no line in the map");
  if (r.line !== modelLines[0] + 1) {
    return out(
      "refuse",
      `stale map: line ${r.line} in the map, the model is on line ${modelLines[0] + 1}`,
    );
  }
  if (item.alt !== undefined) return out("refuse", "the card already has an alt");
  const alt = altProblem(r.altPage, item);
  if (alt) return out("refuse", `alt: ${alt}`);
  return out("attach", replaceLine === null ? "" : `replaces ${item.image}`, {
    page,
    k,
    replaceLine,
  });
});

// Within one grid, every card's alt must stay distinct once this run is applied.
for (const [pageId, page] of pages) {
  if (page.unknown) continue;
  const planned = new Map(
    plan
      .filter((p) => p.action === "attach" && p.r.pageId === pageId)
      .map((p) => [p.k, p]),
  );
  const effective = page.items.map(
    (m, k) => planned.get(k)?.r.altPage ?? m.alt ?? `${m.keyType} ל${m.model}`,
  );
  for (const [k, p] of planned) {
    if (effective.some((a, j) => j !== k && a === p.r.altPage)) {
      Object.assign(p, {
        action: "refuse",
        reason: "alt duplicates another card's alt on this page",
      });
    }
  }
}

// Last, and only for files that would be written: the shared working tree.
if (opts.gitCheck) {
  const gitByFile = new Map();
  for (const p of plan.filter((x) => x.action === "attach")) {
    if (!gitByFile.has(p.page.file))
      gitByFile.set(p.page.file, gitProblem(opts.root, p.page.file));
    const g = gitByFile.get(p.page.file);
    if (g) Object.assign(p, { action: "refuse", reason: `module: ${g}` });
  }
}

for (const p of plan) {
  const r = p.r ?? {};
  const label =
    p.action === "attach"
      ? `attach${p.reason ? ` (${p.reason})` : ""}`
      : `${p.action}:${p.reason}`;
  console.log(
    `  ${r.pageId ?? "?"} ${r.modelHe ?? "?"} ${r.years ?? "-"} -> ${r.slug ?? "-"} | ${r.altPage ?? "-"} | ${label}`,
  );
}

const count = (a) => plan.filter((p) => p.action === a).length;
const refusals = count("refuse");
console.log(`\n  ${count("attach")} attach · ${count("skip")} skip · ${refusals} refuse`);

if (refusals) {
  console.error(
    `\nattach-key-images: ${refusals} refusal(s) — nothing was written. Fix the map or the module and re-run.`,
  );
  process.exit(1);
}
const attaches = plan.filter((p) => p.action === "attach");
if (opts.dryRun || !attaches.length) {
  console.log(
    opts.dryRun ? "\n  dry run: no file was written." : "\n  nothing to attach.",
  );
  process.exit(0);
}

// --- write, bottom-up per file, then prove it -------------------------------------------------
const byFile = new Map();
for (const p of attaches)
  byFile.set(p.page.file, [...(byFile.get(p.page.file) ?? []), p]);

const written = [];
const restore = () => {
  for (const w of written) writeFileSync(w.file, w.original, "utf8");
};
const fail = (msg) => {
  restore();
  console.error(
    `\nattach-key-images: ${msg}\n  every file written by this run was restored.`,
  );
  process.exit(1);
};

for (const [file, edits] of byFile) {
  const page = edits[0].page;
  const current = readFileSync(file, "utf8");
  if (current !== page.text)
    fail(`${relative(opts.root, file)} changed while this run was reading it`);
  const lines = current.split("\n");
  for (const p of [...edits].sort(
    (a, b) => b.page.layout.items[b.k].end - a.page.layout.items[a.k].end,
  )) {
    const end = p.page.layout.items[p.k].end;
    lines.splice(
      end,
      0,
      `        image: "${p.r.slug}",`,
      `        alt: "${escapeJs(p.r.altPage)}",`,
    );
    if (p.replaceLine !== null) lines.splice(p.replaceLine, 1);
  }
  writeFileSync(file, lines.join("\n"), "utf8");
  written.push({ file, original: current });
}

for (const [file, edits] of byFile) {
  const before = edits[0].page.mod;
  let after;
  try {
    after = await importFresh(file);
  } catch (e) {
    fail(`${relative(opts.root, file)} no longer imports: ${e.message}`);
  }
  const items = after?.keyModels?.items ?? [];
  if (items.length !== before.keyModels.items.length) {
    fail(
      `${relative(opts.root, file)}: ${items.length} cards after writing, ${before.keyModels.items.length} before`,
    );
  }
  const expected = structuredClone(before);
  for (const p of edits) {
    if (items[p.k].image !== p.r.slug || items[p.k].alt !== p.r.altPage) {
      fail(
        `${relative(opts.root, file)}: card "${p.r.modelHe}" does not read back as written`,
      );
    }
    expected.keyModels.items[p.k].image = p.r.slug;
    expected.keyModels.items[p.k].alt = p.r.altPage;
  }
  if (canonical(after) !== canonical(expected)) {
    fail(`${relative(opts.root, file)}: something other than the attached cards changed`);
  }
}

const rels = [...byFile.keys()].map((f) => relative(opts.root, f).split(sep).join("/"));
console.log(
  `\n  wrote ${attaches.length} card(s) in ${rels.length} module(s); each re-imported and checked.`,
);
console.log(
  "\n  next, in this order (the working tree is shared, so never `npm run format`):",
);
console.log(`    npx prettier --write ${rels.join(" ")}`);
console.log("    npm run enrich");
console.log(
  "    node scripts/check-freshness.mjs && node scripts/check-typography.mjs && node scripts/check-placeholders.mjs",
);
console.log("    then the full gate (CLAUDE.md §11) before any deploy.\n");
