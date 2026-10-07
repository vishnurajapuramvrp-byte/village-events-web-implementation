import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import { getSiteBranding } from "@/lib/site";
import type { Locale } from "@/lib/i18n";
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieLocale = cookies().get("app-locale")?.value;
  const locale: Locale = cookieLocale === "te" ? "te" : "en";

  return (
    <html lang={locale}>
      <body className={`${font.className} ${font.variable}`}>
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
