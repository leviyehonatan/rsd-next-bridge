// Shared alias config — maps @/ to the example's src so the bridge's module-resolver
// rewrites @/ imports (experimenting with the same pattern the real app uses).
const path = require('path');
const SRC = path.resolve(__dirname, 'src');
module.exports = {
    SRC,
    moduleResolverAlias: {
        '@': SRC,
        '@/lib': path.join(SRC, 'lib'),
        '@/tokens': path.join(__dirname, 'tokens'),
    },
};