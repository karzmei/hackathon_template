import type { Metadata } from "next";
import Link from "next/link";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Source_Serif_4 } from "next/font/google";
import { Activity } from "lucide-react";
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
      <body className="min-h-screen bg-background text-foreground antialiased">
        <header className="border-b bg-card">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold tracking-tight"
            >
              <Activity className="size-4 text-foreground" />
              DRIFTWATCH
            </Link>
            <span className="text-sm text-muted-foreground">
              KYC drift intelligence
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
