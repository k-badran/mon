/**
 * Tailwind v4 is a PostCSS plugin; there is no `tailwind.config.js`. The theme
 * lives in `app/theme.css`, declared with `@theme`.
 *
 * This file is `.js` with `module.exports` rather than `.mjs`: the package has
 * no `"type": "module"`, and Next only picked up the CommonJS form here — with
 * the `.mjs` version the plugin silently did not run and `@theme` passed
 * through to the browser as a raw at-rule.
 */
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
