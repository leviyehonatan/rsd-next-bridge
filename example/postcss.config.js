// StyleX CSS extraction for prod via the bridge's collector config.
const { SRC, moduleResolverAlias } = require('./alias.config');
const { stylexCollectorConfig } = require('@repo/rsd-next-bridge/postcss');

module.exports = {
    plugins: {
        ...stylexCollectorConfig({
            webDir: __dirname,
            rootDir: __dirname,
            include: [
                'app/**/*.{js,jsx,ts,tsx}',
                'src/**/*.{js,jsx,ts,tsx}',
                'tokens/**/*.{js,jsx,ts,tsx}',
            ],
            moduleResolver: { root: [SRC], alias: moduleResolverAlias },
        }),
        autoprefixer: {},
    },
};