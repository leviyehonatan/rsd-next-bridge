/**
 * Babel preset for compiling React Strict DOM inside a Next.js app.
 *
 * This is the heart of the style-emission side of the RSD↔Next bridge. RSD's
 * official `react-strict-dom/babel-preset` hardcodes `runtimeInjection: false`,
 * which only works when the postcss collector expands the `@stylex;` at-rule at
 * BUILD time. But `next dev` does NOT expand that at-rule, so dev pages come out
 * unstyled. This preset picks the emission strategy per environment AND owns the
 * whole RSD-in-Next babel wiring (style plugins, module-resolver, the
 * `stripRsdDebugName` hydration fix, and the `tokens.stylex` → theme rewrite), so
 * `apps/web/babel.config.js` collapses to one line:
 *
 *   module.exports = {
 *       presets: [[require('@leviyehonatan/rsd-next-bridge/babel-preset'), {
 *           dev, rootDir: __dirname,
 *           srcRoot: '<packages/app/src>',
 *           moduleResolverAlias: { '@/lib': '...', ... },
 *           themeCssPath: '<abs path to chart-theme.css>',
 *       }], 'next/babel'],
 *       plugins: [],
 *   };
 *
 * Every Babel pass that computes a class/var hash MUST use the same StyleX
 * version — RSD's NESTED @stylexjs/babel-plugin (0.15.4), resolved by absolute
 * path (the subpaths aren't in RSD's exports map). The postcss collector
 * (src/postcss/collector.cjs) mirrors this, so hashes always match.
 */
const path = require('path');

// Resolve RSD's plugin + its BUNDLED StyleX babel-plugin via the package dir.
// `baseDir` (the consuming project's root) lets a consumer that installs its OWN
// react-strict-dom use that copy — not the bridge package's — so the compiled
// class/var hashes match that consumer's RSD/build. Defaults to the bridge's own
// location (tunity-web case), where RSD is a workspace dep resolved from here.
function resolveRsdPlugins(baseDir) {
    const rsdDir = path.dirname(
        baseDir
            ? require.resolve('react-strict-dom/package.json', { paths: [baseDir] })
            : require.resolve('react-strict-dom/package.json'),
    );
    const reactStrictPlugin = require(path.join(rsdDir, 'babel', 'plugin.js'));
    // Resolve the styleX plugin + stylex runtime from the RSD dir. DO NOT hardcode
    // `node_modules/@stylexjs/…` nested under RSD: npm dedupes/hoists `@stylexjs/*`
    // to the project root when multiple deps share a version, so the plugin may
    // live at `node_modules/@stylexjs/babel-plugin` instead. `require.resolve`
    // finds it either way (nested wins; falls back to the project/hoisted copy).
    const styleXPlugin = require(require.resolve('@stylexjs/babel-plugin', { paths: [rsdDir] }));
    const stylexInjectPath = path.join(
        path.dirname(require.resolve('@stylexjs/stylex/package.json', { paths: [rsdDir] })),
        'lib',
        'cjs',
        'inject.js',
    );
    return { rsdDir, reactStrictPlugin, styleXPlugin, stylexInjectPath };
}

/**
 * Strip the `debug::name` entry from RSD's runtime html.* components (their
 * dist flows through the web babel config via transpilePackages). See apps/web
 * babel.config comment history — the React Compiler hoists `<html.*>` tags before
 * RSD's JSX compile-away, so the client renders RSD's runtime component, which
 * adds an `html-<tag>` debug class the fully-compiled SSR HTML doesn't have →
 * hydration mismatch. Stripping it makes runtime output identical to compiled.
 * Scoped via state.filename (babel `overrides` is silently dropped by Next's
 * loader, which only honors presets/plugins).
 */
function stripRsdDebugName({ types: t }) {
    return {
        visitor: {
            ObjectProperty(path, state) {
                if (
                    state.filename &&
                    /react-strict-dom[\\/]dist[\\/]web/.test(state.filename) &&
                    t.isStringLiteral(path.node.key, { value: 'debug::name' })
                ) {
                    path.remove();
                }
            },
        },
    };
}

function webPlugins({ dev, rootDir, inject }) {
    const { reactStrictPlugin, styleXPlugin } = resolveRsdPlugins(rootDir);
    return [
        [reactStrictPlugin, { debug: false, dev, rootDir }],
        [
            styleXPlugin,
            {
                debug: false,
                dev,
                importSources: [{ from: 'react-strict-dom', as: 'css' }],
                runtimeInjection: inject,
                styleResolution: 'property-specificity',
                unstable_moduleResolution: {
                    rootDir: process.cwd(),
                    themeFileExtension: '.css',
                    type: 'commonJS',
                },
            },
        ],
    ];
}

function themePluginOption(opts) {
    // The rsd-theme-plugin is a FACTORY: call it with `themeCssPath` and get a
    // ready babel plugin (do NOT pass `[factory, options]` — babel would treat
    // the options object as the plugin's API/options tuple and re-invoke the
    // factory, leaving `themeCssPath` undefined).
    return opts.themeCssPath
        ? [require('./rsd-theme-plugin.cjs').createRsdThemePlugin({ themeCssPath: opts.themeCssPath })]
        : [];
}

function resolverPluginOption(opts) {
    if (!opts.srcRoot && !opts.moduleResolverAlias) return [];
    return [
        [
            'babel-plugin-module-resolver',
            {
                root: opts.srcRoot ? [opts.srcRoot] : undefined,
                alias: opts.moduleResolverAlias || undefined,
            },
        ],
    ];
}

module.exports = function rsdNextBridgePreset(_, opts = {}) {
    const dev = !!opts.dev;
    const rootDir = opts.rootDir || process.cwd();

    // DEV: runtime injection (stylex inject.js). `next dev` doesn't expand the
    // `@stylex;` at-rule, so without this every css.create style is missing.
    if (dev) {
        const { stylexInjectPath } = resolveRsdPlugins(rootDir);
        return {
            plugins: [
                ...webPlugins({ dev: true, rootDir, inject: stylexInjectPath }),
                ...resolverPluginOption(opts),
                stripRsdDebugName,
                ...themePluginOption(opts),
            ],
        };
    }

    // PROD: RSD's official preset with runtimeInjection off → the postcss
    // collector expands `@stylex;` at build time.
    return {
        presets: [['react-strict-dom/babel-preset', { debug: false, dev: false, rootDir }]],
        plugins: [...resolverPluginOption(opts), stripRsdDebugName, ...themePluginOption(opts)],
    };
};

module.exports.resolveRsdPlugins = resolveRsdPlugins;
module.exports.webPlugins = webPlugins;