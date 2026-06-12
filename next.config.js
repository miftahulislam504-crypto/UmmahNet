/** @type {import('next').NextConfig} */
const nextConfig = {
  // BUG 7 FIX: ignoreBuildErrors ছিল true — এটা TypeScript error লুকিয়ে রাখত,
  // Vercel-এ runtime crash হত কিন্তু build log-এ কিছু দেখাত না।
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

module.exports = nextConfig;
