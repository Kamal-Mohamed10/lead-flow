"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, BarChart3, Building2, Heart, Home, KeyRound, Layers3, MapPin, Sparkles, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";

const views = {
  both: {
    label: "Sell + Buy Dual Move",
    icon: Layers3,
    eyebrow: "Full Transaction Intelligence",
    title: "Capture both sides of NYC's most valuable movers.",
    description: "Homeowners sequencing a sale and purchase need seasoned guidance. LeadFlow synchronizes timelines, capital gains strategies, and off-market inventory in a single seamless profile.",
    image: "/images/luxury-building.jpg",
    imageAlt: "Iconic NYC luxury architectural high-rise",
    price: "2.4×",
    priceLabel: "Lead Value Multiple",
    trend: "+28% MoM",
    trendLabel: "Dual-move demand",
    stat: "94 / 100",
    statLabel: "Agent Alignment Score",
    tag: "Highline Exclusive Signal",
  },
  selling: {
    label: "Selling Soon",
    icon: Home,
    eyebrow: "Seller Market Forensics",
    title: "Price with architectural precision, not automated guesswork.",
    description: "Deep NYC public record intelligence reveals historical ACRIS deed history, neighborhood cap rates, and recent comparable sales across Manhattan, Brooklyn, and Queens.",
    image: "/images/building-dusk.jpg",
    imageAlt: "Luxury residential building at dusk",
    price: "$1.45M",
    priceLabel: "NYC Median Dual Asset",
    trend: "+5.2%",
    trendLabel: "12-Month Price Index",
    stat: "24 Days",
    statLabel: "Avg. Contract Velocity",
    tag: "Seller Confidence Index",
  },
  buying: {
    label: "Buying Soon",
    icon: KeyRound,
    eyebrow: "Acquisition Window",
    title: "Target the exact building, layout, and timing that fits.",
    description: "Connect purchase timelines directly with active NYC condo, co-op, and multi-family inventory before properties hit broad aggregators.",
    image: "/images/hero-building.jpg",
    imageAlt: "Modern NYC glass condominium tower",
    price: "30–90",
    priceLabel: "Target Day Window",
    trend: "Prime",
    trendLabel: "Buyer Readiness",
    stat: "100%",
    statLabel: "Verified Public Records",
    tag: "Pre-Market Buyer Match",
  },
} as const;

type ViewKey = keyof typeof views;

export function MarketExplorer() {
  const [activeView, setActiveView] = useState<ViewKey>("both");
  const [saved, setSaved] = useState(false);
  const active = views[activeView];
  const ActiveIcon = active.icon;

  return (
    <section id="market-snapshot" className="relative bg-[#070a10] py-24 text-white sm:py-32">
      {/* Subtle luxury architectural grid line overlay */}
      <div className="absolute inset-0 -z-10 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Section Header */}
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c5a880]/30 bg-[#c5a880]/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-[#c5a880]">
              <Sparkles className="size-3" />
              <span>NYC Market Forensics</span>
            </div>
            <h2 className="mt-4 text-balance font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Architectural insight. Verified signals.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/60 sm:text-lg">
              Explore how Highline Residential-grade data structures bring clarity to NYC sellers and buyers alike, combining building data with timing signals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/sell-and-buy"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-xs font-black uppercase tracking-[0.16em] text-[#070a10] shadow-xl transition-all hover:bg-[#c5a880] hover:text-white"
            >
              <span>Build My Move Profile</span>
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="mt-10 flex gap-2 overflow-x-auto border-b border-white/10 pb-4">
          {(Object.keys(views) as ViewKey[]).map((key) => {
            const view = views[key];
            const Icon = view.icon;
            const isSelected = activeView === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveView(key)}
                className={`inline-flex shrink-0 items-center gap-2.5 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] transition-all ${
                  isSelected
                    ? "border border-white/20 bg-white text-[#070a10] shadow-lg"
                    : "border border-transparent text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{view.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Snapshot Card & Building Showcase */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
          {/* Left Details Card */}
          <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-[#0e1422]/80 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#c5a880]">
                  <BarChart3 className="size-4" />
                  {active.eyebrow}
                </span>
                <button
                  type="button"
                  aria-label={saved ? "Saved" : "Save this view"}
                  onClick={() => setSaved((v) => !v)}
                  className={`flex size-10 items-center justify-center rounded-full border transition-all ${
                    saved
                      ? "border-[#c5a880] bg-[#c5a880] text-[#070a10]"
                      : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"
                  }`}
                >
                  <Heart className={`size-4 ${saved ? "fill-current" : ""}`} />
                </button>
              </div>

              <h3 className="mt-8 max-w-md font-display text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
                {active.title}
              </h3>
              <p className="mt-4 max-w-md text-sm leading-7 text-white/60">
                {active.description}
              </p>
            </div>

            <div className="mt-10 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{active.priceLabel}</p>
                  <p className="mt-1 font-display text-2xl font-black text-white">{active.price}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{active.statLabel}</p>
                  <p className="mt-1 font-display text-2xl font-black text-white">{active.stat}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs font-semibold text-white/70">
                <span className="flex items-center gap-1.5 text-[#c5a880]">
                  <TrendingUp className="size-4" />
                  {active.trend} · {active.trendLabel}
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-white/80">
                  {active.tag}
                </span>
              </div>
            </div>
          </div>

          {/* Right Architectural Building Canvas */}
          <div className="relative min-h-[30rem] overflow-hidden rounded-3xl border border-white/10 bg-[#0e1422] p-2 shadow-2xl">
            <div className="relative h-full min-h-[28rem] w-full overflow-hidden rounded-2xl">
              <Image
                src={active.image}
                alt={active.imageAlt}
                fill
                priority={activeView === "both"}
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover transition-all duration-700 hover:scale-105"
              />
              {/* Luxury architectural vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#070a10]/95 via-[#070a10]/30 to-[#070a10]/20" />

              {/* Floating Pill Tag */}
              <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md">
                <ActiveIcon className="size-3.5 text-[#c5a880]" />
                <span>{active.label}</span>
              </div>

              {/* Bottom Building Caption */}
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4 text-white">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#c5a880]">
                    Architectural NYC Inventory
                  </p>
                  <p className="mt-1 max-w-sm font-display text-xl font-bold leading-tight sm:text-2xl">
                    Sleek design. Timeless buildings. Precision representation.
                  </p>
                </div>
                <Link
                  href="/sell-and-buy"
                  className="hidden size-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white shadow-xl backdrop-blur transition hover:bg-white hover:text-black sm:flex"
                >
                  <ArrowUpRight className="size-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Market Context Footnote */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs text-white/50">
          <div className="flex items-center gap-2">
            <MapPin className="size-3.5 text-[#c5a880]" />
            <span>Real-time coverage across Manhattan, Brooklyn, Queens, Bronx, and Staten Island</span>
          </div>
          <span>NYC Department of Finance · ACRIS Records</span>
        </div>
      </div>
    </section>
  );
}
