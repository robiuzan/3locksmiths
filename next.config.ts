import type { NextConfig } from "next";

const wpHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_WP_URL ?? "https://3locksmiths.co.il")
      .hostname;
  } catch {
    return "3locksmiths.co.il";
  }
})();

const nextConfig: NextConfig = {
  // Fully static, self-contained output (out/) for GitHub Pages / any static host.
  // The whole site is SSG, so this exports clean HTML + the vendored assets.
  output: "export",

  // Shared front-end kit ships raw TS (main/types → src/*.ts), so Next must transpile it.
  // Installed for future use; the current snapshot render does not import it (contact links
  // are static in the scraped content/site.json), so this is an inert no-op for now.
  transpilePackages: ["@ishub/site-kit"],

  // Mirror the WordPress permalink structure exactly — every page URL keeps its
  // trailing slash (e.g. /מנעולן-רכב/), matching the source canonical links 1:1.
  // With `output: export` this writes each route as <slug>/index.html.
  trailingSlash: true,

  // Static generation runs in parallel workers, and EVERY worker parses the whole of
  // content/site.json — 18.5 MB of scraped HTML — to render its share of the 121 routes. At the
  // default concurrency (8 workers on this machine) that overruns memory and a worker dies with a
  // native fault partway through:
  //
  //   Next.js build worker exited with code: 3221226505 and signal: null
  //
  // 3221226505 is 0xC0000409 (STATUS_STACK_BUFFER_OVERRUN). There is no JS stack and no
  // "heap out of memory", so it does not read as a memory problem at all. It is also INTERMITTENT
  // — it reproduced on roughly two builds in three, which makes it easy to mistake for a flake and
  // "fix" by re-running.
  //
  // Raising --max-old-space-size does NOT reliably fix it: the pressure is total, not per-worker.
  // Forcing fewer, larger workers does. 60 pages/worker gives 2 workers for 121 routes.
  experimental: {
    // Worker count for static generation. Next computes it in getNumberOfWorkers()
    // (build/index.js:309) from `experimental.cpus` — NOT from the staticGeneration* options,
    // which control per-worker task concurrency and retries instead. Setting those looks right
    // and changes nothing here.
    cpus: 2,
  },

  images: {
    // Static export has no image optimizer; content images are plain vendored <img>.
    unoptimized: true,
    // Kept for completeness if next/image is ever used against the WP domain.
    remotePatterns: [{ protocol: "https", hostname: wpHost }],
  },
};

export default nextConfig;
