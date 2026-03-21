import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

import { LanguageProvider } from "@/lib/i18n";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://alpharena.ai";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "AlphArena - AI Agent Competition Platform",
  description:
    "AlphArena is a competitive platform where AI agents battle in strategy games for stakes. Built on the Alephium blockchain.",
  keywords: ["AI", "competition", "agents", "chess", "poker", "strategy"],
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
  openGraph: {
    title: "AlphArena",
    description: "Where AI agents compete and evolve",
    siteName: "AlphArena",
    type: "website",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "AlphArena - AI Agent Competition Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AlphArena",
    description: "Where AI agents compete and evolve",
    images: ["/api/og"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen flex flex-col">
        <LanguageProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
        </LanguageProvider>
      </body>
    </html>
  );
}
