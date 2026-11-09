import Link from "next/link";
import { ArrowUpRight, Building2, Heart, Menu, ShieldCheck } from "lucide-react";

const navItems = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Market snapshot", href: "/#market-snapshot" },
  { label: "For agents", href: "/#market-snapshot" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#10243b]/10 bg-[#f6f2ea]/92 backdrop-blur-xl">
      <div className="mx-auto flex h-17 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="MoveSmart home"><span className="flex size-9 items-center justify-center rounded-xl bg-[#ff6b4a] text-white shadow-lg shadow-[#ff6b4a]/25 transition-transform group-hover:-rotate-3"><Building2 className="size-5" /></span><span className="font-display text-lg font-black tracking-[-0.04em] text-[#10243b]">MoveSmart</span></Link>
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">{navItems.map((item) => <Link key={item.href} href={item.href} className="text-sm font-bold text-[#5c6a79] transition-colors hover:text-[#10243b]">{item.label}</Link>)}</nav>
        <div className="flex items-center gap-2.5"><Link href="/sell-and-buy" className="hidden items-center gap-1.5 text-sm font-black text-[#10243b] transition-colors hover:text-[#ff6b4a] sm:inline-flex"><Heart className="size-4" /> Save a search</Link><ButtonLink /><button type="button" aria-label="Open menu" className="flex size-9 items-center justify-center rounded-full border border-[#10243b]/10 text-[#10243b] lg:hidden"><Menu className="size-4" /></button></div>
      </div>
    </header>
  );
}

function ButtonLink() {
  return <Link href="/sell-and-buy" className="inline-flex items-center gap-1.5 rounded-full bg-[#10243b] px-4 py-2.5 text-sm font-black text-white transition-all hover:bg-[#1c3c5c]">Get my value <ArrowUpRight className="size-4" /></Link>;
}

export function TrustNote() {
  return <div className="inline-flex items-center gap-2 text-xs font-bold text-[#5c6a79]"><ShieldCheck className="size-4 text-[#2d8dc4]" /> Your information stays private until you choose to connect.</div>;
}
