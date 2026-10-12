/**
 * FLEET LIVE-KIT — the markup of the live surfaces for a COMPONENT site (Next.js RSC), as HTML
 * strings the site's tiny server components print with dangerouslySetInnerHTML. Canonical in
 * 3locksmiths.co.il/fleet/live-kit/lib/, hash-locked into each site by fleet/live-kit/sync.mjs.
 *
 * The pilot (3locksmiths) renders the same markup into scraped HTML (scripts/live-surfaces.mjs);
 * the class names, data attributes and data-cta values here are identical, so the shared
 * public/assets/live.js, the GTM tags (surface_view / surface_dismiss, contact_click on the
 * -call / -whatsapp suffix) and the out/ gate read every site the same way.
 *
 * Difference from the pilot, and why: a Next root layout does not know which page it renders,
 * so every page carries every line (hidden) and the card; the page's own path decides — before
 * first paint, in calmScript() — whether it is "calm" (seasonal lines hidden, no card) or "no
 * card". With JavaScript off only the evergreen line shows, exactly as on the pilot.
 *
 * Pure: no clock, no network, no DOM, no fs. Every visible word comes from the site's registers
 * (content/live/_campaigns.mjs, _updates.mjs) and NAP from site.config.json — never typed here.
 */
import { pieces } from "./topbar.mjs";
import { compile } from "./compile.mjs";
import { liveHeadScript } from "./head-script.mjs";

/** Minimal HTML escape for element content and attribute values. */
export const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const VARIANT_RE = /^[a-z0-9-]+$/;
const digits = (s) => String(s ?? "").replace(/\D/g, "");

function need(contact) {
  if (!contact || !contact.phoneDisplay || !contact.phoneE164)
    throw new Error(
      "live-kit render: contact.phoneDisplay and contact.phoneE164 are required",
    );
  return {
    phone: contact.phoneDisplay,
    tel: contact.phoneE164,
    wa: digits(contact.whatsappE164 || contact.phoneE164),
  };
}

/** The variants in render order: one per variant (not per window), then reduced, evergreen last. */
export function variantsOf(campaigns) {
  const out = [];
  const seen = new Set();
  for (const w of (campaigns && campaigns.windows) || []) {
    const v = w.variant || w.id;
    if (!VARIANT_RE.test(String(v)))
      throw new Error(`live-kit render: bad variant id ${v}`);
    if (seen.has(v)) continue;
    seen.add(v);
    out.push({ id: v, kind: w.kind, topbar: w.topbar });
  }
  if (campaigns && campaigns.reduced)
    out.push({ id: "reduced", kind: "reduced", topbar: campaigns.reduced.topbar });
  out.push({ id: "evergreen", kind: "evergreen", topbar: campaigns.evergreen.topbar });
  return out;
}

function item(v, c) {
  if (!v.topbar || !v.topbar.text)
    throw new Error(`live-kit render: variant ${v.id} has no topbar.text`);
  const text = pieces(v.topbar.text)
    .map((p) => {
      if (p.text !== undefined) return esc(p.text);
      if (p.token === "phone")
        return `<a class="live-topbar__link" href="tel:${esc(c.tel)}" data-cta="topbar-call" dir="ltr">${esc(c.phone)}</a>`;
      if (!p.label)
        throw new Error(`live-kit render: {whatsapp} needs a label (${v.id})`);
      return `<a class="live-topbar__link" href="https://wa.me/${c.wa}" target="_blank" rel="noopener" data-cta="topbar-whatsapp">${esc(p.label)}</a>`;
    })
    .join("");
  let inner = `<span class="live-topbar__text">${text}</span>`;
  // A literal space before the link: a text-only reader would otherwise glue the two words.
  if (v.topbar.link)
    inner += ` <a class="live-topbar__link live-topbar__more" href="${esc(v.topbar.link.href)}" data-cta="topbar-link">${esc(v.topbar.link.label)}</a>`;
  // No `hidden` attribute (the pilot uses one): Tailwind v4 preflight ships
  // `[hidden]{display:none!important}` in @layer base, and an !important declaration in a layer
  // beats the head script's unlayered `display:flex!important` — the live line would never show.
  // live-core.css hides every line but the evergreen one instead (`.live-topbar__item`).
  return `<p class="live-topbar__item" data-campaign="${v.id}" data-kind="${v.kind}">${inner}</p>`;
}

