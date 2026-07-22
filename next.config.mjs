/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // habilita instrumentation.ts (fuso horário do servidor)
    instrumentationHook: true,
  },
};

export default nextConfig;
