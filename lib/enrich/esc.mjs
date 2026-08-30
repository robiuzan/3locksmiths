/**
 * The single HTML escaper for everything the enrichment pipeline emits.
 *
 * Extracted from render.mjs so lib/enrich/catalog-image.mjs can use it without an import cycle
 * (render.mjs imports catalogImg; catalog-image.mjs needs esc). Duplicating an escaping function
 * is the kind of thing that gets fixed in one copy and not the other, so there is exactly one.
 *
 * Escapes & < > and the double quote. It does NOT escape `'`, which is safe only because every
 * attribute this pipeline writes is double-quoted — keep it that way.
 */
export const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
