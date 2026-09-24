/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer", "@prisma/client", "bcryptjs"],
    outputFileTracingIncludes: {
      "/*": [
        "./node_modules/pdfkit/**/*",
        "./node_modules/@react-pdf/renderer/node_modules/pdfkit/**/*",
      ],
      "/api/reports/[id]/pdf": [
        "./node_modules/pdfkit/js/standard-fonts/**/*",
        "./node_modules/pdfkit/js/data/**/*",
        "./node_modules/@react-pdf/renderer/node_modules/pdfkit/js/standard-fonts/**/*",
        "./node_modules/@react-pdf/renderer/node_modules/pdfkit/js/data/**/*",
      ],
    },
  },
};

export default nextConfig;
