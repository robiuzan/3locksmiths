/**
 * Renders the original theme/plugin stylesheets + the head inline `<style>` blocks
 * (brand color CSS variables, WP presets) exactly as the source loads them, in order.
 *
 * React 19 hoists `<link rel="stylesheet" precedence>` and `<style href precedence>` into
 * `<head>` and dedupes them, preserving render order within a precedence group — so this
 * reproduces the source's CSS cascade. External links (Google Fonts, cdnjs) are kept as-is.
 */
import { getSite } from "@/lib/content";

export default function SiteAssets() {
  const { assets } = getSite();
  const stylesheets = assets.headLinks.filter((l) =>
    (l.rel ?? "").includes("stylesheet"),
  );

  return (
    <>
      {stylesheets.map((l, i) => (
        <link
          key={`css-${i}`}
          rel="stylesheet"
          href={l.href}
          media={l.media}
          precedence="gogo"
        />
      ))}
      {assets.headStyles.map((css, i) => (
        <style
          key={`style-${i}`}
          href={`gogo-inline-${i}`}
          precedence="gogo-inline"
          dangerouslySetInnerHTML={{ __html: css }}
        />
      ))}
    </>
  );
}
