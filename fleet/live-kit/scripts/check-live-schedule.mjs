/**
 * FLEET LIVE-KIT — check-live-schedule.mjs (node:test). Proves, on THIS site's real registers,
 * that the reference resolver, the compiled schedule and the shipped inline head script agree at
 * every hour of the next 400 days and on both sides of every boundary — in every status-switch
 * mode — that the calm script marks exactly the configured pages, and that the shipped live.js
 * fails closed. Canonical in 3locksmiths.co.il/fleet/live-kit/scripts/ (harnesses lifted from the
 * pilot's scripts/check-schedule.mjs), hash-locked into each site. Do not edit a site copy.
 *
 *   node scripts/live/check-live-schedule.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, toMs } from "../../lib/live/resolve.mjs";
import { compile, expand } from "../../lib/live/compile.mjs";
import { liveHeadScript } from "../../lib/live/head-script.mjs";
import { calmScript, headScript, newestUpdate } from "../../lib/live/render.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CFG = (await import(pathToFileURL(join(ROOT, "live.config.mjs")).href)).default;
const DIR = join(ROOT, CFG.dir ?? "content/live");
const HOUR = 3_600_000;
const DAYS = 400;
const load = async (f) =>
  existsSync(f) ? (await import(pathToFileURL(f).href)).default : null;
const campaigns = (await load(join(DIR, "_campaigns.mjs"))) ?? { windows: [] };
const calendar =
  JSON.parse(readFileSync(join(DIR, "_calendar.json"), "utf8")).windows ?? [];
const windows = campaigns.windows ?? [];
const updates = await load(join(DIR, "_updates.mjs"));

function lookup(intervals, ms) {
  for (const iv of intervals) if (iv.from <= ms && ms < iv.until) return iv.variant;
  return "evergreen";
}

function bootHeadScript(intervals, search = "", { storage = null, now = 0 } = {}) {
  const state = {
    now,
    attr: null,
    css: null,
    listeners: {},
    docListeners: {},
    attrs: {},
    resizes: 0,
    timer: null,
  };
  const style = {
    set textContent(v) {
      state.css = v;
    },
  };
  const sandbox = {
    document: {
      documentElement: {
        setAttribute: (k, v) => {
          state.attrs[k] = String(v);
          if (k === "data-live") state.attr = v;
        },
        getAttribute: (k) => (k in state.attrs ? state.attrs[k] : null),
      },
      head: { appendChild() {} },
      createElement: () => style,
      addEventListener: (type, fn) => {
        state.docListeners[type] = fn;
      },
      hidden: false,
    },
    location: { search },
    addEventListener: (type, fn) => {
      state.listeners[type] = fn;
    },
    Date: { now: () => state.now, parse: Date.parse },
    dispatchEvent: (e) => {
      if (e.type === "resize") state.resizes += 1;
    },
    Event: class {
      constructor(type) {
        this.type = type;
      }
    },
    Math,
    setTimeout: (fn, ms) => {
      state.timer = { fn, ms };
      return 1;
    },
    clearTimeout: () => {
      state.timer = null;
    },
    parseInt,
    isNaN,
    decodeURIComponent,
  };
  if (storage) sandbox.localStorage = { getItem: (k) => storage[k] ?? null };
  vm.runInNewContext(liveHeadScript(intervals), sandbox);
  return {
    at(ms) {
      state.now = ms;
      state.listeners.pageshow();
      return state.attr;
    },
    /** What live.js does with the switch's answer: set the mode, fire `live-mode`. */
    mode(m) {
      state.attrs["data-live-mode"] = m;
      state.docListeners["live-mode"]();
      return state.attr;
    },
    /** Let the armed timer fire, as the browser would at that moment. */
    tick() {
      const t = state.timer;
      if (!t) return null;
      state.now += t.ms;
      state.timer = null;
      t.fn();
      return state.attr;
    },
    state,
  };
}

function* probes(intervals, start, end, extra = []) {
  for (let ms = start; ms < end; ms += HOUR) yield ms;
  for (const iv of intervals) {
    for (const edge of [iv.from, iv.until]) yield* [edge - 60_000, edge, edge + 60_000];
  }
  for (const ms of extra) yield* [ms - 60_000, ms, ms + 60_000];
}

