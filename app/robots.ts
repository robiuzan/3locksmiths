import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/**
 * AI crawlers we explicitly allow — fleet-wide policy, identical across all sites.
 *
 * `User-agent: *` already permits these, so this block is **declarative, not
 * enforcing**. It exists so the stance is visible rather than implied, and so it
 * survives a platform default changing underneath us.
 *
 *   - Retrieval bots (OAI-SearchBot, ChatGPT-User, Claude-User, Claude-SearchBot,
 *     PerplexityBot, Perplexity-User) fetch a page to answer a live question and
 *     cite the source. For a lead-gen service site these are the whole point —
 *     a blocked crawler cannot cite what it cannot read.
 *   - Training bots (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot)
 *     bring no direct citation benefit, but there is nothing proprietary here to
 *     protect and no meaningful cost to serving them.
 *
 * ⚠️ Cloudflare can PREPEND a managed block at the edge that overrides everything
 * here — it did exactly that across this fleet until 2026-08. Nothing in this file
 * can undo it; that is a zone setting. Verify the live policy, never infer it here:
 *
 *   curl -sS -H 'Cache-Control: no-cache' "https://3locksmiths.co.il/robots.txt?cb=$RANDOM"
 */
const AI_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

// Static /robots.txt — allow all crawling and point to the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: AI_CRAWLERS, allow: "/" },
    ],
    sitemap: "https://3locksmiths.co.il/sitemap.xml",
    host: "https://3locksmiths.co.il",
  };
}
