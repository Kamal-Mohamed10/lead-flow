"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Home,
  KeyRound,
  Layers3,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UsersRound,
  Zap,
} from "lucide-react";

import { HeroSearch } from "@/components/hero-search";
import { MarketExplorer } from "@/components/market-explorer";
import { SiteHeader, TrustNote } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    number: "01",
    title: "Share your NYC property",
    description: "A private, 3-minute intake captures your building, home details, and next-move intent without public exposure.",
    tag: "Confidential Intake",
  },
  {
    number: "02",
    title: "Generate building & equity signals",
    description: "We analyze historical ACRIS deed records, neighborhood price velocity, and determine dual-transaction priority.",
    tag: "Forensic Valuation",
  },
  {
    number: "03",
    title: "Direct agent alignment",
    description: "Connect with vetted NYC real estate professionals ready to coordinate both your sale and target purchase seamlessly.",
    tag: "Precision Match",
  },
];

const audience = [
  {
    icon: Home,
    title: "Selling in NYC",
    description: "Receive deep building and comp intelligence before starting public listing conversations.",
    stat: "NYC PLUTO Comps",
  },
  {
    icon: TrendingUp,
    title: "Buying in NYC",
    description: "Signal your exact purchase timeline so premier agents bring tailored, off-market inventory.",
    stat: "High-Intent Window",
  },
  {
    icon: UsersRound,
    title: "Top Producers & Teams",
    description: "Replace cold lists with verified public record property signals and motivated dual-transaction clients.",
    stat: "Live Workspace",
  },
];

