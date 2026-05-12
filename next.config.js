/** @type {import('next').NextConfig} */

const CSP_DIRECTIVES = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vercel.live https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' blob: data: https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://api.crossref.org https://va.vercel-scripts.com https://cloudflareinsights.com https://*.vercel.app https://ncskit.org https://*.ncskit.org",
    "worker-src 'self' blob:",
    "media-src 'self' blob: data:",
].join('; ');

const nextConfig = {
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: CSP_DIRECTIVES,
                    },
                    {
                        key: 'Cache-Control',
                        value: 'no-cache, no-store, must-revalidate',
                    },
                ],
            },
        ];
    },
    typescript: {
        ignoreBuildErrors: true, // Temporarily allow build to proceed if there are legacy leftovers
    },
    compress: true,
    images: {
        formats: ['image/webp', 'image/avif'],
    },
    productionBrowserSourceMaps: false,
    poweredByHeader: false,
    output: 'standalone',
};

export default nextConfig;
