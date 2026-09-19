import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const font = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

const siteUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://127.0.0.1:43123");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Village Events & Programs",
  description: "Festival funds, donations, expenses, and repayable distributions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${font.className} ${font.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