/**
 * The announcement bar region: every line, hidden by live-core.css except the evergreen one, evergreen LAST (the
 * head script hides it with a following-sibling selector). Not sticky; it scrolls away.
 */
export function topbarHtml({ campaigns, contact }) {
  const c = need(contact);
  const items = variantsOf(campaigns)
    .map((v) => item(v, c))
    .join("");
  return `<div class="live-topbar" data-live-region="topbar" data-nosnippet><div class="live-topbar__inner">${items}</div></div>`;
}

/** Text with {phone}: the number as an LTR island. */
function withPhone(text, c) {
  return pieces(text)
    .map((p) =>
      p.text !== undefined
        ? esc(p.text)
        : p.token === "phone"
          ? `<span dir="ltr">${esc(c.phone)}</span>`
          : esc(p.label),
    )
    .join("");
}

/** The cards: one closed <dialog> per variant whose window carries a `dialog`. */
export function dialogsHtml({ campaigns, contact }) {
  const c = need(contact);
  const cards = new Map();
  for (const w of (campaigns && campaigns.windows) || []) {
    if (!w.dialog) continue;
    const v = w.variant || w.id;
    if (!cards.has(v)) cards.set(v, w.dialog);
  }
  if (!cards.size) return "";
  const close = campaigns.ui && campaigns.ui.close;
  if (!close)
    throw new Error("live-kit render: campaigns.ui.close is required with a dialog");
  let html = "";
  for (const [v, d] of cards) {
    for (const k of ["title", "body", "call", "whatsapp"])
      if (!d[k]) throw new Error(`live-kit render: dialog ${v} is missing ${k}`);
    const id = `live-dialog-${v}`;
    html +=
      `<dialog class="live-dialog" data-dialog="${v}" data-cap-days="${Number(d.capDays) || 14}" aria-labelledby="${id}-title" aria-describedby="${id}-body">` +
      // Focus lands on the title, not the call link — a stray Enter must not start a call.
      `<p class="live-dialog__title" id="${id}-title" tabindex="-1" autofocus>${esc(d.title)}</p>` +
      `<p class="live-dialog__body" id="${id}-body">${esc(d.body)}</p>` +
      `<div class="live-dialog__actions">` +
      `<a class="live-dialog__btn live-dialog__btn--call" href="tel:${esc(c.tel)}" data-cta="popup-call"><span>${withPhone(d.call, c)}</span></a>` +
      ` <a class="live-dialog__btn live-dialog__btn--wa" href="https://wa.me/${c.wa}" target="_blank" rel="noopener" data-cta="popup-whatsapp">${esc(d.whatsapp)}</a>` +
      `</div>` +
      (d.link
        ? `<a class="live-dialog__more" href="${esc(d.link.href)}" data-cta="popup-link">${esc(d.link.label)}</a>`
        : "") +
      `<button type="button" class="live-dialog__close" aria-label="${esc(close)}"><span aria-hidden="true">×</span></button></dialog>`;
  }
  return `<div class="live-dialogs" data-live-region="dialogs" data-nosnippet>${html}</div>`;
}

/** "2026-09-02" → "02/09/2026" — never Intl (CLAUDE.md rule in every fleet repo). */
const ddmmyyyy = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/**
 * The homepage updates strip: the newest three items. NOT a live region — a new item is a real
 * content change. live.js hides it once the newest item is 45 days old.
 */
export function updatesHtml({ updates, containerClass = "" }) {
  const items = updates && Array.isArray(updates.items) ? updates.items : [];
  if (!items.length) return "";
  if (!updates.heading) throw new Error("live-kit render: _updates.mjs needs a heading");
  const newest = [...items].sort((a, b) => b.date.localeCompare(a.date));
  const cards = newest
    .slice(0, 3)
    .map((u) => {
      const link = u.href
        ? ` <a class="live-updates__link" href="${esc(u.href)}" data-cta="update-link">${esc(u.linkLabel)}</a>`
        : "";
      return `<li class="live-updates__item"><time class="live-updates__date" datetime="${u.date}">${ddmmyyyy(u.date)}</time><p class="live-updates__text">${esc(u.text)}</p>${link}</li>`;
    })
    .join("");
  return (
    `<section class="live-updates" data-newest="${newest[0].date}" aria-labelledby="live-updates-title">` +
    `<div class="${esc(containerClass)}"><h2 class="live-updates__title" id="live-updates-title">${esc(updates.heading)}</h2>` +
    `<ul class="live-updates__list">${cards}</ul></div></section>`
  );
}

