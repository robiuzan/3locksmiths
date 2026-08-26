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

  images: {
    // Static export has no image optimizer; content images are plain vendored <img>.
    unoptimized: true,
    // Kept for completeness if next/image is ever used against the WP domain.
    remotePatterns: [{ protocol: "https", hostname: wpHost }],
  },
};

export default nextConfig;
