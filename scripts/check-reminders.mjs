/**
 * The weekly reminder (docs/dynamic-presence-plan.md §4.5 step 4, Phase 3) — reads PRODUCTION,
 * not the repo, so it warns about what visitors actually see, and pushes one message to the
 * owner's phone through ntfy. It never deploys, never writes, and needs no secret except the
 * ntfy topic.
 *
 * Run weekly by .github/workflows/remind.yml (Sunday morning, Israel time), or by hand:
 *
 *   node scripts/check-reminders.mjs                 print only
 *   NTFY_TOPIC=… node scripts/check-reminders.mjs    print and push
 *
 * What it asks, in order (each "to do" line says what to do about it):
 *   1. the status switch (https://imgquarry.com/status/fleet.json): unreadable, or left on
 *      anything but `normal` — a forgotten `quiet` silences every seasonal line for months;
 *   2. deploy drift: production serves a different live.js or schedule than main — something was
 *      committed and never deployed (deploys are human-only, owner decision 5);
 *   3. the homepage updates strip: no new item for 21 days (it hides itself at 45);
 *   4. the pre-written runway: the last fixed-date line ends within 30 days, or a line ends within
 *      14 days with nothing after it;
 *   5. quiet days in the next 7 days (memorial days, fasts — every line goes silent; the Business
 *      Profile's special hours are the owner's to set) and chag in the next 7 days;
 *   6. the calendar's horizon: fewer than 90 days left → run scripts/calendar-sync.mjs.
 *
 * Named check-* so scripts/check-freshness.mjs does not count it as an input of content/site.json
 * (it is not one). Node 20, no dependencies, no clock but the real one.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = process.env.SITE_URL || "https://3locksmiths.co.il";
const STATUS_URL = "https://imgquarry.com/status/fleet.json";
const DAY = 86_400_000;
const now = Date.now();

const todo = [];
const info = [];

/** dd/mm/yyyy in Israel. Intl is fine here: this script ships nothing and gates nothing. */
const IL_DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jerusalem",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const ddmmyyyy = (ms) => IL_DATE.format(new Date(ms));
/** The same shape the sites accept (public/assets/live.js parseStatus). */
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?([+-]\d\d:\d\d|Z)$/;
const days = (ms) => Math.floor(ms / DAY);

async function get(url, init) {
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
    return { status: r.status, text: await r.text(), headers: r.headers };
  } catch (e) {
    return { status: 0, text: "", error: String(e?.message ?? e) };
  }
}

// --- 1. the status switch -------------------------------------------------------------------
{
  const r = await get(`${STATUS_URL}?r=${now}`, { headers: { Origin: SITE } });
  let s = null;
  try {
    s = r.status === 200 ? JSON.parse(r.text) : null;
  } catch {
    s = null;
  }
  const cors = r.headers?.get("access-control-allow-origin");
  const untilOk =
    s?.until === undefined ||
    s?.until === null ||
    s?.until === "" ||
    (typeof s?.until === "string" &&
      ISO.test(s.until) &&
      !Number.isNaN(Date.parse(s.until)));
  if (!s || !["normal", "quiet", "reduced", "off"].includes(s.mode) || !untilOk) {
    todo.push(
      `Status switch unreadable (HTTP ${r.status}${r.error ? `, ${r.error}` : ""}) — every page has its seasonal lines and card OFF. Fix: Sys Admin runbooks/fleet-status-switch.md, "set normal".`,
    );
  } else if (!cors) {
    todo.push(
      "Status switch has no CORS header — browsers cannot read it, so every page has its seasonal lines OFF. Fix: status-switch.mjs cors.",
    );
  } else {
    const lapsed = s.until && Date.parse(s.until) <= now;
    if (s.mode !== "normal" && !lapsed) {
      const since = s.set ? ` since ${ddmmyyyy(Date.parse(s.set))}` : "";
      todo.push(
        `Status switch is "${s.mode}"${since}${s.until ? `, until ${ddmmyyyy(Date.parse(s.until))}` : " with no end date"}. If that is no longer needed: status-switch.mjs set normal.`,
      );
    } else info.push(`Switch: normal.`);
  }
}

