/**
 * FLEET LIVE-KIT — which sites are behind? For every Israeli fleet site that has installed the
 * kit, compares each locked file (live-kit.lock.json) with today's kit source in this repo and
 * with the file actually on disk there.
 *
 *   node fleet/live-kit/check-fleet.mjs          (exit 1 when any site is behind or forked)
 *
 * current  — every copy matches today's kit
 * behind   — the site holds an older kit (a calendar regeneration, a gate fix): re-sync it
 * forked   — a copy in the site differs from its own lock (someone edited it there)
 * missing  — the site has no lock yet (not rolled out)
 * Run it after every sync and after every `node scripts/calendar-sync.mjs`.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FILES, PILOT, sha } from "./sync.mjs";

const SITES = [
  "betonplus.co.il",
  "dangates.co.il",
  "gagoline.co.il",
  "galbath.co.il",
  "hambabait.co.il",
  "myhomeplumber.co.il",
  "netomazganim.co.il",
  "skyshade.co.il",
  "thermoleak.co.il",
  "visionsecurity.co.il",
];
const today = Object.fromEntries(
  Object.entries(FILES).map(([dest, src]) => [dest, sha(readFileSync(join(PILOT, src)))]),
);
let bad = 0;
for (const name of SITES) {
  const dir = join(PILOT, "..", name);
  const lockFile = join(dir, "live-kit.lock.json");
  if (!existsSync(lockFile)) {
    console.log(`${name.padEnd(22)} missing  (no kit yet)`);
    continue;
  }
  const lock = JSON.parse(readFileSync(lockFile, "utf8"));
  const behind = [];
  const forked = [];
  for (const dest of Object.keys(FILES)) {
    const locked = lock.files?.[dest];
    if (locked !== today[dest]) behind.push(dest);
    const f = join(dir, dest);
    if (!existsSync(f) || sha(readFileSync(f)) !== locked) forked.push(dest);
  }
  const state = forked.length ? "forked" : behind.length ? "behind" : "current";
  if (state !== "current") bad += 1;
  console.log(
    `${name.padEnd(22)} ${state.padEnd(8)} kit ${String(lock.source?.commit ?? "?").slice(0, 12)}` +
      (behind.length ? ` · behind: ${behind.join(", ")}` : "") +
      (forked.length ? ` · edited there: ${forked.join(", ")}` : ""),
  );
}
process.exit(bad ? 1 : 0);
