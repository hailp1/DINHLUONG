/** @type {import('next').NextConfig} */

// ─── Content Security Policy ──────────────────────────────────────────────────
//
// Design constraints:
//  1. WebR WASM requires 'wasm-unsafe-eval' in script-src
//  2. WebR service worker requires 'blob:' in worker-src
//  3. Tailwind CSS 4 injects inline styles → 'unsafe-inline' in style-src
//  4. Next.js injects inline scripts for hydration → 'unsafe-inline' in script-src
//  5. Supabase Realtime uses WSS → wss://*.supabase.co in connect-src
//  6. Google Fonts → fonts.googleapis.com / fonts.gstatic.com
//  7. Vercel Analytics → va.vercel-scripts.com
//  8. Cloudflare Insights → static.cloudflareinsights.com
//
// NOTE: 'unsafe-inline' for scripts is required because Next.js injects inline
//       hydration scripts that cannot be hashed/nonced without a custom server.
//       This is a known limitation of Next.js static/edge deployments on Vercel.
//       The main XSS protection comes from other headers (X-Frame-Options, etc.)
//
const CSP_DIRECTIVES = [
    // Default: only same-origin
    "default-src 'self'",

    // Scripts: self + WebR WASM eval + blob workers + inline (Next.js hydration)
    // + Vercel Analytics + Vercel Live + Cloudflare Insights
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://va.vercel-scripts.com https://vercel.live https://static.cloudflareinsights.com",

    // Styles: self + inline (Tailwind CSS 4 requires unsafe-inline)
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

    // Fonts
    "font-src 'self' https://fonts.gstatic.com",

    // Images: self + data URIs + blob + all HTTPS (avatar proxy, OG images)
    "img-src 'self' data: blob: https:",

    // Connections: self + Supabase + Gemini AI + ORCID + WebR Repos + CDNs
    "connect-src 'self' blob: data: https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://api.crossref.org https://pub.orcid.org https://orcid.org https://va.vercel-scripts.com https://*.vercel-scripts.com https://cloudflareinsights.com https://repo.r-wasm.org https://*.r-wasm.org https://*.r-universe.dev https://cdn.jsdelivr.net https://*.vercel.app https://ncskit.org https://*.ncskit.org",

    // Workers: self + blob (WebR service worker)
    "worker-src 'self' blob:",
    
    // Media
    "media-src 'self' blob: data:",
].join('; ');

const nextConfig = {
    // Headers for WebR (WASM, Service Worker)
    async headers() {
        return [
            // Security headers for all pages
            {
                source: '/:path*',
                headers: [
                    // WebR WASM headers
                    // CRITICAL: 'credentialless' is required for compatibility with external R repos
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'credentialless',
                    },
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin',
                    },
                    // Security headers
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
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()',
                    },
                    // Content Security Policy
                    {
                        key: 'Content-Security-Policy',
                        value: CSP_DIRECTIVES,
                    },
                    // AGGRESSIVE CACHE BUSTING for main application routes
                    {
                        key: 'Cache-Control',
                        value: 'no-cache, no-store, must-revalidate',
                    },
                ],
            },
            // WebR core binaries
            {
                source: '/webr_core_v3/:path*',
                headers: [
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'credentialless',
                    },
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin',
                    },
                    {
                        key: 'Cross-Origin-Resource-Policy',
                        value: 'cross-origin',
                    },
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=0, must-revalidate',
                    },
                ],
            },
            // Local R package repository
            {
                source: '/webr_repo_v3/:path*',
                headers: [
                    {
                        key: 'Cross-Origin-Resource-Policy',
                        value: 'cross-origin',
                    },
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'credentialless',
                    },
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=86400, stale-while-revalidate=604800',
                    },
                ],
            },
            {
                source: '/webr-serviceworker.js',
                headers: [
                    {
                        key: 'Service-Worker-Allowed',
                        value: '/',
                    },
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'credentialless',
                    },
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin',
                    },
                    {
                        key: 'Cache-Control',
                        value: 'no-cache, no-store, must-revalidate',
                    },
                ],
            },
        ];
    },

    // Enable strict TypeScript checking for better code quality
    typescript: {
        ignoreBuildErrors: false,
    },

    // Enable compression
    compress: true,

    // Image optimization
    images: {
        formats: ['image/webp', 'image/avif'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },

    // Production optimizations
    productionBrowserSourceMaps: false,
    poweredByHeader: false,
    output: 'standalone',
};

export default nextConfig;
