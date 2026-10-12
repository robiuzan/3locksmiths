/*
 * The live surfaces' behaviour in the browser — loaded deferred on every page from app/layout.tsx
 * (docs/dynamic-presence-plan.md §3.2, §3.3; /dynamic-presence).
 *
 * It carries NO copy. Every visible word is already in the page — the card as a closed <dialog>
 * inside a data-lm-ignore region, rendered by scripts/live-surfaces.mjs where the claims guards
 * read it. This file only decides WHETHER and WHEN to open it, and whether the homepage updates
 * strip is too old to show. check-live-regions fails the build if a Hebrew letter appears here.
 *
 * WHICH CARD. The inline <head> script already chose the live line by date and wrote it to
 * <html data-live>. If a closed <dialog data-dialog="<that line>"> exists on this page, that is
 * the card; otherwise there is nothing to do. The pipeline renders a card only for seasonal
 * lines (never a safety line, never the weekly slot), and never on the calm pages or the pages
 * that tell the reader to call 100/101 — so on Shabbat, a quiet day or an emergency page there
 * is no card to find.
 *
 * WHEN (owner, 2026-09-29; Google's guidance on intrusive interstitials):
 *   - never on a page reached from a search engine (any page view: a return to the results and
 *     back is a search landing again), including the Google app on Android;
 *   - on the 2nd page of a visit or later: after 4 s;
 *   - on a first page from anywhere else: after 20 s AND a scroll of a quarter of the page or
 *     600 px, whichever comes first;
 *   - at most once per card per `data-cap-days` days (14 by default);
 *   - never while a form field has focus, the mobile menu or another dialog is open; if the tab
 *     is hidden at that moment, once it is visible again;
 *   - an open card closes itself when the line changes under it (candle-lighting, a quiet day);
 *   - if storage is unavailable (private mode, some in-app browsers) — never: without it the
 *     frequency cap cannot hold, and a card that returns on every page is worse than none.
 *
 * THE STATUS SWITCH (plan §4.4; ../Sys Admin/runbooks/fleet-status-switch.md). Its ONE network
 * read: https://imgquarry.com/status/fleet.json, after first paint, 1.5 s at most. The answer
 * can only pick one of five fixed ids — normal | quiet | reduced | off, or "fail" when it cannot
 * be read, parsed or trusted — which go to <html data-live-mode>; the inline head script then
 * re-picks the line (lib/live/head-script.mjs). Nothing from the response reaches the page as
 * text. A non-normal mode is cached in localStorage ("<mode>,<expires ms>", 30 min, or until the
 * switch's own `until`; 5 min for a failed read) so the next page applies it BEFORE first paint.
 * The card opens only once the switch has said "normal" on this page view — fail closed. An
 * answer after the 1.5 s limit can still apply an override (quiet / reduced / off), but never
 * brings the normal lines back on that page view.
 * `?mode=…` previews a mode without reading the switch.
 *
 * Deliberately ES5 and wrapped in try/catch: an error here costs the visitor the card, nothing
 * else. Events go to dataLayer as surface_view / surface_dismiss with the line's id only — no
 * personal data (CLAUDE.md §13).
 */
