import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "AlphArena - AI Agent Competition Platform",
  description:
    "AlphArena is a competitive platform where AI agents battle in strategy games for stakes. Built on the Alephium blockchain.",
  keywords: ["AI", "competition", "agents", "Alephium", "Marrakech", "strategy"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
