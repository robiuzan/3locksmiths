/**
 * FLEET LIVE-KIT — the weekly reminder for one site. Reads PRODUCTION and this repo's registers,
 * prints one message and, with NTFY_TOPIC set, pushes it to the owner's phone. Never builds,
 * deploys or writes (owner decision 5). Canonical in 3locksmiths.co.il/fleet/live-kit/scripts/,
 * hash-locked into each site; run weekly by .github/workflows/remind.yml.
 *
 *   node scripts/live/check-reminders.mjs                 print only
 *   NTFY_TOPIC=… node scripts/live/check-reminders.mjs    print and push
 *
 * Asks: is the fleet status switch readable by THIS site; does production carry what the repo
 * would build (head script, calm script, live.js); is the homepage updates strip older than 21
 * days (it hides at 45); does the pre-written runway end within 30 days. It pushes ONLY when one
 * of those needs the owner. What is the same for every site — the switch's mode, quiet days, chag,
 * the calendar's horizon — is printed here and pushed once, by the 3locksmiths reminder.
 * Named check-* so a site's freshness checks never treat it as a build input.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { calmScript, headScript, newestUpdate } from "../../lib/live/render.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CFG = (await import(pathToFileURL(join(ROOT, "live.config.mjs")).href)).default;
const DIR = join(ROOT, CFG.dir ?? "content/live");
const SITE = process.env.SITE_URL || CFG.url;
const NAME = CFG.site || SITE.replace(/^https?:\/\//, "");
const STATUS_URL = "https://imgquarry.com/status/fleet.json";
const DAY = 86_400_000;
const now = Date.now();
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?([+-]\d\d:\d\d|Z)$/;
const IL = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jerusalem",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const HM = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jerusalem",
  hour: "2-digit",
  minute: "2-digit",
});
const d = (ms) => IL.format(new Date(ms));
const todo = [];
const info = [];

async function get(url, init) {
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
    return { status: r.status, text: await r.text(), headers: r.headers };
  } catch (e) {
    return { status: 0, text: "", error: String(e?.message ?? e) };
  }
}
const load = async (f) =>
  existsSync(f) ? (await import(pathToFileURL(f).href)).default : null;
const campaigns = await load(join(DIR, "_campaigns.mjs"));
const updates = await load(join(DIR, "_updates.mjs"));
const cal = JSON.parse(readFileSync(join(DIR, "_calendar.json"), "utf8"));

// 1. the switch, as THIS site's browsers read it
{
  const r = await get(`${STATUS_URL}?r=${now}`, { headers: { Origin: SITE } });
  let s = null;
  try {
    s = r.status === 200 ? JSON.parse(r.text) : null;
  } catch {
    s = null;
  }
  const untilOk =
    s?.until == null ||
    s?.until === "" ||
    (typeof s.until === "string" && ISO.test(s.until));
  if (!s || !["normal", "quiet", "reduced", "off"].includes(s.mode) || !untilOk)
    todo.push(
      `Status switch unreadable (HTTP ${r.status}) — every page has its seasonal lines and card OFF.`,
    );
  else if (!r.headers?.get("access-control-allow-origin"))
    todo.push(
      `Status switch has no CORS header for ${SITE} — browsers here cannot read it, so seasonal lines are OFF. Add the origin (Sys Admin status-switch.mjs ORIGINS, then cors).`,
    );
  // The mode is one switch for the whole fleet: the 3locksmiths reminder reports it, so ten sites
  // do not push the same line. Unreadable or no CORS for THIS origin stays a to-do here.
  else if (s.mode !== "normal" && !(s.until && Date.parse(s.until) <= now))
    info.push(
      `Switch: "${s.mode}"${s.until ? ` until ${d(Date.parse(s.until))}` : ""} (fleet-wide; the 3locksmiths reminder reports it).`,
    );
  else info.push("Switch: normal.");
}

// 2. production vs the repo
const home = await get(`${SITE}/?r=${now}`);
let newestProd = null;
if (home.status !== 200)
  todo.push(
    `The homepage answered HTTP ${home.status} ${home.error ?? ""} — check the site.`,
  );
else if (campaigns) {
  newestProd =
    /class="live-updates"[^>]*data-newest="(\d{4}-\d\d-\d\d)"/.exec(home.text)?.[1] ??
    null;
  const drift = [];
  if (!home.text.includes(headScript({ campaigns, calendar: cal })))
    drift.push("the schedule");
  if (
    !home.text.includes(
      calmScript({
        calm: CFG.calm ?? [],
        noDialog: CFG.noDialog ?? [],
        campaigns,
        newest: newestUpdate(updates),
      }),
    )
  )
    drift.push("the calm pages");
  const lj = join(ROOT, "public", "assets", "live.js");
  if (existsSync(lj)) {
    const v = createHash("sha256").update(readFileSync(lj)).digest("hex").slice(0, 12);
    if (!home.text.includes(`/assets/live.js?v=${v}`)) drift.push("live.js");
  }
  const items = updates?.items ?? [];
  const newestRepo = items.length
    ? [...items]
        .map((u) => u.date)
        .sort()
        .pop()
    : null;
  if (newestRepo && newestRepo !== newestProd) drift.push("the updates strip");
  if (drift.length)
    todo.push(
      `The repo has changes that are not on the site yet (${drift.join(", ")}). Deploy when ready.`,
    );
  // 3. the strip
  const newest = newestProd;
  if (newestRepo && newestRepo !== newestProd)
    info.push(`Updates: ${newestRepo} is committed and waits for a deploy.`);
  else if (!newest)
    todo.push(
      "The homepage has no updates strip. Send one sentence about something real that happened.",
    );
  else {
    const t = Date.parse(`${newest}T00:00:00+03:00`);
    const age = Math.floor((now - t) / DAY);
    if (age >= 45)
      todo.push(
        `The updates strip is HIDDEN (newest item ${age} days old). Send a new sentence.`,
      );
    else if (age >= 21)
      todo.push(
        `No new update for ${age} days — the strip hides itself on ${d(t + 45 * DAY)}.`,
      );
    else info.push(`Updates: newest ${d(t)} (${age} days).`);
  }
}

// 4. runway
if (campaigns) {
  const fixed = (campaigns.windows ?? [])
    .filter((w) => !w.during && w.from && w.until)
    .map((w) => ({ id: w.id, from: Date.parse(w.from), until: Date.parse(w.until) }));
  const lastEnd = Math.max(0, ...fixed.map((w) => w.until));
  if (!fixed.some((w) => w.until > now) || lastEnd - now < 30 * DAY)
    todo.push(
      `The pre-written lines run out ${lastEnd ? `on ${d(lastEnd)}` : "now"}. Add the next seasonal window(s).`,
    );
  for (const w of fixed) {
    if (w.until < now || w.until - now > 14 * DAY) continue;
    if (!fixed.some((o) => o !== w && o.from <= w.until + 2 * DAY && o.until > w.until))
      todo.push(`"${w.id}" ends ${d(w.until)} with nothing after it.`);
  }
}

// 5. quiet days and chag this week; 6. the calendar's horizon. The calendar is the pilot's, synced
// into every site: the 3locksmiths reminder pushes these once for the fleet, so here they are
// printed only — a memorial day must not arrive as ten identical high-priority pushes.
for (const c of cal.windows ?? []) {
  const from = Date.parse(c.from);
  const until = Date.parse(c.until);
  if (until < now || from - now > 7 * DAY) continue;
  const day = d(until - 60_000);
  if (c.kind === "quiet")
    info.push(
      `Quiet day ${day}: ${c.label ?? c.id} — silent from ${d(from)} ${HM.format(new Date(from))} by itself.`,
    );
  else if (c.kind === "chag")
    info.push(`Chag ${day}: ${c.label ?? c.id} (seasonal lines pause by themselves).`);
}
const [cy, cm, cd] = String(cal.coversThrough).split("-");
if (Date.parse(`${cal.coversThrough}T23:59:00+02:00`) - now < 90 * DAY)
  info.push(
    `The calendar ends ${cd}/${cm}/${cy} (fleet-wide; the 3locksmiths reminder reports it).`,
  );

// One push only when THIS site needs something; an all-good week is printed, never pushed (nine
// sites saying "all good" every Sunday would train the owner to ignore the channel).
const title = todo.length
  ? `${NAME} weekly: ${todo.length} to do`
  : `${NAME} weekly: all good`;
const body = [
  ...todo.map((t) => `- ${t}`),
  ...(todo.length && info.length ? [""] : []),
  ...info,
].join("\n");
console.log(title);
console.log(body);
const topic = process.env.NTFY_TOPIC;
if (topic && !todo.length) console.log("(all good — nothing pushed)");
else if (topic) {
  const server = (process.env.NTFY_SERVER || "https://ntfy.sh").replace(/\/+$/, "");
  const r = await fetch(`${server}/${encodeURIComponent(topic)}`, {
    method: "POST",
    body,
    headers: {
      Title: title.replace(/[^\x20-\x7e]/g, " "),
      Priority: todo.length ? "high" : "low",
      Tags: todo.length ? "calendar" : "white_check_mark",
      Click: SITE,
    },
  });
  if (!r.ok) {
    console.error(`ntfy push failed: HTTP ${r.status}`);
    process.exit(1);
  }
  console.log("(pushed to ntfy)");
} else if (process.env.CI) {
  // On GitHub a missing secret means the owner silently gets nothing: make the run red.
  console.log(
    "::error::NTFY_TOPIC is not set — add it: gh secret set NTFY_TOPIC -R <owner>/<this repo>",
  );
  process.exit(1);
} else console.log("(NTFY_TOPIC not set — printed only)");