// --- 2. deploy drift ------------------------------------------------------------------------
const home = await get(`${SITE}/?r=${now}`);
if (home.status !== 200) {
  todo.push(
    `The homepage answered HTTP ${home.status} ${home.error ?? ""} — check the site.`,
  );
} else {
  const liveJsProd = /\/assets\/live\.js\?v=([0-9a-f]+)/.exec(home.text)?.[1];
  let liveJsRepo = null;
  let liveHeadRepo = null;
  let newestRepo = null;
  try {
    const site = JSON.parse(readFileSync(join(ROOT, "content", "site.json"), "utf8"));
    liveJsRepo = /v=([0-9a-f]+)/.exec(site.assets?.liveJs ?? "")?.[1] ?? null;
    liveHeadRepo = site.assets?.liveHead ?? null;
    const front = site.pages?.find((p) => p.isFront)?.bodyHtml ?? "";
    newestRepo = /data-newest="(\d{4}-\d\d-\d\d)"/.exec(front)?.[1] ?? null;
  } catch {
    /* no checkout of site.json — skip */
  }
  const newestProd = /class="live-updates"[^>]*data-newest="(\d{4}-\d\d-\d\d)"/.exec(
    home.text,
  )?.[1];
  const schedProd = await get(`${SITE}/assets/live-schedule.json?r=${now}`);
  const schedRepoFile = join(ROOT, "public", "assets", "live-schedule.json");
  const norm = (t) => {
    try {
      return JSON.stringify(JSON.parse(t).intervals);
    } catch {
      return null;
    }
  };
  const schedDiffers =
    existsSync(schedRepoFile) &&
    schedProd.status === 200 &&
    norm(schedProd.text) !== norm(readFileSync(schedRepoFile, "utf8"));
  const drift = [
    liveJsRepo && liveJsProd !== liveJsRepo && "live.js",
    schedDiffers && "the schedule",
    liveHeadRepo && !home.text.includes(liveHeadRepo) && "the head script",
    newestRepo && newestRepo !== newestProd && "the updates strip",
  ].filter(Boolean);
  if (drift.length) {
    todo.push(
      `main has changes that are not on the site yet (${drift.join(", ")}). Deploy when ready: ops/deploy-site.ps1 -DryRun, then -Confirm.`,
    );
  }
  const updateWaitingForDeploy = Boolean(newestRepo && newestRepo !== newestProd);

  // --- 3. the updates strip --------------------------------------------------------------------
  const newest = newestProd;
  if (updateWaitingForDeploy) {
    info.push(
      `Updates: a newer item (${newestRepo}) is committed and waits for the deploy.`,
    );
  } else if (!newest) {
    todo.push(
      "The homepage has no updates strip. Send one sentence about something real that happened (announcement-editor).",
    );
  } else {
    const t = Date.parse(`${newest}T00:00:00+03:00`);
    const age = days(now - t);
    const hides = ddmmyyyy(t + 45 * DAY);
    if (age >= 45)
      todo.push(
        `The updates strip is HIDDEN (newest item ${age} days old). Send a new update sentence.`,
      );
    else if (age >= 21)
      todo.push(
        `No new update for ${age} days — the strip hides itself on ${hides}. Send one sentence.`,
      );
    else
      info.push(
        `Updates: newest ${ddmmyyyy(t)} (${age} days); hides ${hides} without a new one.`,
      );
  }
}

// --- 4. runway, 5. quiet days, 6. calendar horizon (the authored registers in this checkout) --
const campaignsFile = join(ROOT, "content", "enriched", "_campaigns.mjs");
const calendarFile = join(ROOT, "content", "enriched", "_calendar.json");
if (existsSync(campaignsFile)) {
  const campaigns = (await import(pathToFileURL(campaignsFile).href)).default;
  const fixed = (campaigns.windows ?? [])
    .filter((w) => !w.during && w.from && w.until)
    .map((w) => ({ id: w.id, from: Date.parse(w.from), until: Date.parse(w.until) }));
  const future = fixed.filter((w) => w.until > now);
  const lastEnd = Math.max(0, ...fixed.map((w) => w.until));
  if (!future.length || lastEnd - now < 30 * DAY) {
    todo.push(
      `The pre-written lines run out ${lastEnd ? `on ${ddmmyyyy(lastEnd)}` : "now"}. Add the next seasonal window(s) to _campaigns.mjs.`,
    );
  }
  for (const w of future) {
    if (w.until - now > 14 * DAY) continue;
    const next = fixed.some(
      (o) => o !== w && o.from <= w.until + 2 * DAY && o.until > w.until,
    );
    if (!next) todo.push(`"${w.id}" ends ${ddmmyyyy(w.until)} with nothing after it.`);
  }
  const live = future.find((w) => w.from <= now);
  info.push(
    live
      ? `Bar: "${live.id}" until ${ddmmyyyy(live.until)}.`
      : `Bar: no fixed-date line today; next starts ${future.length ? ddmmyyyy(Math.min(...future.map((w) => w.from))) : "—"}.`,
  );
}
if (existsSync(calendarFile)) {
  const cal = JSON.parse(readFileSync(calendarFile, "utf8"));
  const hhmm = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
  });
  for (const c of cal.windows ?? []) {
    const from = Date.parse(c.from);
    const until = Date.parse(c.until);
    if (until < now || from - now > 7 * DAY) continue;
    // A window opens on the eve and ends the next evening: the day it is FOR is its last day.
    const day = ddmmyyyy(until - 60_000);
    const silent = `the site is silent from ${ddmmyyyy(from)} ${hhmm.format(new Date(from))} to ${ddmmyyyy(until)} ${hhmm.format(new Date(until))}`;
    if (c.kind === "quiet")
      todo.push(
        `Quiet day ${day}: ${c.label ?? c.id} — ${silent}, by itself. If the business closes, set special hours on the Business Profile.`,
      );
    else if (c.kind === "chag")
      info.push(`Chag ${day}: ${c.label ?? c.id} (seasonal lines pause by themselves).`);
  }
  const through = Date.parse(`${cal.coversThrough}T23:59:00+02:00`);
  const [cy, cm, cd] = String(cal.coversThrough).split("-");
  if (through - now < 90 * DAY)
    todo.push(
      `The calendar ends ${cd}/${cm}/${cy}. Run node scripts/calendar-sync.mjs, then enrich and deploy.`,
    );
}

// --- the message -----------------------------------------------------------------------------
const title = todo.length
  ? `3locksmiths weekly: ${todo.length} to do`
  : "3locksmiths weekly: all good";
const body = [
  ...todo.map((t) => `- ${t}`),
  ...(todo.length && info.length ? [""] : []),
  ...info,
].join("\n");
console.log(title);
console.log(body);

const topic = process.env.NTFY_TOPIC;
if (topic) {
  const server = (process.env.NTFY_SERVER || "https://ntfy.sh").replace(/\/+$/, "");
  const r = await fetch(`${server}/${encodeURIComponent(topic)}`, {
    method: "POST",
    body,
    headers: {
      Title: title,
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
} else {
  console.log("(NTFY_TOPIC not set — printed only)");
}
