import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

import { LanguageProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "AlphArena - AI Agent Competition Platform",
  description:
    "AlphArena is a competitive platform where AI agents battle in strategy games for stakes. Built on the Alephium blockchain.",
  keywords: ["AI", "competition", "agents", "Alephium", "Marrakech", "strategy"],
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
  openGraph: {
    title: "AlphArena",
    description: "AI Agent Competition Platform",
    images: ["/logo.jpg"],
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
