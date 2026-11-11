import Link from "next/link";
import { ArrowUpRight, Building2, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-emerald-900/10 bg-[#172b2a]/95 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-3" aria-label="LeadFlow NYC home">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#176b4d] text-white shadow-lg shadow-[#176b4d]/25 transition-transform group-hover:-rotate-3">
            <Building2 className="size-5" />
          </span>
          <div>
            <span className="block font-serif text-xl font-bold tracking-tight text-white italic">
              LeadFlow <span className="text-[#8edbb8] not-italic font-sans">NYC</span>
            </span>
            <span className="block text-[9px] font-black uppercase tracking-[0.25em] text-[#8edbb8]/70">
              Off-Market Intelligence
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-4" aria-label="Primary navigation">
          <Link
            href="/#sources"
            className="hidden text-xs font-bold uppercase tracking-wider text-white/70 transition-colors hover:text-white sm:inline-flex"
          >
            Public Sources Log
          </Link>
          <Link
            href="/#categories"
            className="hidden text-xs font-bold uppercase tracking-wider text-white/70 transition-colors hover:text-white sm:inline-flex"
          >
            Motivation Categories
          </Link>
          <Link
            href="/login"
            className="text-xs font-bold uppercase tracking-wider text-[#8edbb8] transition-colors hover:text-white"
          >
            Agent Sign In
          </Link>
          <Button asChild size="sm" className="bg-[#176b4d] hover:bg-[#12543d] text-white font-bold text-xs shadow-md">
            <Link href="/dashboard">
              Launch Live Feed
              <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function TrustNote() {
  return (
    <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-900/70">
      <ShieldCheck className="size-4 text-[#176b4d]" />
      <span>Sourced directly from NYC DOF, ACRIS, HPD & DOB public registries. Updated hourly.</span>
    </div>
  );
}

