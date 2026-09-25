import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',

    // geoip-lite loads its IP database via fs.readFileSync(__dirname + ...) at
    // require-time — Turbopack can't trace that, so keep it a real `require()`
    // against node_modules instead of bundling it (needed for proxy.ts too).
    serverExternalPackages: ['geoip-lite'],

    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                pathname: '/**',
            },
        ],
    },

    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
                    { key: 'X-XSS-Protection', value: '1; mode=block' },
                ],
            },
        ];
    },
};

export default withSentryConfig(nextConfig, {
    org: 'egatri',
    project: 'javascript-nextjs',
    silent: true,
    widenClientFileUpload: true,
});
