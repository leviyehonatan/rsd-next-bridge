/**
 * Babel plugin — point a plain-object theme module (used inside a stylex-compiling
 * pipeline) at a stylex `css.defineVars` home.
 *
 * Why: react-strict-dom components that ship as plain objects for non-stylex
 * consumers (e.g. chord-chart-rsd's `tokens.stylex.ts`, which feeds Obsidian's
 * esbuild/Rollup path) break inside a stylex-compiling monorepo — `theme.paperBg`
 * compiles to `var(--x…)` only when the values are `css.defineVars`. This plugin
 * rewrites `import { theme } from '.../tokens.stylex'` to the app's stylex theme
 * module, so the collector + main build treat `theme.x` as a real defineVar and
 * the dark theme can override it.
 *
 * Generator: `createRsdThemePlugin({ themeCssPath, sourceRe })`.
 *   - themeCssPath: absolute path to the `*.css.ts` theme module (e.g.
 *     packages/app/src/lib/chart-theme.css).
 *   - sourceRe: regex that identifies the components' source files (default
 *     matches `chord-chart-rsd/src/` AND `chord-chart-rsd/dist/`).
 *
 * Resolution note: stylex's commonJS unstable_moduleResolution doesn't follow
 * package `exports` subpaths, so the rewrite must be an ABSOLUTE path (`.css` →
 * mapped to `.css.ts` by themeFileExtension). The absolute path is emitted only
 * into the build's transformed output, never committed.
 */
const path = require('path');

// Matches BOTH layouts, because the same package gets consumed two ways:
//   - `src/`  — a workspace/linked checkout, or a git dep installed from source
//   - `dist/` — the PUBLISHED package (files: ["dist"]), which ships no src/
// Covering only `src/` disables the rewrite for every published consumer: the
// bare `.../tokens.stylex` import survives to the bundler, which either fails
// to resolve it (webpack: "Could not resolve the path to the imported file")
// or resolves it and renders the library's default palette instead of the
// app's theme — the silent failure the module boundary exists to prevent.
// Scoped installs (@leviyehonatan/chord-chart-rsd/dist/…) match too: the
// package-name segment is still in the path. So do npm-aliased installs, where
// the directory is named for the alias rather than the package.
const DEFAULT_SOURCE_RE = /chord-chart-rsd[\\/](?:src|dist)[\\/]/;

function createRsdThemePlugin({ themeCssPath, sourceRe = DEFAULT_SOURCE_RE } = {}) {
    if (!themeCssPath) {
        throw new Error('rsd-theme-plugin: `themeCssPath` is required');
    }
    const abs = path.resolve(themeCssPath);
    return function rsdThemeImportPlugin() {
        return {
            visitor: {
                ImportDeclaration(importPath, state) {
                    if (!state.filename || !sourceRe.test(path.normalize(state.filename).replace(/\\/g, '/'))) {
                        return;
                    }
                    const src = importPath.node.source.value;
                    if (!src || !/tokens\.stylex(\.tsx?)?$/.test(src)) return;
                    const names = importPath.node.specifiers;
                    if (!(names.some((s) => s.type === 'ImportSpecifier' && s.imported.name === 'theme'))) {
                        return;
                    }
                    // Rewrite the source module; keep the `theme` import.
                    importPath.node.source.value = abs;
                },
            },
        };
    };
}

module.exports = createRsdThemePlugin;
module.exports.createRsdThemePlugin = createRsdThemePlugin;
// Exported for the regression tests that pin which package layouts the
// tokens.stylex rewrite fires for (see rsd-theme-plugin.test.cjs).
module.exports.DEFAULT_SOURCE_RE = DEFAULT_SOURCE_RE;