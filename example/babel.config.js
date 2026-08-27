// Minimal Next + RSD config that consumes the bridge's babel preset — the single
// source of RSD style-emission wiring (dev runtime-injection / prod collector).
const { SRC, moduleResolverAlias } = require('./alias.config');

module.exports = {
    presets: [
        [
            require('@leviyehonatan/rsd-next-bridge/babel-preset'),
            {
                dev: process.env.NODE_ENV !== 'production',
                rootDir: __dirname,
                srcRoot: SRC,
                moduleResolverAlias,
            },
        ],
        'next/babel',
    ],
    plugins: [],
};