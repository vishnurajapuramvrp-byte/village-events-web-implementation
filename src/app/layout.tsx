import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { getSiteBranding } from "@/lib/site";
import "./globals.css";

const font = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

const siteUrl =
  process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://127.0.0.1:43123");

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteBranding();
  return {
    metadataBase: new URL(siteUrl),
    title: `${site.villageName} ${site.tagline}`,
    description: site.description,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${font.className} ${font.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
