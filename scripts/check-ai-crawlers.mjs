/**
 * Proves, against the LIVE site, that AI crawlers can still reach it — the GEO tripwire
 * (ported from gagoline.co.il/scripts/ai-crawler-check.mjs, 2026-11-04).
 *
 * WHY — from 2026-08-16 Cloudflare's managed robots.txt sent `Disallow: /` to every major AI
 * crawler on this zone, and no repo change could override it (app/robots.ts emits a file the edge
 * was rewriting). By 2026-11-03 it was gone (docs/geo-observations.md §1.1). It can come back the
 * same way it left: a zone toggle, with no commit and no deploy. This is how anyone finds out.
 *
 * TWO CHECKS, AND THE SECOND IS THE ONE THAT MATTERS
 *   1. the SERVED /robots.txt — advisory;
 *   2. a user-agent PROBE — enforcement: a bot rule can return 403 while robots.txt says Allow.
 *
 * NETWORKED and it hits production, so it is NEVER part of prebuild or the enrich chain (both must
 * stay offline). Run it after any Cloudflare change and before reporting GEO work as done.
 * Non-mutating, hence the `check-` prefix (scripts/check-freshness.mjs skips check-* as sources).
 *
 *   node scripts/check-ai-crawlers.mjs [origin]     (default https://3locksmiths.co.il)
 */

const ORIGIN =
  process.argv.slice(2).find((a) => !a.startsWith("-")) ?? "https://3locksmiths.co.il";

/**
 * Citation agents fetch a page to answer a question now; training agents affect long-term model
 * knowledge. If a trade-off is ever forced, keep the citation agents.
 */
const AGENTS = [
  {
    name: "OAI-SearchBot",
    kind: "citation",
    ua: "Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)",
  },
  {
    name: "ChatGPT-User",
    kind: "citation",
    ua: "Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)",
  },
  {
    name: "Claude-SearchBot",
    kind: "citation",
    ua: "Mozilla/5.0 (compatible; Claude-SearchBot/1.0; +claudebot@anthropic.com)",
  },
  {
    name: "Claude-User",
    kind: "citation",
    ua: "Mozilla/5.0 (compatible; Claude-User/1.0; +claudebot@anthropic.com)",
  },
  {
    name: "PerplexityBot",
    kind: "citation",
    ua: "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
  },
  {
    name: "GPTBot",
    kind: "training",
    ua: "Mozilla/5.0 (compatible; GPTBot/1.1; +https://openai.com/gptbot)",
  },
  {
    name: "ClaudeBot",
    kind: "training",
    ua: "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
  },
  {
    name: "Google-Extended",
    kind: "training",
    ua: "Mozilla/5.0 (compatible; Google-Extended)",
  },
  {
    name: "CCBot",
    kind: "training",
    ua: "Mozilla/5.0 (compatible; CCBot/2.0; +https://commoncrawl.org/faq/)",
  },
];

const failures = [];

/** robots.txt → Map(agent → "allow" | "disallow"), honouring stacked User-Agent groups. */
function parseRobots(txt) {
  const verdict = new Map();
  let group = [];
  let sawRule = false;
  for (const raw of txt.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [field, ...rest] = line.split(":");
    const key = (field ?? "").trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      if (sawRule) {
        group = [];
        sawRule = false;
      }
      group.push(value.toLowerCase());
    } else if (key === "allow" || key === "disallow") {
      sawRule = true;
      if (value !== "/" && value !== "") continue; // only the root decides site-wide access
      const blocked = key === "disallow" && value === "/";
      for (const g of group)
        if (!verdict.has(g)) verdict.set(g, blocked ? "disallow" : "allow");
    }
  }
  return verdict;
}

console.log(`ai-crawlers: ${ORIGIN}\n`);

let robotsTxt = "";
try {
  const res = await fetch(`${ORIGIN}/robots.txt`, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  robotsTxt = await res.text();
} catch (err) {
  console.error(`  FAIL  could not fetch /robots.txt — ${err.message}`);
  process.exit(1);
}
const verdict = parseRobots(robotsTxt);
const wildcard = verdict.get("*") ?? "allow";
console.log("  robots.txt (advisory):");
for (const a of AGENTS) {
  const v = verdict.get(a.name.toLowerCase()) ?? wildcard;
  console.log(`    ${v === "allow" ? "ok  " : "FAIL"}  ${a.name.padEnd(18)} ${v}`);
  if (v !== "allow")
    failures.push(`${a.name} is Disallow'd in the served robots.txt (${a.kind})`);
}
if (/content-signal:.*ai-train=no/i.test(robotsTxt))
  console.log(
    "\n    note: Content-Signal ai-train=no — training discouraged, citation unaffected.",
  );

console.log("\n  user-agent probe (enforcement):");
for (const a of AGENTS) {
  let status = 0;
  try {
    const res = await fetch(`${ORIGIN}/`, {
      headers: { "User-Agent": a.ua },
      redirect: "follow",
    });
    status = res.status;
  } catch (err) {
    failures.push(`${a.name} probe threw — ${err.message}`);
  }
  console.log(
    `    ${status === 200 ? "ok  " : "FAIL"}  ${a.name.padEnd(18)} ${status || "network error"}`,
  );
  if (status && status !== 200)
    failures.push(
      `${a.name} received HTTP ${status} — an ENFORCED bot rule, which robots.txt alone would not show (${a.kind})`,
    );
}

if (failures.length) {
  console.error(`\nai-crawlers: ${failures.length} FAILURE(S)\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error(
    "\n  This is a Cloudflare zone setting — the owner's to change (CLAUDE.md §13); no commit fixes it." +
      "\n  Zone → AI Crawl Control (managed robots.txt), and the WAF / bot rules for the 403s." +
      "\n  Record the observation in docs/geo-observations.md.\n",
  );
  process.exit(1);
}
console.log("\nai-crawlers: AI crawlers can reach the site, advisory and enforced ✅");
