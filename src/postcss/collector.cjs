/**
 * StyleX CSS extraction for a Next.js app that renders React Strict DOM with an
 * App Router.
 *
 * RSD compiles `css.create()`/`css.defineVars()` at Babel time into class names /
 * `var(--x…)` references. Someone has to turn those into real CSS. In PROD the
 * `@stylexjs/postcss-plugin` runs a SEPARATE babel pass (a "collector") over every
 * include, collects the compiled rules, and injects them where `@stylex;` appears
 * (the `app/stylex.css` entry). `next build --webpack` runs this; `next dev` does
 * NOT (hence the dev runtime injection in babel/preset.js).
 *
 * CRITICAL INVARIANT: the collector's babel pass must produce the SAME class-name
 * and var hashes as the main build. That means it must use the SAME stylex plugin
 * version (RSD's NESTED @stylexjs@0.15.4, resolved by absolute path), the SAME
 * rootDir (apps/web), the SAME themeFileExtension, and the SAME @/ alias mapping.
 *
 * Return shape: an object compatible with `apps/web/postcss.config.js`'s
 * `plugins` map:
 *   plugins: {
 *       ...createStylexCollectorPlugin({ webDir, themeCssPath }),
 *       autoprefixer: {},
 *   }
 *
 * Exposes:
 *   - `stylexCollectorConfig({ webDir, themeCssPath, include, rootDir })` — the
 *     `{ '@stylexjs/postcss-plugin': {...} }` options for postcss.config.js.
 */
const path = require('path');

function rsdPlugins(webDir, themeCssPath) {
    const rsdDir = path.dirname(require.resolve('react-strict-dom/package.json', { paths: [webDir] }));
    const reactStrictPlugin = require(path.join(rsdDir, 'babel', 'plugin.js'));
    // Resolve the styleX plugin from the RSD dir via require.resolve, so it works
    // whether npm nests it under react-strict-dom or hoists it to the project root.
    const styleXPlugin = require(require.resolve('@stylexjs/babel-plugin', { paths: [rsdDir] }));
    // The rsd-theme-plugin is OPTIONAL: only consumers that import a plain-object
    // theme dep (e.g. chord-chart-rsd's tokens.stylex) need it. Without themeCssPath
    // the collector just doesn't rewrite any imports (a no-op).
    const themePlugin = themeCssPath
        ? (() => {
              const { createRsdThemePlugin } = require('../babel/rsd-theme-plugin.cjs');
              return createRsdThemePlugin({ themeCssPath });
          })()
        : null;
    return { rsdDir, reactStrictPlugin, styleXPlugin, themePlugin };
}

function stylexCollectorConfig({
    webDir,
    themeCssPath,
    include,
    rootDir = process.cwd(),
    dev = process.env.NODE_ENV !== 'production',
    moduleResolver = null,   // { root: [SRC], alias: moduleResolverAlias } — rewrites @/ imports
}) {
    const { reactStrictPlugin, styleXPlugin, themePlugin } = rsdPlugins(webDir, themeCssPath);

    return {
        '@stylexjs/postcss-plugin': {
            include,
            importSources: ['@stylexjs/stylex', 'stylex', { from: 'react-strict-dom', as: 'css' }],
            useCSSLayers: true,
            babelConfig: {
                babelrc: false,
                // Do NOT load apps/web/babel.config.js here — it adds a second
                // RSD pass with a different module-resolution strategy → a SECOND
                // set of var(--x…) names that never match the atomic classes.
                configFile: false,
                presets: [
                    '@babel/preset-typescript',
                    ['@babel/preset-react', { runtime: 'automatic' }],
                ],
                plugins: [
                    [reactStrictPlugin, { debug: false }],
                    ...(themePlugin ? [themePlugin] : []),
                    ...(moduleResolver ? [['module-resolver', moduleResolver]] : []),
                    [styleXPlugin, {
                        debug: false,
                        dev,
                        importSources: [{ from: 'react-strict-dom', as: 'css' }],
                        runtimeInjection: false,
                        styleResolution: 'property-specificity',
                        unstable_moduleResolution: {
                            rootDir,
                            themeFileExtension: '.css',
                            type: 'commonJS',
                        },
                    }],
                ],
            },
        },
    };
}

module.exports = { stylexCollectorConfig, rsdPlugins };