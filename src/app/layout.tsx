import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Discipline — Quiet, private self-control tracking",
  description: "A calm, private space to build discipline, understand your patterns, and recover from setbacks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
