/** @type {import('prettier').Config} */
module.exports = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 90,
  tabWidth: 2,
  // No prettier-plugin-tailwindcss here on purpose: this repo imports only Tailwind's
  // UTILITIES layer (see app/globals.css) and the ported pages are styled by the vendored
  // gogo theme CSS, so there is effectively no Tailwind class soup to sort.
  overrides: [
    {
      // Authored page modules: wider lines keep the Hebrew paragraphs readable as single
      // strings instead of being wrapped into unreviewable fragments.
      files: "content/enriched/*.mjs",
      options: { printWidth: 110 },
    },
  ],
};