function liveJsRules() {
  const hook = {};
  const window = { __liveTest: hook };
  vm.runInNewContext(readFileSync(join(ROOT, "public", "assets", "live.js"), "utf8"), {
    window,
    document: {},
    Date,
    isNaN,
    parseInt,
  });
  return hook;
}

function bootLiveJs({
  fetch,
  cache = null,
  search = "",
  dialog = null,
  pv = 0,
  now = 1_000_000,
  referrer = "",
}) {
  const attrs = { "data-live": dialog ? dialog.variant : "evergreen" };
  const store = cache ? { "ls-status": cache } : {};
  const session = { "ls-pv": String(pv) };
  const timers = [];
  let tid = 0;
  const events = [];
  const docListeners = {};
  let fetched = 0;
  let shown = 0;
  const makeCard = () => ({
    open: false,
    returnValue: "",
    isConnected: true,
    getAttribute: (k) => (k === "data-cap-days" ? "14" : null),
    addEventListener() {},
    showModal() {
      if (!this.isConnected) throw new Error("InvalidStateError: not in a Document");
      shown += 1;
      this.open = true;
    },
    close() {
      this.open = false;
    },
  });
  let card = dialog ? makeCard() : null;
  let calmPage = false;
  const document = {
    documentElement: {
      getAttribute: (k) => (k in attrs ? attrs[k] : null),
      hasAttribute: (k) => k in attrs,
      setAttribute: (k, v) => {
        attrs[k] = String(v);
      },
      removeAttribute: (k) => {
        delete attrs[k];
      },
    },
    querySelector: (sel) => {
      if (sel === "[data-live-calm-page]") return calmPage ? {} : null;
      if (!card || sel.indexOf("dialog.live-dialog") !== 0) return null;
      return sel.includes("[open]") && !card.open ? null : card;
    },
    dispatchEvent: (e) => events.push(e.type),
    addEventListener: (type, fn) =>
      (docListeners[type] = docListeners[type] || []).push(fn),
    removeEventListener: (type, fn) => {
      docListeners[type] = (docListeners[type] || []).filter((f) => f !== fn);
    },
    hidden: false,
    activeElement: null,
    referrer,
  };
  const mkStorage = (o) => ({
    getItem: (k) => (k in o ? o[k] : null),
    setItem: (k, v) => {
      o[k] = String(v);
    },
    removeItem: (k) => {
      delete o[k];
    },
  });
  const window = {
    localStorage: mkStorage(store),
    sessionStorage: mkStorage(session),
    fetch:
      fetch &&
      ((...a) => {
        fetched += 1;
        return fetch(...a);
      }),
    addEventListener() {},
    removeEventListener() {},
    innerHeight: 800,
    pageYOffset: 0,
  };
  vm.runInNewContext(readFileSync(join(ROOT, "public", "assets", "live.js"), "utf8"), {
    window,
    document,
    location: { search },
    Date: { now: () => now, parse: Date.parse },
    Event: class {
      constructor(type) {
        this.type = type;
      }
    },
    setTimeout: (fn, ms) => {
      const t = { id: ++tid, fn, ms, dead: false };
      timers.push(t);
      return t.id;
    },
    clearTimeout: (id) => {
      const t = timers.find((x) => x.id === id);
      if (t) t.dead = true;
    },
    JSON,
    Object,
    Number,
    Math,
    Error,
    parseInt,
    isNaN,
  });
  return {
    attrs,
    store,
    session,
    events,
    get fetched() {
      return fetched;
    },
    get shown() {
      return shown;
    },
    /** Let every live timer of `ms` fire, as the browser would at that moment. */
    fire(ms) {
      for (const t of timers.splice(0)) {
        if (t.dead) continue;
        if (t.ms === ms) t.fn();
        else timers.push(t);
      }
    },
    /** A React site's client-side navigation, as the kit's calm script announces it. */
    nav() {
      for (const fn of docListeners["live-nav"] || []) fn();
    },
    /** The page now carries a [data-live-calm-page] element (a 404 page). */
    markCalmPage(on = true) {
      calmPage = on;
    },
    get cardOpen() {
      return Boolean(card && card.open);
    },
    /** React re-rendered the cards region: the old node is detached, a new one takes its place. */
    replaceCard() {
      if (card) card.isConnected = false;
      card = makeCard();
    },
  };
}