/** Paths a card links to: a card never opens on the page it points at. */
export function dialogTargets(campaigns) {
  const out = [];
  for (const w of (campaigns && campaigns.windows) || [])
    if (w.dialog && w.dialog.link && w.dialog.link.href) out.push(w.dialog.link.href);
  return out;
}

const normPath = (p) => {
  let s = String(p);
  try {
    s = decodeURI(s);
  } catch {
    /* keep as written */
  }
  return s.endsWith("/") ? s : s + "/";
};

/**
 * The before-paint snippet that marks THIS page, from its own path:
 *   data-live-calm      — seasonal lines hidden (CSS), no card; safety + wartime lines stay
 *   data-live-nodialog  — no card (calm pages, the card's own link targets, `noDialog` paths)
 *   data-live-stale     — the homepage updates strip is older than 45 days (CSS hides it)
 * Matches exact paths, or prefixes written with a trailing "*" (e.g. "/blog/emergency-*").
 *
 * A Next site navigates without loading a document: the root layout persists, <html> keeps its
 * attributes, and this script would never run again. So the marking is a function that SETS AND
 * REMOVES both marks, run now and again after every history.pushState / replaceState and on
 * popstate (Next's router calls the methods it finds at hydration, i.e. these wrappers). When the
 * path really changed it also fires `live-nav`, which public/assets/live.js counts as a page view.
 *
 * Must run BEFORE the head script. ES5, every step in try/catch: an error costs nothing visible.
 *
 * @param {{ calm?: string[], noDialog?: string[], newest?: string | null, campaigns: { windows?: Array<{ dialog?: { link?: { href?: string } } }> } }} options
 * @returns {string}
 */
export function calmScript({ calm = [], noDialog = [], campaigns, newest = null }) {
  const enc = (list) =>
    JSON.stringify(list.map((p) => (p.endsWith("*") ? p : normPath(p))));
  const nd = [...noDialog, ...dialogTargets(campaigns)];
  if (newest !== null && !/^\d{4}-\d{2}-\d{2}$/.test(String(newest)))
    throw new Error(`live-kit render: newest must be YYYY-MM-DD or null, got ${newest}`);
  return (
    "(function(){try{var d=document,h=d.documentElement,w=window,last=null;" +
    `var C=${enc(calm)},N=${enc(nd)},U=${JSON.stringify(newest)};` +
    "function m(p,L){for(var i=0;i<L.length;i++){var x=L[i];" +
    "if(x.charAt(x.length-1)==='*'?p.indexOf(x.slice(0,-1))===0:p===x)return true}return false}" +
    "function k(){var p=location.pathname;try{p=decodeURI(p)}catch(e){}" +
    "if(p.charAt(p.length-1)!=='/')p+='/';var c=m(p,C);" +
    'if(c)h.setAttribute("data-live-calm","");else h.removeAttribute("data-live-calm");' +
    'if(c||m(p,N))h.setAttribute("data-live-nodialog","");else h.removeAttribute("data-live-nodialog");' +
    "var moved=last!==null&&last!==p;last=p;return moved}" +
    'function n(){try{if(k())d.dispatchEvent(new Event("live-nav"))}catch(e){}}' +
    "k();" +
    'if(U&&Date.now()-Date.parse(U+"T00:00:00+03:00")>45*864e5)h.setAttribute("data-live-stale","");' +
    "var H=w.history;if(H&&H.pushState){var P=H.pushState,R=H.replaceState;" +
    "H.pushState=function(){var r=P.apply(this,arguments);n();return r};" +
    "H.replaceState=function(){var r=R.apply(this,arguments);n();return r};" +
    'w.addEventListener("popstate",n)}' +
    "}catch(e){}})();"
  );
}

/** The newest update's date, or null — what calmScript needs to mark a stale strip. */
export function newestUpdate(updates) {
  const items = updates && Array.isArray(updates.items) ? updates.items : [];
  return items.length
    ? [...items]
        .map((u) => u.date)
        .sort()
        .pop()
    : null;
}

/** The pilot's inline <head> script, compiled from this site's windows and the fleet calendar. */
export function headScript({ campaigns, calendar }) {
  const windows = (campaigns && campaigns.windows) || [];
  return liveHeadScript(compile(windows, (calendar && calendar.windows) || []));
}
