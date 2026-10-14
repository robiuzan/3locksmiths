/**
 * 3locksmiths-reviews — a standalone Cloudflare Worker on the zone routes
 * 3locksmiths.co.il/api/reviews* and www.3locksmiths.co.il/api/reviews* (wrangler.toml).
 *
 * WHY A WORKER AND NOT A PAGES FUNCTION. A `functions/` folder would ride along with every
 * `wrangler pages deploy` of the site — including the out.prev rollback — bypass public/_headers,
 * and has no cron. This Worker is deployed on its own (workers/reviews/README.md) and never ships
 * with a site deploy. .claude/hooks/guard-live-surfaces.ps1 blocks a functions/ folder.
 *
 * WHAT IT DOES
 *   scheduled (every 6 h): refresh a Google OAuth access token from the stored refresh token, page
 *     through Business Profile API v4 reviews.list (newest update first), shape the result
 *     (shape.mjs) and keep ONE KV entry with a 24-hour expiry — well inside the 30 days Google's
 *     Business Profile API policies allow, and never in git. Also copies production's
 *     /assets/reputation.json (the owner's confirmed count) into KV. On any failure it pushes a
 *     content-free ntfy message and leaves the previous entry to expire: the slider then hides.
 *   fetch GET /api/reviews: reads KV only — no Google call per view — and answers what decide()
 *     says. JSON, no-store, nosniff, default-src 'none', noindex. Logs states, never content.
 *
 * Secrets (wrangler secret put, values from Sys Admin secrets/.env — never in this repo):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, NTFY_TOPIC (optional)
 * Vars (wrangler.toml): GBP_ACCOUNT_ID, GBP_LOCATION_ID, LEDGER_URL
 * KV binding: REVIEWS — keys "reviews:v1" (24 h), "ledger:v1" (7 d), "mode" (no expiry; "on" shows,
 *   anything else or missing withholds — set with `wrangler kv key put mode on`).
 */
import { decide, shapeReviews } from "./shape.mjs";

const KEY = "reviews:v1";
const LEDGER = "ledger:v1";
const MODE = "mode";
const MAX_PAGES = 10;

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "X-Robots-Tag": "noindex",
  "Referrer-Policy": "no-referrer",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: HEADERS });

async function accessToken(env) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const body = await res.json();
  if (!body.access_token) throw new Error("token: no access_token");
  return body.access_token;
}

async function listReviews(env, token) {
  if (!/^\d+$/.test(env.GBP_ACCOUNT_ID ?? "") || !/^\d+$/.test(env.GBP_LOCATION_ID ?? ""))
    throw new Error("GBP_ACCOUNT_ID / GBP_LOCATION_ID not set");
  const base = `https://mybusiness.googleapis.com/v4/accounts/${env.GBP_ACCOUNT_ID}/locations/${env.GBP_LOCATION_ID}/reviews`;
  const merged = { reviews: [], averageRating: undefined, totalReviewCount: undefined };
  let pageToken = "";
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(base);
    url.searchParams.set("pageSize", "50");
    url.searchParams.set("orderBy", "updateTime desc");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "Accept-Language": "he" },
    });
    if (!res.ok) throw new Error(`reviews.list ${res.status}`);
    const body = await res.json();
    merged.reviews.push(...(body.reviews ?? []));
    merged.averageRating ??= body.averageRating;
    merged.totalReviewCount ??= body.totalReviewCount;
    pageToken = body.nextPageToken ?? "";
    if (!pageToken) break;
  }
  return merged;
}

async function notify(env, message) {
  if (!env.NTFY_TOPIC) return;
  try {
    await fetch(`https://ntfy.sh/${encodeURIComponent(env.NTFY_TOPIC)}`, {
      method: "POST",
      body: `3locksmiths reviews: ${message}`,
    });
  } catch {
    /* the alert is best-effort */
  }
}

async function sync(env) {
  try {
    const ledgerRes = await fetch(env.LEDGER_URL, {
      headers: { Accept: "application/json" },
    });
    if (ledgerRes.ok) {
      const ledger = await ledgerRes.json();
      await env.REVIEWS.put(LEDGER, JSON.stringify(ledger), {
        expirationTtl: 7 * 24 * 3600,
      });
    }
    const token = await accessToken(env);
    const shaped = shapeReviews(await listReviews(env, token));
    if (!shaped.ok) throw new Error(`shape: ${shaped.reason}`);
    const entry = { fetchedAt: new Date().toISOString(), ...shaped.data };
    await env.REVIEWS.put(KEY, JSON.stringify(entry), { expirationTtl: 24 * 3600 });
    console.log(`sync ok: ${entry.reviews.length} reviews`);
  } catch (e) {
    console.log(`sync failed: ${e.message}`);
    await notify(
      env,
      `sync failed (${e.message}) — the slider hides when the cached copy expires`,
    );
  }
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/reviews")
      return json({ v: 1, state: "unavailable", reason: "path" }, 404);
    if (request.method !== "GET" && request.method !== "HEAD")
      return json({ v: 1, error: "method" }, 405);
    const site = request.headers.get("Sec-Fetch-Site");
    if (site && site !== "same-origin") return json({ v: 1, error: "origin" }, 403);
    const [stored, ledger, mode] = await Promise.all([
      env.REVIEWS.get(KEY, "json"),
      env.REVIEWS.get(LEDGER, "json"),
      env.REVIEWS.get(MODE),
    ]);
    const body = decide({ stored, ledger, mode, now: Date.now() });
    console.log(`state ${body.state}${body.reason ? ` (${body.reason})` : ""}`);
    return json(body);
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(sync(env));
  },
};

export default worker;
