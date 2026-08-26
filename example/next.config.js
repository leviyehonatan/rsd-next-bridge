// Next config — the .web.* extension resolution + RN-web alias + transpile that
// make the shared RSD code work on web. Mirrors the real app's wiring.
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    outputFileTracingRoot: path.join(__dirname, '../../../'),
    // Build with webpack (RSD needs Babel/StyleX).
    // Next 16 blocks HMR on non-allowlisted origins (writes a bare "Unauthorized"
    // to the HMR websocket upgrade → ERR_INVALID_HTTP_RESPONSE → silent no-hydrate).
    // loopback MUST be allowed or dev HMR is dead for the default localhost/127 URL.
    allowedDevOrigins: ['localhost', '127.0.0.1', '::1'],
    transpilePackages: ['react-strict-dom', '@repo/rsd-next-bridge', 'react-native-web'],
    typescript: { ignoreBuildErrors: true },
    webpack(config, { webpack }) {
        const { moduleResolverAlias } = require('./alias.config');
        config.plugins.push(
            new webpack.DefinePlugin({
                __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
                'process.env.EXPO_OS': JSON.stringify('web'),
            }),
        );
        config.resolve.alias = {
            ...(config.resolve.alias || {}),
            ...moduleResolverAlias,
            'react-native$': 'react-native-web',
        };
        config.resolve.extensions = [
            '.web.tsx', '.web.ts', '.web.jsx', '.web.js',
            ...config.resolve.extensions,
        ];
        return config;
    },
};

module.exports = nextConfig;