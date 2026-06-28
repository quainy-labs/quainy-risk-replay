import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quainy Risk Replay",
  description: "Replay safety tests for AI assistants, agents, and workflows before release."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link className="brand" href="/" aria-label="Quainy Risk Replay dashboard">
            <span className="brand-mark">Q</span>
            <span>
              <strong>Quainy Risk Replay</strong>
              <small>AI workflow release lab</small>
            </span>
          </Link>
          <nav aria-label="Primary navigation">
            <Link href="/">Dashboard</Link>
            <Link href="/report">Report</Link>
            <Link href="/case-study">Case study</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
