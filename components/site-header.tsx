import Link from "next/link";
import { ArrowUpRight, Building2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="MoveSmart home">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform group-hover:-rotate-3">
            <Building2 className="size-5" />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">MoveSmart</span>
        </Link>
        <nav className="flex items-center gap-3" aria-label="Primary navigation">
          <Link
            href="/#how-it-works"
            className="hidden text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            How it works
          </Link>
          <Button asChild size="sm" className="group">
            <Link href="/sell-and-buy">
              Get started
              <ArrowUpRight className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function TrustNote() {
  return (
    <div className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
      <ShieldCheck className="size-4 text-accent" />
      Your information stays private until you choose to connect.
    </div>
  );
}
