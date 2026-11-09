"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Building2, Home, KeyRound, Layers3, MapPin, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const modes = [
  { value: "sell", label: "I’m selling", icon: Home },
  { value: "buy", label: "I’m buying", icon: KeyRound },
  { value: "both", label: "Sell + buy", icon: Layers3 },
] as const;

type Mode = (typeof modes)[number]["value"];

export function HeroSearch() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("both");
  const [address, setAddress] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams({ intent: mode });
    if (address.trim()) params.set("address", address.trim());
    router.push(`/sell-and-buy?${params.toString()}`);
  }

  return (
    <div className="rounded-2xl border border-white/70 bg-white/95 p-2.5 shadow-2xl shadow-slate-950/20 backdrop-blur-xl sm:p-3">
      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 pb-2.5" role="tablist" aria-label="Move intent">
        {modes.map(({ value, label, icon: Icon }) => (
          <button key={value} type="button" role="tab" aria-selected={mode === value} onClick={() => setMode(value)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all ${mode === value ? "bg-slate-950 text-white shadow-md" : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"}`}>
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 pt-2.5 sm:flex-row">
        <label className="relative flex min-h-12 flex-1 items-center"><MapPin className="pointer-events-none absolute left-4 size-5 text-coral-500" /><span className="sr-only">Property address or ZIP code</span><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Enter an address, neighborhood, or ZIP" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-medium text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100" /></label>
        <Button type="submit" size="lg" className="h-12 shrink-0 rounded-xl bg-coral-500 px-6 text-white shadow-lg shadow-coral-500/25 hover:bg-coral-600"><Search /> Explore my move <ArrowRight className="hidden sm:block" /></Button>
      </form>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 pb-1 pt-3 text-xs font-semibold text-slate-400"><span className="inline-flex items-center gap-1.5"><Sparkles className="size-3.5 text-amber-500" /> Free home value estimate</span><span className="hidden h-3 w-px bg-slate-200 sm:block" /><span className="inline-flex items-center gap-1.5"><Building2 className="size-3.5 text-sky-500" /> No spam, ever</span><span className="ml-auto hidden items-center gap-1.5 text-slate-500 sm:inline-flex">Trusted by 12,000+ movers</span></div>
    </div>
  );
}
