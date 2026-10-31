import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "OAuth App Guides",
  description: "How hard is it to set up an OAuth app with a provider, how long approval takes, and what to do next.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand">
              <span className="brand-mark">O</span>
              OAuth App Guides
            </Link>
            <nav className="topnav">
              <Link href="/">Apps</Link>
              <Link href="/generate">Generate</Link>
              <Link href="/method" className="hide-sm">
                Method
              </Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="foot">
          <div className="page">
            Researched by agents from provider docs and live endpoint probes. Provider policies change; check the cited
            sources before relying on a deadline.
          </div>
        </footer>
      </body>
    </html>
  );
}
