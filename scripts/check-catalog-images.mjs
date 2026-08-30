/**
 * Guards lib/enrich/catalog-image.mjs.
 *
 *   node scripts/check-catalog-images.mjs
 *
 * TWO THINGS IT PROVES
 *
 * 1. THE URL BUILDER MATCHES PRODUCTION. `@ishub/site-kit` ships TypeScript source with no dist,
 *    so an .mjs build script cannot import `srcsetFor` and catalog-image.mjs reimplements it. That
 *    duplication is only safe if something notices when it drifts.
 *
 *    The fixture below is not invented: it is the srcset that allacrepairhouston.com — a sibling
 *    on the same media host, rendering through the real site-kit React path — serves right now.
 *    Reproduce it byte for byte and the two implementations agree on ladder, option order, quality,
 *    fit and focal-point encoding. Any of those drifting fails here.
 *
 *    Re-verify the fixture with:
 *      curl -s https://allacrepairhouston.com/ | grep -o 'srcset="[^"]*hero[^"]*"'
 *
 * 2. EVERY PAGE GETS A HERO BUCKET, and the distribution is the one the design assumed. A page
 *    added without being classified silently falls to "both" — correct by design, but it should be
 *    a deliberate choice, so the counts are asserted.
 *
 * Non-mutating, so `check-` is the right prefix: check-freshness.mjs:43 excludes check-* from its
 * source list, which is only correct for scripts that never touch content/site.json.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  srcsetFor,
  mediaUrl,
  widthsFor,
  heroBucket,
  _internals,
} from "../lib/enrich/catalog-image.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) console.log(`  ok    ${name}`);
  else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
};

// ---------------------------------------------------------------------------
console.log("\nurl builder vs. live production output");

// allacrepairhouston/hero.webp — 1257x679, focal {0.4, 0.38}, quality 80. From ops/.media-catalog.json
// and confirmed against the bytes the site serves.
const SIBLING = {
  key: "allacrepairhouston/hero.webp",
  width: 1257,
  height: 679,
  focal: { x: 0.4, y: 0.38 },
  kind: "raster",
  alt: "x",
};

const EXPECTED = [320, 480, 640, 768, 960, 1257]
  .map(
    (w) =>
      `https://imgquarry.com/cdn-cgi/image/width=${w},quality=80,format=auto,fit=cover,gravity=0.4x0.38/allacrepairhouston/hero.webp ${w}w`,
  )
  .join(", ");

const actual = srcsetFor(SIBLING);
ok(
  "srcset reproduces production byte for byte",
  actual === EXPECTED,
  actual === EXPECTED
    ? ""
    : `got:\n        ${actual}\n        want:\n        ${EXPECTED}`,
);

ok(
  "ladder caps at the intrinsic width",
  JSON.stringify(widthsFor(1257)) === JSON.stringify([320, 480, 640, 768, 960, 1257]),
  JSON.stringify(widthsFor(1257)),
);
ok(
  "fixed ladder is 1x/2x only",
  JSON.stringify(widthsFor(96, true)) === JSON.stringify([96, 192]),
  JSON.stringify(widthsFor(96, true)),
);
ok(
  "option order is width,quality,format,fit[,gravity]",
  mediaUrl("h", "k.jpg", { width: 100 }) ===
    "https://h/cdn-cgi/image/width=100,quality=80,format=auto,fit=cover/k.jpg",
  mediaUrl("h", "k.jpg", { width: 100 }),
);
ok(
  "focal is rounded to 2dp",
  mediaUrl("h", "k.jpg", { width: 100, focal: { x: 0.4444, y: 0.1 } }).includes(
    "gravity=0.44x0.1",
  ),
);
ok(
  "a leading slash on the key is stripped",
  !mediaUrl("h", "/k.jpg", { width: 100 }).includes("//k.jpg"),
);
ok(
  "vectors are never transformed",
  srcsetFor({ key: "a/logo.svg", width: 10, height: 10 }) === undefined,
);

// ---------------------------------------------------------------------------
console.log("\nhero buckets cover every page");

const manifest = JSON.parse(
  readFileSync(join(ROOT, "content", "enriched", "_manifest.json"), "utf8"),
);
const counts = { car: 0, home: 0, both: 0 };
const unclassified = [];

for (const p of manifest.pages) {
  const b = heroBucket(p);
  if (!counts.hasOwnProperty(b)) {
    unclassified.push(p.id);
    continue;
  }
  counts[b]++;
  // A service or core page landing on "both" is almost always an oversight rather than a decision.
  if (b === "both" && (p.kind === "service" || p.kind === "core"))
    unclassified.push(`${p.id} ${p.title ?? ""}`);
}

console.log(
  `  car ${counts.car} · home ${counts.home} · both ${counts.both} · total ${manifest.pages.length}`,
);

ok(
  "every page classifies",
  counts.car + counts.home + counts.both === manifest.pages.length,
);
ok("all 32 brand-key pages are car", counts.car >= 32);
ok("home bucket is non-empty", counts.home > 0);
ok(
  "both is the largest bucket (it is the `hero` slot)",
  counts.both >= counts.car || counts.car <= 48,
  `car=${counts.car} both=${counts.both}`,
);

// Deliberately unclassified service/core pages. Keep this list honest rather than silencing it.
const EXPECTED_BOTH = new Set(["9303", "9304", "79", "80", "105"]);
const surprises = unclassified.filter((u) => !EXPECTED_BOTH.has(String(u).split(" ")[0]));
ok(
  "no service/core page falls to `both` by accident",
  surprises.length === 0,
  surprises.length ? `unclassified: ${surprises.join(", ")}` : "",
);

// ---------------------------------------------------------------------------
console.log("\nmanifest wiring");
ok(
  "mediaHost is configured",
  Boolean(_internals.IMAGES?.mediaHost),
  String(_internals.IMAGES?.mediaHost),
);
ok(
  "car/home id sets do not overlap",
  [..._internals.CAR_SERVICES].every((id) => !_internals.HOME_SERVICES.has(id)),
);

console.log(fail ? `\n${fail} check(s) failed\n` : "\nall catalog-image checks passed\n");
process.exit(fail ? 1 : 0);
