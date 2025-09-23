const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 1) Let Metro treat .wasm as an asset
config.resolver.assetExts.push('wasm');

// 2) (Dev only) Inject headers so SharedArrayBuffer works with the web worker
config.server = {
    ...config.server,
    enhanceMiddleware: (middleware) => (req, res, next) => {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        return middleware(req, res, next);
    },
};

module.exports = config;