/* eslint-disable @typescript-eslint/no-unused-vars -- ES5: every catch needs a binding */
(function (w, d) {
  "use strict";
  var DAY = 864e5;
  // A web search engine, or the Google app on Android (its referrer is an android-app:// URI).
  var SEARCH =
    /^(https?:\/\/([^\/]*\.)?(google|bing|yahoo|duckduckgo|yandex|baidu|ecosia|startpage)\.|android-app:\/\/com\.google\.android\.(googlequicksearchbox|gm))/i;
  var STALE_DAYS = 45;
  var STATUS_URL = "https://imgquarry.com/status/fleet.json";
  var STATUS_TIMEOUT = 1500;
  var HOLD = 30 * 6e4; // how long a non-normal mode is applied before first paint on later pages
  var FAIL_HOLD = 5 * 6e4;
  var MODES = { normal: 1, quiet: 1, reduced: 1, off: 1 };
  var ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?([+-]\d\d:\d\d|Z)$/;

  /**
   * Pure: the switch's answer → { mode, hold }. mode is ONLY ever one of normal / quiet /
   * reduced / off / fail; hold is how long to cache it (0 = do not). Anything unexpected —
   * not JSON, an unknown mode, an `until` without a timezone — is "fail": the conservative
   * state, never a guess. An `until` in the past means the override has lapsed: normal.
   */
  function parseStatus(text, now) {
    var o;
    var failed = { mode: "fail", hold: FAIL_HOLD };
    try {
      o = JSON.parse(text);
    } catch (e) {
      return failed;
    }
    if (!o || typeof o !== "object" || typeof o.mode !== "string") return failed;
    if (!Object.prototype.hasOwnProperty.call(MODES, o.mode)) return failed;
    var hold = HOLD;
    if (o.until !== undefined && o.until !== null && o.until !== "") {
      if (typeof o.until !== "string" || !ISO.test(o.until)) return failed;
      var t = Date.parse(o.until);
      if (isNaN(t)) return failed;
      if (now >= t) return { mode: "normal", hold: 0 };
      hold = Math.min(hold, t - now);
    }
    return { mode: o.mode, hold: o.mode === "normal" ? 0 : hold };
  }

  /** Pure: did this page view arrive from a search engine? */
  function fromSearch(referrer) {
    return SEARCH.test(referrer || "");
  }

  /**
   * Pure: what to do with a card on this page view. "none" | "soon" | "engaged".
   * A search referrer wins at ANY page view: a visitor who goes back to the results and opens
   * this site again, or reloads a search landing, is on a search landing again.
   */
  function rules(env) {
    if (!env.hasDialog || !env.storageOk) return "none";
    if (env.lastShown && env.now - env.lastShown < env.capDays * DAY) return "none";
    if (env.fromSearch) return "none";
    if (env.pageviews >= 2) return "soon";
    return "engaged";
  }

  /** Pure: is the newest update (YYYY-MM-DD, Israel date) older than 45 days at `now`? */
  function stale(newest, now) {
    var t = Date.parse(newest + "T00:00:00+03:00");
    return isNaN(t) || now - t > STALE_DAYS * DAY;
  }

  if (w.__liveTest) {
    w.__liveTest.rules = rules;
    w.__liveTest.stale = stale;
    w.__liveTest.fromSearch = fromSearch;
    w.__liveTest.parseStatus = parseStatus;
    return;
  }

  function push(o) {
    try {
      (w.dataLayer = w.dataLayer || []).push(o);
    } catch (e) {}
  }

  var h = d.documentElement;

  /** Apply a mode: the attribute, the cache for the next page, and a re-pick by the head script. */
  function setMode(mode, hold) {
    h.setAttribute("data-live-mode", mode);
    try {
      if (hold > 0) w.localStorage.setItem("ls-status", mode + "," + (Date.now() + hold));
      else w.localStorage.removeItem("ls-status");
    } catch (e) {}
    try {
      d.dispatchEvent(new Event("live-mode"));
    } catch (e) {}
  }

  /**
   * No answer from the switch (slow, offline, blocked): a still-valid quiet / reduced / off that an
   * earlier page cached is a better guess than "fail" — it is what the switch said minutes ago, and
   * throwing it away would bring the bar (or a seasonal line) back for exactly the visitors on a
   * slow phone. Only with nothing valid cached does the page fail closed.
   */
  function noAnswer(hold) {
    var c;
    try {
      c = (w.localStorage.getItem("ls-status") || "").split(",");
    } catch (e) {
      c = [];
    }
    var left = Number(c[1]) - Date.now();
    if (/^(quiet|reduced|off)$/.test(c[0]) && left > 0) setMode(c[0], left);
    else setMode("fail", hold);
  }

  // --- the status switch -----------------------------------------------------------------------
  try {
    if (!/[?&]mode=/.test(location.search)) {
      if (!w.fetch) {
        noAnswer(0);
      } else {
        var answered = false; // a response (good or bad) arrived — a late one still counts
        var late = false; // the timeout already failed this page view closed
        var timer = setTimeout(function () {
          if (answered) return;
          late = true;
          noAnswer(0); // slow, not broken: do not carry "fail" to the next page
        }, STATUS_TIMEOUT);
        // no-cache = revalidate every time (a 304 when unchanged): a flip reaches the next page
        // view, even if the file was uploaded by hand without its Cache-Control header.
        w.fetch(STATUS_URL, { credentials: "omit", mode: "cors", cache: "no-cache" })
          .then(function (r) {
            if (!r.ok) throw new Error("status " + r.status);
            return r.text();
          })
          .then(function (text) {
            answered = true;
            clearTimeout(timer);
            var s = parseStatus(text, Date.now());
            // A LATE "normal" changes nothing: this page view already failed closed at 1.5 s, and
            // re-opening the bar would move the layout a second time on a slow phone (measured
            // 2 shifts, CLS ≈ 0.08 — review, 2026-10-12). A late quiet / reduced / off still
            // applies: an override always wins. The next page view starts fresh.
            if (late && s.mode === "normal") return;
            setMode(s.mode, s.hold);
          })
          ["catch"](function () {
            if (answered) return;
            answered = true;
            clearTimeout(timer);
            noAnswer(FAIL_HOLD);
          });
      }
    }
  } catch (e) {
    try {
      noAnswer(0);
    } catch (e2) {}
  }

  // --- the updates strip: hide it when the newest item is too old ---------------------------
  // (Component sites also hide it from <html data-live-stale>, set before first paint by the fleet
  // live-kit's calm script — that survives a React re-render of the homepage; this is the fallback.)
  function hideStale() {
    var strip = d.querySelector(".live-updates[data-newest]");
    if (strip && stale(strip.getAttribute("data-newest"), Date.now())) {
      strip.setAttribute("hidden", "");
    }
  }
  try {
    hideStale();
  } catch (e) {}

  // --- the card -------------------------------------------------------------------------------
  // Storage first, and the page view counted on EVERY page — not only on pages that carry a card
  // — so "the 2nd page of a visit" means what it says.
  var ls, ss, pv;
  try {
    ls = w.localStorage;
    ls.setItem("ls-t", "1");
    ls.removeItem("ls-t");
    ss = w.sessionStorage;
  } catch (e) {
    return;
  }
  function countView() {
    try {
      pv = (parseInt(ss.getItem("ls-pv"), 10) || 0) + 1;
      ss.setItem("ls-pv", String(pv));
      return true;
    } catch (e) {
      return false;
    }
  }
  if (!countView()) return;

  /** The card for a variant, looked up NOW: a React site may have replaced the node since load. */
  function findCard(variant) {
    var c = d.querySelector('dialog.live-dialog[data-dialog="' + variant + '"]');
    return c && c.isConnected !== false && typeof c.showModal === "function" ? c : null;
  }

  /** The card's own listeners, once per node (dismissal, and the event for the dataLayer). */
  function bind(dlg, variant) {
    if (dlg.__live) return;
    dlg.__live = true;
    dlg.addEventListener("click", function (e) {
      var t = e.target;
      if (t === dlg) {
        // A click whose target is the dialog itself is on the ::backdrop OR on the card's own
        // padding — only the first is a dismissal.
        var r = dlg.getBoundingClientRect();
        var inside =
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom;
        if (!inside) dlg.close("backdrop");
        return;
      }
      while (t && t !== dlg) {
        if (t.classList && t.classList.contains("live-dialog__close"))
          return dlg.close("button");
        if (t.tagName === "A") return dlg.close("action");
        t = t.parentNode;
      }
    });
    dlg.addEventListener("close", function () {
      push({
        event: "surface_dismiss",
        surface: "dialog",
        variant: variant,
        method: dlg.returnValue || "esc",
      });
    });
  }

  var opened = false; // a card opened on this page view
  var timers = [];
  var unscroll = null;
  function later(fn, ms) {
    timers.push(
      setTimeout(function () {
        try {
          fn();
        } catch (e) {}
      }, ms),
    );
  }

  function open(variant) {
    if (opened) return;
    var dlg = findCard(variant);
    if (!dlg) return;
    var a = d.activeElement;
    if (d.hidden) {
      // The visitor switched apps while we waited — try again when they come back.
      d.addEventListener("visibilitychange", function retry() {
        if (d.hidden) return;
        d.removeEventListener("visibilitychange", retry);
        later(function () {
          open(variant);
        }, 1500);
      });
      return;
    }
    if (
      h.getAttribute("data-live-mode") !== "normal" || // the switch said otherwise, or nothing yet
      h.hasAttribute("data-live-nodialog") || // a component site marked this page "no card" (fleet live-kit)
      d.querySelector("[data-live-calm-page]") || // a page that marks itself calm (a 404 page)
      h.getAttribute("data-live") !== variant ||
      d.querySelector("dialog[open]") ||
      d.querySelector(".nav-side.active, [data-live-block]") || // a menu, consent banner or other overlay is open
      (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) // typing in the lead form
    ) {
      return; // dropped for this page view — the conservative choice
    }
    opened = true;
    bind(dlg, variant);
    dlg.returnValue = "";
    dlg.showModal();
    try {
      ls.setItem("ls-dlg-" + variant, String(Date.now()));
    } catch (e) {}
    push({ event: "surface_view", surface: "dialog", variant: variant });
    // The line changes under an open card (candle-lighting, a quiet day starting): close it.
    if (w.MutationObserver) {
      new MutationObserver(function () {
        if (dlg.open && h.getAttribute("data-live") !== variant) dlg.close("expired");
      }).observe(h, { attributes: true, attributeFilter: ["data-live"] });
    }
  }

  /**
   * Decide this page view's card. `nav` = a page view reached without a document load (a React
   * site's client-side navigation): its referrer is still the landing page's, but it is a page
   * of this site, so it never counts as a search landing.
   */
  function consider(nav) {
    for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    timers = [];
    if (unscroll) {
      unscroll();
      unscroll = null;
    }
    opened = false;
    var variant = h.getAttribute("data-live");
    if (!variant || variant === "evergreen") return;
    var dlg = findCard(variant);
    if (!dlg) return;
    var decision = rules({
      hasDialog: true,
      storageOk: true,
      lastShown: parseInt(ls.getItem("ls-dlg-" + variant), 10) || 0,
      capDays: parseInt(dlg.getAttribute("data-cap-days"), 10) || 14,
      now: Date.now(),
      pageviews: pv,
      fromSearch: nav ? false : fromSearch(d.referrer),
    });
    if (decision === "none") return;
    if (decision === "soon") {
      later(function () {
        open(variant);
      }, 4000);
      return;
    }
    // "engaged": 20 s on the page AND a scroll of a quarter of the page or 600 px, whichever
    // comes first (a short page counts as scrolled), in either order.
    var waited = false;
    var scrolled = false;
    function check() {
      if (waited && scrolled) open(variant);
    }
    later(function () {
      waited = true;
      check();
    }, 20000);
    function onScroll() {
      var max = (h.scrollHeight || 0) - w.innerHeight;
      if (max <= 0 || w.pageYOffset >= Math.min(max * 0.25, 600)) {
        scrolled = true;
        w.removeEventListener("scroll", onScroll);
        check();
      }
    }
    w.addEventListener("scroll", onScroll, { passive: true });
    unscroll = function () {
      w.removeEventListener("scroll", onScroll);
    };
    onScroll(); // already scrolled (a restored position), or a page too short to scroll
  }

  try {
    consider(false);
  } catch (e) {}

  // A React site's client-side navigation (fleet live-kit: its calm script fires `live-nav` after
  // history.pushState / popstate, once the page's calm marks are updated). The pilot never fires
  // it — every page there is a document load — so this is inert on 3locksmiths.
  d.addEventListener("live-nav", function () {
    try {
      countView();
      // after React commits the new page (not a `later` timer: consider() clears those)
      setTimeout(function () {
        try {
          hideStale();
          // Back / forward with the card open, onto a page that may not carry one: close it.
          var o = d.querySelector("dialog.live-dialog[open]");
          if (
            o &&
            (h.hasAttribute("data-live-nodialog") ||
              d.querySelector("[data-live-calm-page]"))
          )
            o.close("nav");
        } catch (e) {}
      }, 0);
      consider(true);
    } catch (e) {}
  });
})(window, document);
