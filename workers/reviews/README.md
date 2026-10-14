# 3locksmiths-reviews — the Worker behind the reviews slider

Reads the Google Business Profile API every 6 hours and answers `GET /api/reviews` on
`3locksmiths.co.il` and `www.3locksmiths.co.il` for `public/assets/reviews.js`. Plan:
`docs/dynamic-presence-plan.md` §3.4 (State C). Owner decisions: business-facts §B.6.

- **Deployed on its own** from this folder — never with the site, never as `functions/`.
- **Holds no review in git.** One KV entry, expiring after 24 hours.
- **Keeps secrets out of this repo.** The repo is public, and the guard hook blocks Google keys
  and refresh tokens. Values live in `Sys Admin/secrets/.env` and in Cloudflare.

| File             | What                                                                  |
| ---------------- | --------------------------------------------------------------------- |
| `worker.mjs`     | cron sync (token → reviews.list → KV) + the `/api/reviews` handler    |
| `shape.mjs`      | pure: shape the API response, strip Google's translation, decide      |
| `shape.test.mjs` | `node --test workers/reviews/shape.test.mjs` — also in npm `prebuild` |
| `wrangler.toml`  | routes, KV binding, cron `17 */6 * * *`, vars; no secrets             |

## Switching it on — after Google approves API access

Google case `9-8690000041019`, GCP project `google-reviews`:

- project number `471959487171`;
- project ID `festive-athlete-511516-t0`.

**Approved** means Cloud Console → _APIs & Services → Quotas_ shows **300** requests per minute
for the Business Profile APIs. **0** means not yet.

1. **Enable the APIs** in that project:
   - My Business Account Management API;
   - My Business Business Information API;
   - Google My Business API (v4, which carries `reviews.list`).
2. **OAuth client** (owner, in the console):
   - Consent screen: External, app name `3locksmiths reviews`, scope
     `https://www.googleapis.com/auth/business.manage`.
   - Publish it to **Production**. A Testing app's refresh token dies after 7 days.
   - Keep the manager account listed under _Test users_ too. In 2026 some apps with this scope
     were reported to block non-test users with "access_denied".
   - Create an OAuth client of type _Web application_.
   - Save the client id and secret in `Sys Admin/secrets/.env` as `GBP_CLIENT_ID` and
     `GBP_CLIENT_SECRET`.
3. **Cloudflare** (owner): create an API token with _Workers Scripts: Edit_, _Workers KV
   Storage: Edit_ and, for the `3locksmiths.co.il` zone, _Workers Routes: Edit_. Save it as
   `CF_WORKERS_TOKEN` in `Sys Admin/secrets/.env`. Then run
   `npx wrangler kv namespace create REVIEWS` and put the id in `wrangler.toml`.
4. **Refresh token**: the manager account signs in once through the OAuth consent, run with a
   session. Save the refresh token as `GBP_REFRESH_TOKEN` in `Sys Admin/secrets/.env`, never here.
5. **Secrets into the Worker**, each read from stdin and never typed on the command line:
   - `npx wrangler secret put GOOGLE_CLIENT_ID`;
   - the same for `GOOGLE_CLIENT_SECRET` and `GOOGLE_REFRESH_TOKEN`;
   - optionally `NTFY_TOPIC`, the same topic the weekly reminder uses.
6. **Account and location ids**: resolve them once, with the access token:
   - `GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts`;
   - then `GET https://mybusinessbusinessinformation.googleapis.com/v1/accounts/{id}/locations?readMask=name,title`.

   Find the location titled שלושה מנעולנים, and put the two numeric ids in `wrangler.toml`
   (`GBP_ACCOUNT_ID`, `GBP_LOCATION_ID`). They are identifiers, not secrets.

7. **Deploy the Worker**, separately from the site: `npx wrangler deploy` from this folder. Then
   run `npx wrangler kv key put --binding REVIEWS mode on --remote`.
8. **Let one cron run**, or trigger it from the dashboard. Then:
   - `curl -s https://3locksmiths.co.il/api/reviews` must answer `{"v":1,"state":"withheld","reason":"ledger"}`;
   - the slider is still off on the site, so that answer is correct.
9. **Switch the site on**:
   - in `content/enriched/_reputation.mjs`, set `live.enabled: true`;
   - format → enrich → full gate → build → deploy the site (owner approval).
   - `/api/reviews` now answers `state: "ok"`, and the slider appears.

## Switching it off

| How fast            | Command                                                                        |
| ------------------- | ------------------------------------------------------------------------------ |
| Instant, no deploy  | `npx wrangler kv key put --binding REVIEWS mode off --remote` (cards withheld) |
| Everything, at once | the fleet status switch `off` (hides the line and the slider by CSS)           |
| Permanently         | `live.enabled: false` in the register → enrich → deploy                        |

## The rules it enforces (shape.mjs `decide`)

- **Shows** every review in Google's newest-update order, low ratings included. Never filtered.
- **Withholds everything** when any of these holds:
  - more than `tolerance` (10) reviews are newer than the owner's latest confirmed read in
    `content/enriched/_reputation.mjs`, as published by the site at `/assets/reputation.json`;
  - the KV copy is over 24 hours old;
  - the mode is not `on`;
  - the site's live mode is off.
- **Never shows Google's machine translation as the reviewer's words.** A review whose original
  can't be isolated withholds the whole response.
