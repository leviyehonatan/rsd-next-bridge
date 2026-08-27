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

/**
 * Guards which *import specifiers* the rewrite fires for.
 *
 * A second blind spot with the same shape as the `src/`-only DEFAULT_SOURCE_RE,
 * and independent of it — fixing that one does not fix this one. The extension
 * list was `.ts`/`.tsx` only, but the published themable bundle emits a
 * fully-specified ESM import (`./tokens.stylex.js`), so the visitor cleared the
 * filename gate and then bailed out one line later. The rewrite still never
 * fired for a registry install.
 */
describe('TOKENS_SPECIFIER_RE', () => {
    const RE: RegExp = plugin.TOKENS_SPECIFIER_RE;

    it.each([
        ['bare, from a source checkout', '../tokens.stylex'],
        ['published themable bundle', './tokens.stylex.js'],
        ['typescript source', './tokens.stylex.ts'],
        ['typescript with JSX', './tokens.stylex.tsx'],
        ['explicit ESM', './tokens.stylex.mjs'],
        ['explicit CommonJS', './tokens.stylex.cjs'],
        ['deep relative path', '../../theme/tokens.stylex.js'],
    ])('matches %s', (_label, specifier) => {
        expect(RE.test(specifier)).toBe(true);
    });

    it.each([
        ['a different module', './tokens.js'],
        ['a lookalike suffix', './my-tokens.stylexish.js'],
        ['a subpath below it', './tokens.stylex/index.js'],
    ])('leaves %s alone', (_label, specifier) => {
        expect(RE.test(specifier)).toBe(false);
    });
});

/**
 * End-to-end guard: the two regexes are only interesting because of what they
 * gate together. This runs the real plugin over a file shaped like the
 * published package and asserts the import is actually rewritten.
 *
 * This is the case that would have caught the `.js` bug, because both regexes
 * can be individually correct while the visitor still declines to rewrite —
 * which is exactly how it hid behind the `dist/` fix.
 */
describe('rewrite, end to end', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const babel = require('@babel/core');
    const THEME = '/w/packages/app/src/lib/chart-theme.css';
    const DIST_FILE = '/w/node_modules/chord-chart-rsd/dist/web-themable/rsd.js';

    const transform = (code: string, filename: string) =>
        babel.transformSync(code, {
            filename,
            babelrc: false,
            configFile: false,
            plugins: [plugin.createRsdThemePlugin({ themeCssPath: THEME })],
        }).code as string;

    it('rewrites the published bundle import to the app theme module', () => {
        const out = transform('import { theme } from "./tokens.stylex.js";\ntheme.paperBg;', DIST_FILE);
        expect(out).toContain(THEME);
        expect(out).not.toContain('./tokens.stylex.js');
    });

    it('leaves an unrelated package alone', () => {
        const out = transform('import { theme } from "./tokens.stylex.js";', '/w/node_modules/other-pkg/dist/x.js');
        expect(out).toContain('./tokens.stylex.js');
        expect(out).not.toContain(THEME);
    });

    it('leaves a non-theme import from the same module alone', () => {
        const out = transform('import { spacing } from "./tokens.stylex.js";', DIST_FILE);
        expect(out).toContain('./tokens.stylex.js');
        expect(out).not.toContain(THEME);
    });
});
