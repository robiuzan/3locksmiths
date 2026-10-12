/**
 * FLEET LIVE-KIT — install or update the kit in one fleet site, and lock it.
 *
 *   node fleet/live-kit/sync.mjs <path to a site repo> [--dry-run] [--allow-dirty]
 *
 * Copies the fleet's one tested source into the site and writes <site>/live-kit.lock.json
 * (sha256 of every copy + this repo's full commit). The site's prebuild runs
 * scripts/live/check-live-copy.mjs, which fails if any copy is edited there. Only these files
 * are touched, plus two ignore files (.prettierignore: formatters stay off the locked bytes;
 * .gitattributes: `text eol=lf`, so a Windows checkout never rewrites their line endings). The
 * site's own adapter (live.config.mjs, content/live/_campaigns.mjs + _updates.mjs, the
 * components, the CSS theme variables) is never overwritten.
 *
 * Refuses to copy kit sources that are not committed here (the lock must name bytes some commit
 * of this repo holds); --allow-dirty is for local experiments only — never for a site that ships.
 * After `node scripts/calendar-sync.mjs` here, re-sync EVERY site — the calendar is fleet data;
 * `node fleet/live-kit/check-fleet.mjs` lists the sites that are behind.
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = dirname(fileURLToPath(import.meta.url));
export const PILOT = join(KIT, "..", "..");

/** destination in the site → source in this repo */
export const FILES = {
  "lib/live/resolve.mjs": "lib/live/resolve.mjs",
  "lib/live/compile.mjs": "lib/live/compile.mjs",
  "lib/live/head-script.mjs": "lib/live/head-script.mjs",
  "lib/live/topbar.mjs": "lib/live/topbar.mjs",
  "lib/live/israel-time.mjs": "lib/live/israel-time.mjs",
  "lib/live/claims.mjs": "lib/live/claims.mjs",
  "lib/live/render.mjs": "fleet/live-kit/lib/render.mjs",
  "lib/live/live-core.css": "fleet/live-kit/css/live-core.css",
  "public/assets/live.js": "public/assets/live.js",
  "content/live/_calendar.json": "content/enriched/_calendar.json",
  "content/live/_calendar.overlay.json": "content/enriched/_calendar.overlay.json",
  "scripts/live/check-live-copy.mjs": "fleet/live-kit/scripts/check-live-copy.mjs",
  "scripts/live/check-live-register.mjs":
    "fleet/live-kit/scripts/check-live-register.mjs",
  "scripts/live/check-live-out.mjs": "fleet/live-kit/scripts/check-live-out.mjs",
  "scripts/live/check-live-schedule.mjs":
    "fleet/live-kit/scripts/check-live-schedule.mjs",
  "scripts/live/check-reminders.mjs": "fleet/live-kit/scripts/check-reminders.mjs",
};

/** Paths formatters must leave alone and git must keep at LF. */
export const LOCKED_GLOBS = [
  "lib/live/",
  "scripts/live/",
  "content/live/_calendar*.json",
  "public/assets/live.js",
  "live-kit.lock.json",
];

export const sha = (buf) => createHash("sha256").update(buf).digest("hex");

/** The kit's sources are committed here, and the full commit that holds them. */
export function kitCommit() {
  const srcs = [...new Set(Object.values(FILES))];
  const dirty = execSync(
    `git status --porcelain -- ${srcs.map((s) => `"${s}"`).join(" ")}`,
    {
      cwd: PILOT,
    },
  )
    .toString()
    .trim();
  const commit = execSync("git rev-parse HEAD", { cwd: PILOT }).toString().trim();
  return { commit, dirty };
}

/** check-live-copy.mjs carries its own list of required files — it must be FILES, exactly. */
function assertRequiredList() {
  const src = readFileSync(join(KIT, "scripts", "check-live-copy.mjs"), "utf8");
  const block = /const REQUIRED = \[([\s\S]*?)\];/.exec(src);
  if (!block) throw new Error("check-live-copy.mjs has no REQUIRED list");
  const listed = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();
  const want = Object.keys(FILES).sort();
  if (JSON.stringify(listed) !== JSON.stringify(want))
    throw new Error(
      "check-live-copy.mjs REQUIRED ≠ sync.mjs FILES — update both together",
    );
}

function appendLines(file, header, lines) {
  const cur = existsSync(file) ? readFileSync(file, "utf8") : "";
  const have = new Set(cur.split(/\r?\n/));
  const add = lines.filter((l) => !have.has(l));
  if (add.length) {
    const base = cur.trim() ? cur.replace(/\s*$/, "\n") + "\n" : "";
    writeFileSync(file, base + header + "\n" + add.join("\n") + "\n");
  }
}

function main() {
  const site = process.argv[2] && resolve(process.argv[2]);
  const dry = process.argv.includes("--dry-run");
  const allowDirty = process.argv.includes("--allow-dirty");
  if (!site || !existsSync(join(site, "package.json"))) {
    console.error(
      "usage: node fleet/live-kit/sync.mjs <site repo> [--dry-run] [--allow-dirty]",
    );
    process.exit(1);
  }
  assertRequiredList();
  const { commit, dirty } = kitCommit();
  // A dry run writes nothing, so it may preview a dirty kit (README "Install / update" step 1).
  if (dirty && !allowDirty && !dry) {
    console.error(
      "sync: the kit sources have uncommitted changes in 3locksmiths.co.il — commit them first " +
        "(the lock must name bytes a commit holds). Local experiments only: --allow-dirty.\n" +
        dirty,
    );
    process.exit(1);
  }
  const files = {};
  for (const [dest, src] of Object.entries(FILES)) {
    const from = join(PILOT, src);
    if (!existsSync(from)) throw new Error(`kit source missing: ${src}`);
    const to = join(site, dest);
    const bytes = readFileSync(from);
    files[dest] = sha(bytes);
    const same = existsSync(to) && sha(readFileSync(to)) === files[dest];
    console.log(`${same ? "  same   " : dry ? "  WOULD  " : "  copy   "} ${dest}`);
    if (!dry && !same) {
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(from, to);
    }
  }
  const lock = {
    about:
      "Fleet live-kit copies, installed by 3locksmiths.co.il/fleet/live-kit/sync.mjs — never edit them here; scripts/live/check-live-copy.mjs fails the build if you do.",
    source: {
      repo: "3locksmiths.co.il",
      commit: dirty ? `${commit}+dirty` : commit,
      // Israel's date, not UTC's: a sync after midnight here was stamped with yesterday. A
      // human-run tool, so Intl is fine (the rule against it covers the build chains).
      date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(
        new Date(),
      ),
    },
    files,
  };
  if (!dry) {
    writeFileSync(join(site, "live-kit.lock.json"), JSON.stringify(lock, null, 2) + "\n");
    appendLines(
      join(site, ".prettierignore"),
      "# fleet live-kit copies (byte-locked)",
      LOCKED_GLOBS,
    );
    appendLines(
      join(site, ".gitattributes"),
      "# fleet live-kit copies are byte-locked: never let a checkout rewrite their line endings",
      LOCKED_GLOBS.map((g) =>
        g.endsWith("/") ? `${g}** text eol=lf` : `${g} text eol=lf`,
      ),
    );
  }
  console.log(
    `${dry ? "would lock" : "locked"} ${Object.keys(files).length} file(s) at kit ${lock.source.commit.slice(0, 12)}${dirty ? " (DIRTY — not for a site that ships)" : ""}`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main();