const flush = () => new Promise((r) => setImmediate(r));
const ok = (body) => () =>
  Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(body) });

test("real registers: resolver, compiled schedule and the shipped head script agree — every hour, every mode", () => {
  const intervals = compile(windows, calendar);
  const concrete = { windows: expand(windows, calendar), calendar };
  const start = Date.now() - 2 * 86_400_000;
  const end = start + DAYS * 86_400_000;
  const edges = calendar.flatMap((c) => [toMs(c.from), toMs(c.until)]);
  // The script that ships is the one the site prints: same function, same inputs.
  assert.equal(
    headScript({ campaigns, calendar: { windows: calendar } }),
    liveHeadScript(intervals),
  );
  for (const mode of ["normal", "quiet", "reduced", "off", "fail"]) {
    const page = bootHeadScript(intervals);
    page.mode(mode);
    let n = 0;
    for (const ms of probes(intervals, start, end, edges)) {
      if (mode === "normal")
        assert.equal(
          lookup(intervals, ms),
          resolve(concrete, ms).variant,
          `compiled ≠ resolved at ${new Date(ms).toISOString()}`,
        );
      const want = resolve(concrete, ms, { status: { mode } }).variant;
      assert.equal(
        page.at(ms),
        want === null ? "off" : want,
        `mode ${mode}: head script ≠ resolver at ${new Date(ms).toISOString()}`,
      );
      n += 1;
    }
    assert.ok(n > DAYS * 24 - 1);
  }
});

/** The calm script, run for real in a VM with a history stub — returns the page's marks. */
function bootCalm(src, pathname, now = Date.now()) {
  const attrs = {};
  const events = [];
  const listeners = {};
  const location = { pathname };
  const history = {
    pushState(_s, _t, url) {
      location.pathname = url;
    },
    replaceState(_s, _t, url) {
      if (url) location.pathname = url;
    },
  };
  vm.runInNewContext(src, {
    location,
    window: {
      history,
      addEventListener: (t, fn) => (listeners[t] = fn),
    },
    document: {
      documentElement: {
        setAttribute: (k) => (attrs[k] = true),
        removeAttribute: (k) => delete attrs[k],
      },
      dispatchEvent: (e) => events.push(e.type),
    },
    Event: class {
      constructor(type) {
        this.type = type;
      }
    },
    Date: { now: () => now, parse: Date.parse },
    decodeURI,
  });
  return {
    attrs,
    events,
    go(path) {
      history.pushState(null, "", path);
    },
    back(path) {
      location.pathname = path;
      listeners.popstate();
    },
  };
}

const NEWEST = newestUpdate(updates);
const CALM_SRC = calmScript({
  calm: CFG.calm ?? [],
  noDialog: CFG.noDialog ?? [],
  campaigns,
  newest: NEWEST,
});

test("the calm script marks exactly the configured pages, before first paint", () => {
  const run = (pathname) => bootCalm(CALM_SRC, pathname).attrs;
  const probe = (p) => encodeURI(p.endsWith("*") ? p.slice(0, -1) + "x/" : p);
  for (const p of CFG.calm ?? []) {
    const a = run(probe(p));
    assert.ok(
      a["data-live-calm"] && a["data-live-nodialog"],
      `calm path ${p} not marked`,
    );
    if (!p.endsWith("*") && p.endsWith("/"))
      assert.ok(
        run(encodeURI(p.slice(0, -1)))["data-live-calm"],
        `${p} without its slash`,
      );
  }
  for (const p of CFG.noDialog ?? [])
    assert.ok(run(probe(p))["data-live-nodialog"], `no-card path ${p} not marked`);
  for (const w of windows)
    if (w.dialog?.link?.href)
      assert.ok(
        run(encodeURI(w.dialog.link.href))["data-live-nodialog"],
        "a card opens on its own link target",
      );
  if (!(CFG.calm ?? []).includes("/")) {
    const home = run("/");
    assert.ok(
      !home["data-live-calm"] && !home["data-live-nodialog"],
      "the homepage is marked calm",
    );
  }
  assert.ok(
    !run("/no-such-page-xyz/")["data-live-calm"],
    "an ordinary page is marked calm",
  );
});

