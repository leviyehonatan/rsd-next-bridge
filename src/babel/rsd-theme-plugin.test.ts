import { describe, it, expect } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const plugin = require('./rsd-theme-plugin.cjs');

/**
 * Guards which package layouts the `tokens.stylex` rewrite fires for.
 *
 * DEFAULT_SOURCE_RE decides whether a file's `tokens.stylex` import is rewritten
 * to the consuming app's theme module. It originally matched only
 * `chord-chart-rsd/src/`, so the rewrite never fired for the PUBLISHED package —
 * which ships `dist/` only (`files: ["dist"]`) and has no `src/`.
 *
 * Consumers then hit one of two things, and the quiet one is worse:
 *   - webpack: "Could not resolve the path to the imported file" (loud)
 *   - or the bare import resolves and every chart renders in the library's
 *     default palette, silently ignoring the app's theme — precisely what
 *     keeping tokens.stylex a module boundary exists to prevent.
 *
 * These cases pin the layouts the package is actually installed as.
 */
describe('DEFAULT_SOURCE_RE', () => {
    const RE: RegExp = plugin.DEFAULT_SOURCE_RE;

    it.each([
        ['published, npm-aliased directory', '/w/apps/web/node_modules/chord-chart-rsd/dist/web/rsd.js'],
        ['published, scoped directory', '/w/node_modules/@leviyehonatan/chord-chart-rsd/dist/web/rsd.js'],
        ['published native bundle', '/w/node_modules/chord-chart-rsd/dist/native/rsd.js'],
        ['linked source checkout', '/Users/x/dev/chord-chart-rsd/src/components/Chart.tsx'],
        ['windows separators', 'C:\\w\\node_modules\\chord-chart-rsd\\dist\\web\\rsd.js'],
    ])('rewrites in %s', (_label, filename) => {
        expect(RE.test(filename)).toBe(true);
    });

    it.each([
        ['an unrelated app file', '/w/packages/app/src/features/TuneDetailScreen.tsx'],
        ['a lookalike package name', '/w/node_modules/chord-chart-rsd-utils/lib/x.js'],
        ['the package root, no src/dist segment', '/w/node_modules/chord-chart-rsd/package.json'],
    ])('leaves %s alone', (_label, filename) => {
        expect(RE.test(filename)).toBe(false);
    });
});
