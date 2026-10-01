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
    return;
  }

  function push(o) {
    try {
      (w.dataLayer = w.dataLayer || []).push(o);
    } catch (e) {}
  }

  try {
    // --- the updates strip: hide it when the newest item is too old -------------------------
    var strip = d.querySelector(".live-updates[data-newest]");
    if (strip && stale(strip.getAttribute("data-newest"), Date.now())) {
      strip.setAttribute("hidden", "");
    }

    // --- the card -----------------------------------------------------------------------------
    // Storage first, and the page view counted on EVERY page — not only on pages that carry a
    // card — so "the 2nd page of a visit" means what it says.
    var ls, pv;
    try {
      ls = w.localStorage;
      ls.setItem("ls-t", "1");
      ls.removeItem("ls-t");
      var ss = w.sessionStorage;
      pv = (parseInt(ss.getItem("ls-pv"), 10) || 0) + 1;
      ss.setItem("ls-pv", String(pv));
    } catch (e) {
      return;
    }

    var variant = d.documentElement.getAttribute("data-live");
    if (!variant || variant === "evergreen") return;
    var dlg = d.querySelector('dialog.live-dialog[data-dialog="' + variant + '"]');
    if (!dlg || typeof dlg.showModal !== "function") return;

    var key = "ls-dlg-" + variant;
    var decision = rules({
      hasDialog: true,
      storageOk: true,
      lastShown: parseInt(ls.getItem(key), 10) || 0,
      capDays: parseInt(dlg.getAttribute("data-cap-days"), 10) || 14,
      now: Date.now(),
      pageviews: pv,
      fromSearch: fromSearch(d.referrer),
    });
    if (decision === "none") return;

    var opened = false;
    var waitingForVisible = false;
    function open() {
      if (opened) return;
      var a = d.activeElement;
      if (d.hidden) {
        // The visitor switched apps while we waited — try again when they come back.
        if (!waitingForVisible) {
          waitingForVisible = true;
          d.addEventListener("visibilitychange", function retry() {
            if (d.hidden) return;
            d.removeEventListener("visibilitychange", retry);
            waitingForVisible = false;
            setTimeout(open, 1500);
          });
        }
        return;
      }
      if (
        d.documentElement.getAttribute("data-live") !== variant ||
        d.querySelector("dialog[open]") ||
        d.querySelector(".nav-side.active") || // the mobile menu is open
        (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) // typing in the lead form
      ) {
        return; // dropped for this page view — the conservative choice
      }
      opened = true;
      dlg.returnValue = "";
      dlg.showModal();
      try {
        ls.setItem(key, String(Date.now()));
      } catch (e) {}
      push({ event: "surface_view", surface: "dialog", variant: variant });
      // The line changes under an open card (candle-lighting, a quiet day starting): close it.
      if (w.MutationObserver) {
        new MutationObserver(function () {
          if (dlg.open && d.documentElement.getAttribute("data-live") !== variant) {
            dlg.close("expired");
          }
        }).observe(d.documentElement, {
          attributes: true,
          attributeFilter: ["data-live"],
        });
      }
    }

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

    if (decision === "soon") {
      setTimeout(open, 4000);
      return;
    }
    // "engaged": 20 s on the page AND a scroll of a quarter of the page or 600 px, whichever
    // comes first (a short page counts as scrolled), in either order.
    var waited = false;
    var scrolled = false;
    function check() {
      if (waited && scrolled) open();
    }
    setTimeout(function () {
      waited = true;
      check();
    }, 20000);
    function onScroll() {
      var max = (d.documentElement.scrollHeight || 0) - w.innerHeight;
      if (max <= 0 || w.pageYOffset >= Math.min(max * 0.25, 600)) {
        scrolled = true;
        w.removeEventListener("scroll", onScroll);
        check();
      }
    }
    w.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // already scrolled (a restored position), or a page too short to scroll
  } catch (e) {}
})(window, document);