test("the calm script follows client-side navigation: marks set AND removed, live-nav once per real move", () => {
  const calmPath = (CFG.calm ?? []).find((p) => !p.endsWith("*"));
  const page = bootCalm(CALM_SRC, "/no-such-page-xyz/");
  assert.deepEqual(page.events, [], "no live-nav for the document load itself");
  if (calmPath) {
    page.go(calmPath);
    assert.ok(page.attrs["data-live-calm"], "a soft navigation to a calm page marks it");
    assert.deepEqual(page.events, ["live-nav"]);
    page.go("/no-such-page-xyz/");
    assert.ok(
      !page.attrs["data-live-calm"] && !page.attrs["data-live-nodialog"],
      "and leaving it unmarks",
    );
    page.back(calmPath);
    assert.ok(page.attrs["data-live-calm"], "the back button re-marks");
    assert.equal(page.events.length, 3);
  }
  page.go(page.attrs["data-live-calm"] ? calmPath : "/no-such-page-xyz/");
  const before = page.events.length;
  page.go(page.attrs["data-live-calm"] ? calmPath : "/no-such-page-xyz/"); // same path (a hash, a state)
  assert.equal(page.events.length, before, "no page view without a path change");
});

test("the calm script hides a stale updates strip from <html> — it survives a re-render", () => {
  if (!NEWEST) return;
  const t = Date.parse(NEWEST + "T00:00:00+03:00");
  assert.ok(!bootCalm(CALM_SRC, "/", t + 44 * 86_400_000).attrs["data-live-stale"]);
  assert.ok(bootCalm(CALM_SRC, "/", t + 46 * 86_400_000).attrs["data-live-stale"]);
});

test("live.js: the status switch's answer can only pick one of five ids, and the card waits for normal", async () => {
  const { parseStatus } = liveJsRules();
  const now = Date.parse("2026-10-04T12:00:00+03:00");
  const p = (o) => ({
    ...parseStatus(typeof o === "string" ? o : JSON.stringify(o), now),
  });
  assert.deepEqual(p({ mode: "normal" }), { mode: "normal", hold: 0 });
  for (const bad of [
    "",
    "x",
    "[]",
    { mode: "QUIET" },
    { mode: "fail" },
    { mode: "__proto__" },
    { mode: "quiet", until: "2026-10-05" },
  ])
    assert.equal(p(bad).mode, "fail", JSON.stringify(bad));
  for (const [fetch, wantOpen] of [
    [ok('{"mode":"normal"}'), 1],
    [ok('{"mode":"quiet"}'), 0],
    [() => Promise.reject(new TypeError("x")), 0],
  ]) {
    const pg = bootLiveJs({ fetch, dialog: { variant: "v" }, pv: 1 });
    await flush();
    await flush();
    pg.fire(1500);
    pg.fire(4000);
    assert.equal(pg.shown, wantOpen);
  }
});

test("live.js: a late switch answer can apply an override, but never re-opens what the timeout closed", async () => {
  // The pilot's case (scripts/check-schedule.mjs), so every fleet prebuild proves the 2026-10-12
  // fix: re-opening after the 1.5 s fail-closed moved a slow phone's layout a second time.
  for (const [body, want] of [
    ['{"mode":"normal"}', "fail"],
    ['{"mode":"off"}', "off"],
    ['{"mode":"reduced"}', "reduced"],
  ]) {
    let release;
    const p = bootLiveJs({
      fetch: () =>
        new Promise((r) => {
          release = () => r({ ok: true, status: 200, text: () => Promise.resolve(body) });
        }),
    });
    p.fire(1500);
    assert.equal(p.attrs["data-live-mode"], "fail");
    release();
    await flush();
    await flush();
    assert.equal(p.attrs["data-live-mode"], want, `late ${body}`);
  }
});

