import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

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
    <html lang="en">
      <body>
        <header className="bg-navy text-cream">
          <div className="mx-auto max-w-5xl px-6 py-4 flex items-baseline gap-3">
            <Link href="/" className="font-serif text-xl tracking-wide">
              DRIFTWATCH
            </Link>
            <span className="text-gold text-sm">KYC drift intelligence</span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
