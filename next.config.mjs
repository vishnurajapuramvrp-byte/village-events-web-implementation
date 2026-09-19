/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer", "@prisma/client", "bcryptjs"],
  },
};

export default nextConfig;
