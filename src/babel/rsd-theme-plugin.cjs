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
 *     matches `chord-chart-rsd/src/`).
 *
 * Resolution note: stylex's commonJS unstable_moduleResolution doesn't follow
 * package `exports` subpaths, so the rewrite must be an ABSOLUTE path (`.css` →
 * mapped to `.css.ts` by themeFileExtension). The absolute path is emitted only
 * into the build's transformed output, never committed.
 */
const path = require('path');

const DEFAULT_SOURCE_RE = /chord-chart-rsd[\\/]src[\\/]/;

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