export default function MarketingHomePage() {
  return (
    <div className="min-h-screen bg-[#070a10] text-slate-100 antialiased selection:bg-[#c5a880] selection:text-[#070a10]">
      {/* Top Sleek Navigation */}
      <SiteHeader />

      <main>
        {/* ========================================================= */}
        {/* HERO SECTION WITH ICONIC ARCHITECTURAL BUILDING BACKGROUND */}
        {/* ========================================================= */}
        <section className="relative isolate min-h-[92vh] overflow-hidden">
          {/* Architectural Luxury Building Image Background */}
          <div className="absolute inset-0 -z-20">
            <Image
              src="/images/luxury-building.jpg"
              alt="Iconic luxury high-rise architectural building facade"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center scale-105 transition-transform duration-1000 ease-out"
            />
            {/* Cinematic Gradient Overlays for crystal-clear readability & mood */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#080c14]/90 via-[#080c14]/65 to-[#070a10]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/20 via-transparent to-black/60" />
            <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] [background-size:80px_80px] opacity-40" />
          </div>

          <div className="mx-auto max-w-7xl px-5 pt-12 pb-24 sm:px-8 sm:pt-16 lg:pb-32">
            {/* Hero Header Content */}
            <div className="mx-auto max-w-4xl text-center">
              {/* Sleek Pill Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-[#c5a880] shadow-xl backdrop-blur-xl">
                <Sparkles className="size-3.5 text-[#c5a880]" />
                <span>New York City Real Estate Intelligence</span>
              </div>

              {/* Main Headline */}
              <h1 className="mt-8 text-balance font-display text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
                The building in focus. <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-white via-slate-200 to-[#c5a880] bg-clip-text text-transparent">
                  Your next move, perfected.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-slate-300 sm:text-lg sm:leading-8">
                LeadFlow NYC unites high-intent NYC homeowners who are selling and buying with premier market intelligence, powered by live public records and architectural forensics.
              </p>

              {/* Quick CTAs */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-13 rounded-2xl bg-white px-8 text-xs font-black uppercase tracking-[0.18em] text-[#080c14] shadow-2xl transition hover:bg-[#c5a880] hover:text-white"
                >
                  <Link href="/sell-and-buy">
                    Check My Home Value
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-13 rounded-2xl border-white/20 bg-white/10 px-7 text-xs font-bold uppercase tracking-[0.16em] text-white backdrop-blur-md hover:bg-white/20"
                >
                  <Link href="/dashboard">
                    <Sparkles className="size-4 text-[#c5a880]" />
                    Explore Live NYC Data · No Login
                  </Link>
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-white/60">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-[#c5a880]" />
                  Confidential & Private Intake
                </span>
                <span className="hidden size-1 rounded-full bg-white/30 sm:block" />
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-3.5 text-[#c5a880]" />
                  Takes Under 3 Minutes
                </span>
                <span className="hidden size-1 rounded-full bg-white/30 sm:block" />
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-[#c5a880]" />
                  Zero Cold Calling Lists
                </span>
              </div>
            </div>

            {/* Central Floating Hero Search Component */}
            <div className="mt-14 flex justify-center">
              <HeroSearch />
            </div>

            {/* High-Intent Dual-Transaction Lead Preview Card */}
            <div className="mx-auto mt-16 max-w-4xl">
              <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0e1422]/85 p-6 shadow-2xl shadow-black/80 backdrop-blur-2xl sm:p-8">
                {/* Glow accent */}
                <div className="absolute right-0 top-0 size-60 rounded-full bg-[#c5a880]/10 blur-3xl pointer-events-none" />

                <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#c5a880]">
                      <span className="size-2 rounded-full bg-[#c5a880] animate-pulse" />
                      Live Verified Signal Preview
                    </div>
                    <h3 className="mt-1.5 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
                      A deeper signal than generic web browsing.
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[#c5a880]/40 bg-[#c5a880]/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#c5a880]">
                      LIVE SIGNAL
                    </span>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-1 text-xs font-bold text-white/70 hover:text-white"
                    >
                      View in Pipeline <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">Estimated Asset Value</p>
                    <p className="mt-1 font-display text-3xl font-black text-white">$1,850,000</p>
                    <p className="mt-1 text-xs text-[#c5a880]">Manhattan Condo Index</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">Location & Architecture</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-white">
                      <MapPin className="size-4 text-[#c5a880]" />
                      West Village, NY 10014
                    </p>
                    <p className="mt-1 text-xs text-white/60">2 Bed · 2 Bath · Doorman Tower</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">Transaction Intent</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Sell + Buy (30–60 Days)</span>
                      <span className="rounded-lg bg-emerald-500/20 px-2 py-0.5 text-xs font-black text-emerald-400">
                        94 / 100
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white/60">Dual-transaction client priority</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-white/60">
                  <div className="flex items-center gap-2">
                    <LockKeyhole className="size-3.5 text-[#c5a880]" />
                    <span>Contact details remain protected until verified agent connection</span>
                  </div>
                  <Link
                    href="/sell-and-buy"
                    className="font-bold text-[#c5a880] transition hover:underline"
                  >
                    Submit your property for valuation →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* STATS STRIP - CLEAN SLEEK ARCHITECTURAL METRICS */}
        {/* ========================================================= */}
        <section className="border-y border-white/10 bg-[#0a0e17]">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-5 py-8 sm:grid-cols-4 sm:px-8">
            {[
              ["< 3 Min", "To complete intake"],
              ["30–90 Days", "Target move timeline"],
              ["100% Private", "Client records protected"],
              ["5 Boroughs", "NYC live PLUTO data"],
            ].map(([value, label]) => (
              <div key={label} className="text-center sm:text-left">
                <p className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {value}
                </p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================= */}
        {/* HOW IT WORKS - SLEEK MINIMALIST CARDS */}
        {/* ========================================================= */}
        <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-[#c5a880]">
              <span>The LeadFlow Methodology</span>
            </div>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Precision from the very first signal.
            </h2>
            <p className="mt-5 text-base leading-8 text-white/60 sm:text-lg">
              Generic forms discard critical move context. LeadFlow NYC captures the complete sequence—address, timeline, purchase budget, and motivation.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="group relative flex flex-col justify-between rounded-3xl border border-white/10 bg-[#0e1422]/60 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#c5a880]/40 hover:bg-[#0e1422] hover:shadow-2xl"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#c5a880]">
                      {step.number}
                    </span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/70">
                      {step.tag}
                    </span>
                  </div>
                  <h3 className="mt-8 font-display text-xl font-bold tracking-tight text-white">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/60">
                    {step.description}
                  </p>
                </div>
                <div className="mt-8 h-1 w-12 rounded-full bg-white/15 transition-all duration-300 group-hover:w-20 group-hover:bg-[#c5a880]" />
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================= */}
        {/* INTERACTIVE NYC MARKET EXPLORER (REDESIGNED LUXURY) */}
        {/* ========================================================= */}
        <MarketExplorer />

        {/* ========================================================= */}
        {/* THREE AUDIENCES SECTION */}
        {/* ========================================================= */}
        <section className="border-t border-white/10 bg-[#0a0e17] text-white">
          <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-28">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#c5a880]">
                  Architectural Clarity
                </p>
                <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
                  One platform. Three distinct advantages.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
                  Whether analyzing equity before listing, timing an acquisition, or managing client opportunities, LeadFlow aligns all stakeholders.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {audience.map(({ icon: Icon, title, description, stat }) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-white/10 bg-[#0e1422] p-6 transition hover:border-white/25"
                  >
                    <Icon className="size-5 text-[#c5a880]" />
                    <h3 className="mt-5 font-display text-base font-bold text-white">{title}</h3>
                    <p className="mt-2 text-xs leading-5 text-white/60">{description}</p>
                    <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-[#c5a880]">
                      {stat}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* FINAL CALL TO ACTION - LUXURY BUILDING BACKDROP */}
        {/* ========================================================= */}
        <section className="relative isolate overflow-hidden border-t border-white/10 bg-[#070a10] py-24 sm:py-32">
          {/* Subtle architectural building background */}
          <div className="absolute inset-0 -z-10">
            <Image
              src="/images/building-dusk.jpg"
              alt="NYC Luxury Building at Dusk"
              fill
              sizes="100vw"
              className="object-cover opacity-25 filter grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070a10] via-[#070a10]/80 to-[#070a10]" />
          </div>

          <div className="mx-auto max-w-5xl px-5 sm:px-8 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-[#c5a880] backdrop-blur-xl">
              <Sparkles className="size-3.5" />
              <span>Experience Highline Residential Precision</span>
            </div>

            <h2 className="mt-8 font-display text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Find out what your next move is worth.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-white/70 sm:text-lg">
              Begin with a private, no-pressure property review. Access live NYC public records and dual-transaction signals in minutes.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="h-13 rounded-2xl bg-white px-8 text-xs font-black uppercase tracking-[0.18em] text-[#080c14] shadow-2xl transition hover:bg-[#c5a880] hover:text-white"
              >
                <Link href="/sell-and-buy">
                  Start My Private Valuation
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-13 rounded-2xl border-white/20 bg-white/10 px-8 text-xs font-bold uppercase tracking-[0.16em] text-white backdrop-blur hover:bg-white/20"
              >
                <Link href="/dashboard">
                  Launch Agent Pipeline Demo
                </Link>
              </Button>
            </div>

            <p className="mt-6 text-xs text-white/50">
              No obligation. No spam. Completely free private assessment.
            </p>
          </div>
        </section>
      </main>

      {/* Sleek Minimalist Footer */}
      <footer className="border-t border-white/10 bg-[#05070c] py-12 text-xs text-white/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 sm:flex-row sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-lg border border-white/20 bg-white/10 font-display text-xs font-bold text-[#c5a880]">
              HL
            </span>
            <span>LeadFlow NYC · Highline Residential Architecture & Intelligence</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link href="/sell-and-buy" className="hover:text-white">Home Valuation</Link>
            <Link href="/#market-snapshot" className="hover:text-white">Market Intelligence</Link>
            <Link href="/dashboard" className="hover:text-white">Agent Portal</Link>
            <Link href="/login" className="hover:text-white">Sign In</Link>
          </div>

          <div>
            <span>NYC Public Records Data · Real-Time Compliance</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
