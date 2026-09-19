import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const font = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
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
