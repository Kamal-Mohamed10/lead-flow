"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Home, KeyRound, Layers3, MapPin, Search, Sparkles, type LucideIcon } from "lucide-react";

type Mode = "both" | "sell" | "buy";

const modes: { value: Mode; label: string; icon: LucideIcon; badge?: string }[] = [
  { value: "both", label: "Sell + Buy (Dual Move)", icon: Layers3, badge: "Highest Signal" },
  { value: "sell", label: "I’m Selling", icon: Home },
  { value: "buy", label: "I’m Buying", icon: KeyRound },
] as const;

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
    <div className="w-full max-w-3xl rounded-3xl border border-white/15 bg-[#0a0e17]/85 p-3 sm:p-4 shadow-2xl shadow-black/60 backdrop-blur-2xl">
      {/* Sleek Mode Tabs */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-white/10 pb-3" role="tablist" aria-label="Move intent">
        {modes.map(({ value, label, icon: Icon, badge }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={`group inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] transition-all ${
              mode === value
                ? "bg-white text-[#0a0e17] shadow-lg shadow-white/10"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon className="size-3.5 transition-transform group-hover:scale-110" />
            <span>{label}</span>
            {badge && (
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                  mode === value ? "bg-[#0a0e17] text-[#c5a880]" : "bg-white/15 text-[#c5a880]"
                }`}
              >
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-3 sm:flex-row sm:items-center">
        <label className="relative flex min-h-13 flex-1 items-center">
          <MapPin className="pointer-events-none absolute left-4 size-5 text-[#c5a880]" />
          <span className="sr-only">NYC Property Address, Neighborhood, or ZIP</span>
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Enter NYC address, building name, or neighborhood (e.g. 11 Hoyt, Soho, 10021)"
            className="h-13 w-full rounded-2xl border border-white/15 bg-white/5 pl-12 pr-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/40 focus:border-[#c5a880] focus:bg-white/10 focus:ring-2 focus:ring-[#c5a880]/30"
          />
        </label>
        <button
          type="submit"
          className="group flex h-13 shrink-0 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#c5a880] to-[#dfc19a] px-7 font-display text-xs font-black uppercase tracking-[0.18em] text-[#0a0e17] shadow-lg transition-all hover:brightness-105 hover:shadow-xl sm:w-auto"
        >
          <Search className="size-4 transition-transform group-hover:scale-110" />
          <span>Explore Market</span>
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </button>
      </form>

      {/* Trust & Data Source Highlights */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1 pt-3 text-[11px] font-medium text-white/60">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-white/80">
            <CheckCircle2 className="size-3.5 text-[#c5a880]" />
            Live NYC PLUTO & ACRIS Data
          </span>
          <span className="hidden h-3 w-px bg-white/15 sm:block" />
          <span className="inline-flex items-center gap-1.5 text-white/80">
            <Sparkles className="size-3.5 text-[#c5a880]" />
            Instant Valuation Signal
          </span>
        </div>
        <span className="hidden text-white/40 md:inline-block">Highline Residential Partner Network</span>
      </div>
    </div>
  );
}
