import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server external packages
  serverExternalPackages: ["mongodb", "playwright", "playwright-core"],

  // Pin Turbopack root to this project (avoids multi-lockfile warning from parent dirs)
  turbopack: {
    root: __dirname,
  },

  // Performance optimizations
  experimental: {
    // Enable compression
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "checkout.razorpay.com",
      },
      {
        protocol: "https",
        hostname: "**.razorpay.com",
      },
    ],
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        // Preview documents execute generated code. They must never be
        // readable cross-origin, and only the app origin may frame them.
        source: "/api/preview/render/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
      {
        // No wildcard CORS on the API surface. Routes that legitimately need
        // cross-origin access (the Render worker) set their own origin
        // allowlist from configuration.
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
          {
            key: "Content-Security-Policy",
            // The app shell must be able to embed preview documents, which are
            // same-origin but sandboxed. `frame-src 'self'` keeps that possible
            // without allowing arbitrary third-party frames.
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.vercel.app https://*.vercel-scripts.com https://accounts.google.com https://www.googletagmanager.com https://checkout.razorpay.com https://*.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.razorpay.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: wss:; frame-src 'self' https://accounts.google.com https://*.razorpay.com; object-src 'none'; base-uri 'self'; form-action 'self';"
          },
        ],
      },
    ];
  },

  // Redirects for SEO
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
      {
        source: "/landing",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
