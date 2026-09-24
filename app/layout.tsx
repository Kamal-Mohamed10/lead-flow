import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MoveSmart | Real estate leads with intent",
    template: "%s | MoveSmart",
  },
  description:
    "A private marketplace for high-intent homeowners who are selling and buying at the same time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
        <footer className="border-t border-border/70 bg-background/80">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="font-semibold text-foreground">MoveSmart</p>
            <p>High-intent real estate connections, built for the next move.</p>
            <p>© {new Date().getFullYear()} MoveSmart</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
