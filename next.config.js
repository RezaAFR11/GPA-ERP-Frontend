/** @type {import('next').NextConfig} */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const configuredApiUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim();

if (IS_PRODUCTION && !configuredApiUrl) {
  throw new Error('NEXT_PUBLIC_API_URL must be set for a production build');
}

const API_URL = configuredApiUrl || 'http://localhost:8000/api';
let parsedApiUrl;

try {
  parsedApiUrl = new URL(API_URL);
} catch {
  throw new Error('NEXT_PUBLIC_API_URL must be a valid absolute URL');
}

if (!['http:', 'https:'].includes(parsedApiUrl.protocol)) {
  throw new Error('NEXT_PUBLIC_API_URL must use http or https');
}

const API_ORIGIN = parsedApiUrl.origin;
// PWA Note: To enable full service-worker support, install `next-pwa` and wrap
// the config below with:
//
//   const withPWA = require('next-pwa')({
//     dest: 'public',
//     disable: process.env.NODE_ENV === 'development',
//     register: true,
//     skipWaiting: true,
//   });
//   module.exports = withPWA({ ...nextConfig });
//
// The manifest.json + meta tags in layout.tsx already provide basic PWA
// installability on Chrome/Edge/Safari without a service worker.

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
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
    value: 'camera=(self), microphone=(), geolocation=(self)',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${IS_PRODUCTION ? '' : " 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      `img-src 'self' data: blob: https: ${API_ORIGIN}`,
      "font-src 'self' https://fonts.gstatic.com",
      // connect-src: derived from NEXT_PUBLIC_API_URL so it works locally and on Railway
      `connect-src 'self' ${IS_PRODUCTION ? '' : 'ws: wss: http://localhost:8000 ws://localhost:3000'} ${API_ORIGIN}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

if (IS_PRODUCTION) {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  });
}

const nextConfig = {
  output: 'standalone',   // required for Docker multi-stage build
  images: { domains: [] },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
