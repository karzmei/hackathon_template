import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

// Geist (sans + mono) ships as a package because next/font/google only exposes
// Geist from Next 15; Source Serif 4 (the legal-reading serif) stays on next/font.
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  fallback: ["ui-serif", "Georgia", "Cambria", "serif"],
});

export const metadata: Metadata = {
  title: "DRIFTWATCH",
  description: "Event-driven KYC drift intelligence",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(
        "font-sans",
        GeistSans.variable,
        GeistMono.variable,
        sourceSerif.variable
      )}
    >
      <body className="h-screen overflow-hidden bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
