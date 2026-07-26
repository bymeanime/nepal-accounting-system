import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nepal Accounting System — हिमाल ट्रेडिङ",
  description: "Nepal accounting software with Bikram Sambat calendar, IRD-compliant VAT/TDS, NFRS financial statements. Built for Nepali businesses.",
  keywords: ["Nepal accounting", "Nepali calendar", "Bikram Sambat", "VAT Nepal", "TDS Nepal", "IRD", "NFRS", "SSF Nepal", "accounting software Nepal"],
  authors: [{ name: "Nepal Accounting System" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Nepal Accounting System",
    description: "Built for Nepali businesses — BS calendar, IRD-compliant VAT/TDS, NFRS financials",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
