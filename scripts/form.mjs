/**
 * Normalises the lead form on every page (backlog §8.4, §8.5, §8.8, §11.4).
 *
 * The form is Contact Form 7 markup left over from WordPress, re-pointed at Web3Forms. As
 * scraped it had five separate problems:
 *
 *   1. NO VALIDATION AT ALL. `novalidate` is set, and the only "required" markers are CF7 class
 *      names (`wpcf7-validates-as-required`) plus `aria-required="true"` — neither of which
 *      enforces anything. So the form *announced* required fields to screen-reader users while
 *      accepting an entirely empty submit. That is worse than having no validation.
 *   2. NO PHONE FIELD. It collected name, email and message. On a locksmith site the callback
 *      IS the service — a lead without a phone number is barely a lead.
 *   3. `lang="en-US"` and `dir="ltr"` on the wrapper, so a screen reader announces the whole
 *      Hebrew form in English and the fields render left-to-right.
 *   4. English `aria-label="Contact form"` as the accessible name.
 *   5. No consent affordance, while /privacy-policy/ exists and is never referenced.
 *
 * Deliberately ZERO JavaScript: native constraint validation only. The site ships exactly one
 * client component, and a lead form that depends on JS is a lead form that can fail silently.
 * The trade-off is browser-default error text; the `title` attributes carry Hebrew guidance.
 *
 * PIPELINE POSITION: pages → build-manifest → enrich → footer → **form** → fix-links.
 * Before fix-links so the new markup still picks up its data-cta and redirect.
 *
 * Idempotent: every form is marked `data-form-normalized` and skipped on re-runs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "content", "site.json");

const site = JSON.parse(readFileSync(FILE, "utf8"));

// Israeli mobile formats a real customer might type: 0501234567, 050-1234567, 050 123 4567,
// +972501234567, +972-50-1234567. Deliberately permissive — a false rejection on a lockout
// call is a lost job, which costs far more than a slightly malformed number.
//
// The hyphens inside [ ] are ESCAPED. Browsers compile `pattern` with the `v` flag, where a bare
// "-" in a class is a syntax error; the unescaped form made every browser drop the pattern, so any
// text passed as a phone number (live audit 2026-11-04). The self-check at the bottom compiles the
// pattern with `v` and fails the build if that ever regresses.
const PHONE_PATTERN = "(?:0|\\+?972[\\-\\s]?)5[0-9][\\-\\s]?[0-9]{3}[\\-\\s]?[0-9]{4}";
const PHONE_TITLE = "מספר טלפון נייד ישראלי, למשל 050-1234567";

const phoneField = () =>
  `<p><span class="wpcf7-form-control-wrap" data-name="phone">` +
  `<input size="40" class="wpcf7-form-control wpcf7-text" placeholder="טלפון (חובה)" ` +
  `type="tel" name="phone" inputmode="tel" autocomplete="tel" required ` +
  `aria-required="true" pattern="${PHONE_PATTERN}" title="${PHONE_TITLE}"></span></p>`;

const consentLine = () =>
  `<p class="form-consent">בשליחת הטופס אתם מאשרים שניצור אתכם קשר בטלפון או בוואטסאפ. ` +
  `הפרטים נשמרים בהתאם ל<a href="/privacy-policy/">מדיניות הפרטיות</a>.</p>`;

let normalized = 0;
let skipped = 0;
let repaired = 0;

for (const page of site.pages) {
  if (!/api\.web3forms\.com/.test(page.bodyHtml)) continue;

  const root = parse(page.bodyHtml, {
    blockTextElements: { script: true, style: true, noscript: true, pre: true },
  });
  let changed = false;

  for (const form of root.querySelectorAll("form")) {
    if (!/api\.web3forms\.com/.test(form.getAttribute("action") || "")) continue;
    // Repair the pattern on forms normalized before the escape fix — the skip below would
    // otherwise keep the broken pattern on every page forever. NOT setAttribute: node-html-parser
    // re-quotes every attribute through JSON.stringify and then deletes all backslashes, which
    // turned the pattern into "(?:0|+?972[-s]?)…" — a regex that cannot compile at all. Swap the
    // raw tag instead, which keeps the value byte for byte.
    for (const phone of form.querySelectorAll('input[name="phone"]')) {
      if (phone.getAttribute("pattern") !== PHONE_PATTERN) {
        const tag = phone.toString();
        const fixed = /\spattern="[^"]*"/.test(tag)
          ? tag.replace(/\spattern="[^"]*"/, () => ` pattern="${PHONE_PATTERN}"`)
          : tag.replace(/^<input/, () => `<input pattern="${PHONE_PATTERN}"`);
        phone.replaceWith(fixed);
        repaired++;
        changed = true;
      }
    }
    if (form.getAttribute("data-form-normalized")) {
      skipped++;
      continue;
    }

    // 3 + 4 — language, direction and a Hebrew accessible name.
    form.setAttribute("lang", "he");
    form.setAttribute("dir", "rtl");
    form.setAttribute("aria-label", "טופס יצירת קשר");
    // The CF7 wrapper carries its own lang/dir; fix it too or the fields still render LTR.
    for (let n = form.parentNode; n; n = n.parentNode) {
      const cls =
        typeof n.getAttribute === "function" ? n.getAttribute("class") || "" : "";
      if (cls.includes("wpcf7")) {
        n.setAttribute("lang", "he");
        n.setAttribute("dir", "rtl");
        break;
      }
    }

    // 1 — turn validation on. `novalidate` was neutering the markup below it.
    form.removeAttribute("novalidate");

    const nameInput = form.querySelector('input[name="name"]');
    if (nameInput) {
      nameInput.setAttribute("required", "");
      nameInput.setAttribute("aria-required", "true");
      nameInput.setAttribute("autocomplete", "name");
      nameInput.setAttribute("placeholder", "שם (חובה)");
    }

    // Email becomes OPTIONAL: phone is the field that matters here, and every extra required
    // field costs completions. Web3Forms uses it as reply-to when present.
    const emailInput = form.querySelector('input[name="email"]');
    if (emailInput) {
      emailInput.removeAttribute("aria-required");
      emailInput.setAttribute("autocomplete", "email");
      emailInput.setAttribute("placeholder", "אימייל (לא חובה)");
    }

    // 2 — the phone field, inserted straight after the name field so it is the second thing
    // a visitor fills in.
    if (!form.querySelector('input[name="phone"]')) {
      const nameWrap = nameInput?.closest("p");
      if (nameWrap) nameWrap.insertAdjacentHTML("afterend", phoneField());
      else form.insertAdjacentHTML("afterbegin", phoneField());
    }

    // 5 — consent, immediately above the submit button.
    if (!form.querySelector(".form-consent")) {
      const submit = form.querySelector('button[type="submit"], input[type="submit"]');
      const submitWrap = submit?.closest("p");
      if (submitWrap) submitWrap.insertAdjacentHTML("beforebegin", consentLine());
      else form.insertAdjacentHTML("beforeend", consentLine());
    }

    form.setAttribute("data-form-normalized", "1");
    normalized++;
    changed = true;
  }

  if (changed) page.bodyHtml = root.toString();
}

// Self-check: the pattern must compile the way browsers compile it (the `v` flag), accept the
// formats above and reject text that is not a phone number.
{
  let re;
  try {
    re = new RegExp(`^(?:${PHONE_PATTERN})$`, "v");
  } catch (err) {
    console.error(
      `\nFORM PROBLEM: the phone pattern does not compile with the v flag — ${err.message}`,
    );
    process.exit(1);
  }
  const accept = [
    "0501234567",
    "050-1234567",
    "050 123 4567",
    "+972501234567",
    "+972-50-1234567",
  ];
  const reject = ["abc", "1", "050-123", "0761234567"];
  const wrong = [
    ...accept.filter((v) => !re.test(v)).map((v) => `rejects ${v}`),
    ...reject.filter((v) => re.test(v)).map((v) => `accepts ${v}`),
  ];
  if (wrong.length) {
    console.error(`\nFORM PROBLEM: the phone pattern ${wrong.join(", ")}.`);
    process.exit(1);
  }
  // …and what actually ships: every phone field in the output must carry exactly that pattern.
  // The constant alone proved nothing — the homepage once shipped it with its backslashes gone.
  const strays = [];
  for (const page of site.pages) {
    const root = parse(page.bodyHtml ?? "");
    for (const phone of root.querySelectorAll('input[name="phone"]')) {
      if (phone.getAttribute("pattern") !== PHONE_PATTERN)
        strays.push(`${decodeURIComponent(page.path)}: ${phone.getAttribute("pattern")}`);
    }
  }
  if (strays.length) {
    console.error(
      `\nFORM PROBLEM: ${strays.length} phone field(s) ship another pattern:`,
    );
    for (const s of strays.slice(0, 10)) console.error(`  ${s}`);
    process.exit(1);
  }
}

writeFileSync(FILE, JSON.stringify(site, null, 2), "utf8");
console.log(
  `form: normalized ${normalized} form(s)` +
    (skipped ? ` (${skipped} already normalized)` : "") +
    (repaired ? `, repaired the phone pattern on ${repaired}` : "") +
    " — validation on, phone field added, RTL/he, consent linked; phone pattern compiles with v.",
);

if (normalized === 0 && skipped === 0) {
  console.error("\nFORM PROBLEM: no Web3Forms form found to normalize.");
  process.exit(1);
}
