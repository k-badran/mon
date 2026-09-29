import { defineConfig } from "vitest/config";

/**
 * Pins Vitest to this package.
 *
 * Without a config file here, Vitest searches upward for one and does not stop
 * at the repository root — on a machine with a stray `vite.config.ts` anywhere
 * above the checkout it loads that instead and every test run dies before
 * collecting a single file. The suite's behaviour should not depend on what the
 * parent directories happen to contain.
 */
export default defineConfig({
  root: import.meta.dirname,

  /**
   * Inline, empty PostCSS config — supplied so Vite does not go looking for one.
   *
   * Same failure mode as above and a separate search: this package is Node-only
   * and has no stylesheet to transform, but an unconfigured Vite still walks up
   * for a `postcss.config.js` and then fails on a Tailwind plugin it cannot
   * resolve. Declaring the config empty answers the question locally.
   */
  css: { postcss: { plugins: [] } },

  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",

    // This package declares a `test` script but has no test files yet. Vitest
    // treats "no files matched" as an error by default, which would make
    // `pnpm test` red across the whole repo for a package that simply has
    // nothing to run — and a suite that is always red is one nobody reads.
    passWithNoTests: true,

    /**
     * Child processes rather than worker threads.
     *
     * Vitest 2's default thread pool does not shut down cleanly on Node 24
     * here: the suite passes, then tinypool throws "Failed to terminate
     * worker" and the run exits 1. A green suite that reports failure is worse
     * than a slow one, because CI cannot tell the two apart.
     */
    pool: "forks",
  },
});
