/*
 * The Google-reviews slider's behaviour in the browser — loaded deferred from app/layout.tsx, and
 * only while content/enriched/_reputation.mjs `live.enabled` is on (docs/dynamic-presence-plan.md
 * §3.4 State C; /dynamic-presence).
 *
 * It carries NO copy. Every visible word — the notice, the button labels, the anonymous and
 * rating-only labels, the position phrase — is already in the page as the slider shell, rendered by
 * scripts/reputation.mjs into content/site.json where check-claims reads it. This file only fills
 * the shell's <template> with what /api/reviews returns, by setting textContent and a short list
 * of validated attributes (scripts/check-reputation.mjs pins that list and fails on a Hebrew
 * letter, any HTML-string injection or a second URL here).
 *
 * THE DATA. One same-origin GET to the slider's data-endpoint ("/api/reviews", the Worker in
 * workers/reviews/), without cookies, 4 s at most, and only when the band comes within 600 px of
 * the viewport. The Worker reads the Business Profile API every 6 h and decides whether to show
 * anything at all (the owner's rule: at most `tolerance` reviews newer than the last confirmed
 * count). The whole response is validated or rejected: on anything unexpected the slider stays
 * hidden and the band keeps its static line — fail closed.
 *
 * WHAT IT SHOWS. Every review the Worker returns, in its order (newest first), up to data-cap.
 * Never filtered, never reordered — low ratings included (owner, 2026-10-13). Arrows the visitor
 * controls, no autoplay (WCAG 2.2.2). The rating, count and as-of date in every reviews line on
 * the page are refreshed from the same response (numbers only — the words are in the HTML).
 *
 * Idempotent: a second run on the same document does nothing.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  if (root.getAttribute("data-reviews-init")) return;
  root.setAttribute("data-reviews-init", "1");

  var sliders = document.querySelectorAll(".live-reviews-slider");
  if (!sliders.length) return;
  if (!window.fetch || !window.IntersectionObserver) return;
  if (!("content" in document.createElement("template"))) return;

  var ENDPOINT = "/api/reviews";
  if (sliders[0].getAttribute("data-endpoint") !== ENDPOINT) return;

  var DATE = /^\d{2}\/\d{2}\/\d{4}$/;
  var ISO = /^\d{4}-\d{2}-\d{2}$/;
  var MAX_TEXT = 5000;
  var MAX_NAME = 120;

  function isInt(n, lo, hi) {
    return typeof n === "number" && Math.floor(n) === n && n >= lo && n <= hi;
  }

  /** The whole response, or nothing. */
  function valid(d) {
    if (!d || d.v !== 1 || d.state !== "ok") return false;
    if (!isInt(d.total, 0, 100000)) return false;
    if (typeof d.average !== "number" || d.average < 1 || d.average > 5) return false;
    if (typeof d.asOf !== "string" || !ISO.test(d.asOf)) return false;
    if (typeof d.asOfText !== "string" || !DATE.test(d.asOfText)) return false;
    if (!Array.isArray(d.reviews) || !d.reviews.length || d.reviews.length > 50)
      return false;
    for (var i = 0; i < d.reviews.length; i++) {
      var r = d.reviews[i];
      if (!r || typeof r.anon !== "boolean" || typeof r.edited !== "boolean")
        return false;
      if (!r.anon && (typeof r.name !== "string" || !r.name || r.name.length > MAX_NAME))
        return false;
      if (!isInt(r.stars, 1, 5)) return false;
      if (typeof r.date !== "string" || !DATE.test(r.date)) return false;
      if (typeof r.datetime !== "string" || !ISO.test(r.datetime)) return false;
      if (r.text !== null && (typeof r.text !== "string" || r.text.length > MAX_TEXT))
        return false;
      if (r.dir !== "rtl" && r.dir !== "ltr") return false;
    }
    return true;
  }

  function track(variant) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "surface_view",
        surface: "reviews",
        variant: variant,
      });
    } catch {
      /* measurement never breaks the page */
    }
  }

  function setNumbers(d) {
    var avg = (Math.round(d.average * 10) / 10).toFixed(1);
    var i;
    var ratings = document.querySelectorAll('.live-reviews [data-k="rating"]');
    for (i = 0; i < ratings.length; i++) ratings[i].textContent = avg;
    var counts = document.querySelectorAll('.live-reviews [data-k="count"]');
    for (i = 0; i < counts.length; i++) counts[i].textContent = String(d.total);
    var dates = document.querySelectorAll('.live-reviews time[data-k="date"]');
    for (i = 0; i < dates.length; i++) {
      dates[i].setAttribute("datetime", d.asOf);
      dates[i].textContent = d.asOfText;
    }
  }

  function fillCard(tpl, r) {
    var li = tpl.content.firstElementChild.cloneNode(true);
    var name = li.querySelector(".live-reviews-card__name");
    var anon = li.querySelector(".live-reviews-card__anon");
    if (r.anon) {
      name.hidden = true;
      anon.hidden = false;
    } else {
      name.textContent = r.name;
    }
    li.querySelector(".live-reviews-card__stars").setAttribute(
      "data-stars",
      String(r.stars),
    );
    li.querySelector('[data-k="n"]').textContent = String(r.stars);
    var time = li.querySelector(".live-reviews-card__date");
    time.setAttribute("datetime", r.datetime);
    time.textContent = r.date;
    li.querySelector(".live-reviews-card__edited").hidden = !r.edited;
    var text = li.querySelector(".live-reviews-card__text");
    if (r.text) {
      text.textContent = r.text;
      text.setAttribute("dir", r.dir);
    } else {
      text.hidden = true;
      li.querySelector(".live-reviews-card__only").hidden = false;
    }
    return li;
  }

  function wire(slider, count) {
    var list = slider.querySelector(".live-reviews-slider__track");
    var prev = slider.querySelector(".live-reviews-slider__btn--prev");
    var next = slider.querySelector(".live-reviews-slider__btn--next");
    var posN = slider.querySelector('.live-reviews-slider__pos [data-k="n"]');
    var posT = slider.querySelector('.live-reviews-slider__pos [data-k="total"]');
    var smooth = !(
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
    var current = 0;
    posT.textContent = String(count);

    // The card nearest the track's inline start (its right edge, in a right-to-left page).
    function nearest() {
      var edge = list.getBoundingClientRect().right;
      var best = 0;
      var bestGap = Infinity;
      for (var i = 0; i < list.children.length; i++) {
        var gap = Math.abs(list.children[i].getBoundingClientRect().right - edge);
        if (gap < bestGap) {
          bestGap = gap;
          best = i;
        }
      }
      return best;
    }
    function show(i) {
      current = i;
      posN.textContent = String(i + 1);
      prev.disabled = i <= 0;
      next.disabled = i >= count - 1;
    }
    function go(step) {
      var target = Math.max(0, Math.min(count - 1, current + step));
      var card = list.children[target];
      if (!card) return;
      // Scroll the track only (never the page): the distance between the card's start edge and
      // the track's start edge. Right-to-left, so the start edge is the right one.
      var delta = card.getBoundingClientRect().right - list.getBoundingClientRect().right;
      list.scrollBy({ left: delta, behavior: smooth ? "smooth" : "auto" });
      show(target);
    }
    prev.addEventListener("click", function () {
      go(-1);
    });
    next.addEventListener("click", function () {
      go(1);
    });
    var pending = false;
    list.addEventListener(
      "scroll",
      function () {
        if (pending) return;
        pending = true;
        window.requestAnimationFrame(function () {
          pending = false;
          show(nearest());
        });
      },
      { passive: true },
    );
    show(0);
  }

  function render(d) {
    setNumbers(d);
    for (var s = 0; s < sliders.length; s++) {
      var slider = sliders[s];
      var tpl = slider.querySelector("template.live-reviews-slider__tpl");
      var list = slider.querySelector(".live-reviews-slider__track");
      if (!tpl || !list || list.children.length) continue;
      var cap = parseInt(slider.getAttribute("data-cap"), 10) || 0;
      var items = d.reviews.slice(0, Math.max(0, cap));
      if (!items.length) continue;
      for (var i = 0; i < items.length; i++) list.appendChild(fillCard(tpl, items[i]));
      wire(slider, items.length);
      slider.hidden = false;
    }
  }

  var started = false;
  function load() {
    if (started) return;
    started = true;
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = window.setTimeout(function () {
      if (ctrl) ctrl.abort();
    }, 4000);
    window
      .fetch(ENDPOINT, {
        credentials: "omit",
        headers: { Accept: "application/json" },
        signal: ctrl ? ctrl.signal : undefined,
      })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (d) {
        window.clearTimeout(timer);
        if (d && d.state === "ok" && valid(d)) {
          render(d);
          track("cards");
        } else {
          track("withheld");
        }
      })
      ["catch"](function () {
        window.clearTimeout(timer);
        track("error");
      });
  }

  // Observe the band (always rendered, unlike the hidden slider) and fetch when it comes near.
  var io = new IntersectionObserver(
    function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          io.disconnect();
          load();
          return;
        }
      }
    },
    { rootMargin: "600px 0px" },
  );
  for (var b = 0; b < sliders.length; b++) {
    var band = sliders[b].closest(".live-reviews-band") || sliders[b].parentNode;
    io.observe(band);
  }
})();