// The four below are the pilot's (scripts/check-schedule.mjs), kept identical so every fleet
// prebuild proves what the 2026-10-11 review fixed: soft navigation, Back/Forward, the 404 marker
// and a card node React replaced. Before 2026-10-12 only a manual browser run covered them.
test("live.js on a React site: a client-side navigation is a page view, and the card can open there", async () => {
  const normal = ok('{"mode":"normal"}');
  // Landing (1st view): the 20 s + scroll rule. Then a click to another page: the 2nd view, 4 s.
  let p = bootLiveJs({ fetch: normal, dialog: { variant: "v" }, pv: 0 });
  await flush();
  await flush();
  p.nav();
  assert.equal(p.session["ls-pv"], "2", "the soft navigation was counted");
  p.fire(20000); // the landing page's wait was cancelled by the navigation
  assert.equal(p.shown, 0);
  p.fire(4000);
  assert.equal(p.shown, 1, "the 2nd page of the visit opens the card after 4 s");
  // A search landing never shows the card on its own page view — a click-through is no longer one.
  p = bootLiveJs({
    fetch: normal,
    dialog: { variant: "v" },
    pv: 0,
    referrer: "https://www.google.com/",
  });
  await flush();
  await flush();
  p.fire(4000);
  p.fire(20000);
  assert.equal(p.shown, 0, "never on the search landing itself");
  p.nav();
  p.fire(4000);
  assert.equal(
    p.shown,
    1,
    "the page clicked to from the landing is not a search landing",
  );
  // A page the kit marked "no card" before the card was due.
  p = bootLiveJs({ fetch: normal, dialog: { variant: "v" }, pv: 1 });
  await flush();
  await flush();
  p.attrs["data-live-nodialog"] = "";
  p.fire(4000);
  assert.equal(p.shown, 0, "data-live-nodialog keeps the card shut");
});

test("live.js: back/forward onto a no-card page closes an open card; a calm page keeps it shut", async () => {
  const normal = ok('{"mode":"normal"}');
  let p = bootLiveJs({ fetch: normal, dialog: { variant: "v" }, pv: 1 });
  await flush();
  await flush();
  p.fire(4000);
  assert.equal(p.cardOpen, true, "the card opened");
  p.attrs["data-live-nodialog"] = ""; // the calm script re-marked the page on popstate
  p.nav();
  p.fire(0);
  assert.equal(p.cardOpen, false, "the card closed on the no-card page");
  // A page that marks itself calm (a 404 page) never gets a card.
  p = bootLiveJs({ fetch: normal, dialog: { variant: "v" }, pv: 1 });
  await flush();
  await flush();
  p.markCalmPage();
  p.fire(4000);
  assert.equal(p.shown, 0, "no card on a [data-live-calm-page] page");
});

test("live.js: the card is looked up when it opens — React may have replaced the node", async () => {
  const p = bootLiveJs({
    fetch: ok('{"mode":"normal"}'),
    dialog: { variant: "v" },
    pv: 1,
  });
  await flush();
  await flush();
  p.replaceCard(); // the old node is detached: showModal() on it would throw
  assert.doesNotThrow(() => p.fire(4000));
  assert.equal(p.shown, 1, "the card in the document opened");
});

test("live.js carries no copy, and its one network read is the status switch", () => {
  const src = readFileSync(join(ROOT, "public", "assets", "live.js"), "utf8");
  assert.doesNotMatch(
    src,
    /[֐-׿]|\\u05[89a-f]/i,
    "a Hebrew letter (or its escape) in live.js — copy belongs in the page HTML",
  );
  assert.doesNotMatch(
    src,
    /XMLHttpRequest|sendBeacon|innerHTML|outerHTML|insertAdjacentHTML|insertAdjacentText|textContent|innerText|createTextNode|document\.write|new Image|\.src\s*=|import\(|\beval\b|Function\(|postMessage|WebSocket|EventSource/,
    "live.js may only select and open what the page already holds",
  );
  assert.equal((src.match(/fetch\(/g) || []).length, 1, "exactly one fetch");
  assert.match(src, /w\.fetch\(STATUS_URL,/, "…and it reads the status switch");
  assert.deepEqual(
    [...src.matchAll(/"(https?:\/\/[^"]*)"/g)].map((m) => m[1]),
    ["https://imgquarry.com/status/fleet.json"],
    "the only URL in live.js is the switch",
  );
  assert.match(src, /credentials: "omit"/, "no cookies to the bucket");
});
