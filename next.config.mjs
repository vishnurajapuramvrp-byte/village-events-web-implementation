/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer", "@prisma/client", "bcryptjs"],
  },
};

export default nextConfig;
