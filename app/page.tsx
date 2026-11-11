import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Database,
  DollarSign,
  FileSearch,
  FileText,
  Landmark,
  LockKeyhole,
  MapPin,
  PhoneCall,
  Scale,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

import { SiteHeader, TrustNote } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const motivationCategories = [
  {
    num: "01",
    name: "Pre-Foreclosures",
    hook: "Negotiate Before Auction",
    desc: "Lis Pendens and referee notices filed with NYC Supreme Court. Intervene before auction deadlines.",
    badge: "Auction Pending",
  },
  {
    num: "02",
    name: "Estate & Probate Sales",
    hook: "Motivated Estate Representatives",
    desc: "Surrogate Court estate filings, executor deeds, and probate transfers across all 5 boroughs.",
    badge: "Inherited Asset",
  },
  {
    num: "03",
    name: "Vacant Properties",
    hook: "Off-Market Re-Development",
    desc: "City-flagged inactive buildings with HPD non-occupancy declarations and boarded entries.",
    badge: "Zero Occupancy",
  },
  {
    num: "04",
    name: "Short Sales",
    hook: "Below-Market Purchases",
    desc: "Properties with recorded debt balances exceeding current market valuation thresholds.",
    badge: "Debt Relief",
  },
  {
    num: "05",
    name: "Expired / Withdrawn Listings",
    hook: "Sellers Ready to Move",
    desc: "Sellers whose previous listing attempts failed. Re-engage with verified off-market cash offers.",
    badge: "Unsold Seller",
  },
  {
    num: "06",
    name: "Bank-Owned (REO)",
    hook: "Lender-Owned Inventory",
    desc: "Deed-in-lieu and post-foreclosure title transfers held on institutional balance sheets.",
    badge: "Lender Owned",
  },
  {
    num: "07",
    name: "Tax-Delinquent Properties",
    hook: "Urgent Financial Distress",
    desc: "DOF 60-day and 90-day municipal lien sale notices for property taxes, sewer, and emergency repairs.",
    badge: "Lien Sale List",
  },
  {
    num: "08",
    name: "Foreclosure Auctions",
    hook: "Direct Courthouse Bidding",
    desc: "Court-scheduled public auctions with legal referee appointments and foreclosure judgments.",
    badge: "Live Calendar",
  },
];

const publicSources = [
  {
    name: "NYC ACRIS Real Property Master",
    dataset: "bnx9-e6tj & 8h5j-fqxa",
    desc: "Recorded deeds, mortgages, modifications, satisfaction documents, and referee conveyances across Manhattan, Bronx, Brooklyn, and Queens.",
    latency: "Synchronized Hourly",
  },
  {
    name: "NYC Department of Finance (DOF)",
    dataset: "8y4t-faws",
    desc: "Annual property tax assessment rolls, current full market valuations (curmkttot), building classifications, and tax lot parcels.",
    latency: "Official Tax Rolls",
  },
  {
    name: "DOF 60/90-Day Tax Lien Sale Lists",
    dataset: "9rz4-mjek",
    desc: "Delinquent municipal tax, water, and emergency repair liens flagged for enforcement sale.",
    latency: "Active Lien Registry",
  },
  {
    name: "NYC Department of City Planning (PLUTO)",
    dataset: "64uk-42ks",
    desc: "Primary Land Use Tax Lot Output containing land use, residential unit counts, year built, zoning codes, and lot dimensions.",
    latency: "Zoning & Parcel Data",
  },
  {
    name: "NYC HPD Housing Violations & Registrations",
    dataset: "wvxf-dwi5 & feu5-w2e2",
    desc: "Multiple dwelling registrations containing registered owner and managing agent direct contact numbers for 3+ family assets.",
    latency: "Contact Registry",
  },
  {
    name: "NYC Department of Buildings (DOB)",
    dataset: "ic3t-wcy2 & 3h2n-5cm9",
    desc: "Permit applications, alteration filings, stop-work orders, and applicant contact numbers.",
    latency: "Permits & Violations",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f7f8f6] text-[#172b2a]">
      <SiteHeader />

      {/* Hero Section with Cinematic Background & Live Overlay */}
      <section className="relative isolate min-h-[92vh] flex items-center justify-center overflow-hidden bg-[#172b2a] text-white">
        {/* Cinematic Backdrop Video / Media with Dark Luxury Gradient */}
        <div className="absolute inset-0 -z-20 overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/images/luxury-building.jpg"
            className="h-full w-full object-cover object-center brightness-[0.34] contrast-[1.15] scale-105 transition-transform duration-1000"
          >
            <source
              src="https://assets.mixkit.co/videos/preview/mixkit-modern-residential-building-with-a-blue-sky-40742-large.mp4"
              type="video/mp4"
            />
            {/* Fallback image */}
            <Image
              src="/images/luxury-building.jpg"
              alt="New York City Architecture"
              fill
              priority
              className="object-cover object-center brightness-[0.38] contrast-[1.12]"
            />
          </video>
          {/* Rich Architectural Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#172b2a] via-[#172b2a]/60 to-[#172b2a]/80" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/35 via-transparent to-black/70" />
        </div>

        <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-950/70 px-4 py-1.5 backdrop-blur-md shadow-inner">
                <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#8edbb8]">
                  Exclusive to NYC Agents & Wholesalers
                </span>
              </div>

              <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight text-white">
                Find Off-Market Deals <br className="hidden sm:inline" />
                <span className="italic font-normal text-[#8edbb8]">Before They Hit The MLS.</span>
              </h1>

              <p className="max-w-xl text-base sm:text-lg leading-relaxed text-slate-300">
                Stop chasing cold lists or random addresses. LeadFlow NYC mines official NYC public registries—ACRIS deed recordings, DOF tax liens, and HPD distress filings—to deliver pre-qualified off-market opportunities with verified equity spreads.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3.5 sm:flex-row pt-2">
                <Button
                  asChild
                  size="lg"
                  className="bg-[#176b4d] hover:bg-[#12543d] text-white font-bold text-sm h-13 px-8 rounded-xl shadow-xl shadow-emerald-950/40 group transition-all"
                >
                  <Link href="/dashboard">
                    Access Live Opportunity Feed
                    <ArrowRight className="size-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-sm h-13 px-7 rounded-xl backdrop-blur-md"
                >
                  <Link href="#sources">
                    View Public Sources Log
                  </Link>
                </Button>
              </div>

              {/* Verified Trust Badges */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 pt-4 text-xs font-semibold text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  100% Free Public Data ($0 API)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  Do-Not-Call (DNC) Scrubbed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  All 5 NYC Boroughs
                </span>
              </div>
            </div>

            {/* Live Interactive Opportunity Dossier Card */}
            <div className="relative mx-auto w-full max-w-md lg:ml-auto">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-emerald-500/20 to-teal-500/10 blur-2xl -z-10" />

              <div className="overflow-hidden rounded-3xl border border-white/20 bg-[#172b2a]/90 text-white shadow-2xl backdrop-blur-xl">
                {/* Dossier Header */}
                <div className="border-b border-white/10 p-5 sm:p-6 bg-gradient-to-b from-white/5 to-transparent">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 rounded-lg bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-amber-300">
                      Category 1: Pre-Foreclosure
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                      Live Signal
                    </span>
                  </div>

                  <p className="mt-3 font-serif text-2xl font-bold tracking-tight text-white italic">
                    742 Evergreen Avenue
                  </p>
                  <p className="mt-0.5 text-xs text-slate-300 flex items-center gap-1 font-sans not-italic">
                    <MapPin className="size-3 text-emerald-400" /> Bushwick, Brooklyn, NY 11207
                  </p>
                </div>

                {/* Dossier Metrics */}
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Financial Equity Bar */}
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/60 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                        Estimated Net Equity Spread
                      </span>
                      <span className="rounded bg-emerald-500/30 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                        61% Spread
                      </span>
                    </div>
                    <p className="mt-1 font-serif text-3xl font-bold text-white tracking-tight italic">
                      $530,000 <span className="text-xs font-sans not-italic text-emerald-300 font-semibold">Net Equity</span>
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-emerald-500/20 pt-2.5 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">DOF Market Value</span>
                        <span className="font-bold text-slate-200">$850,000</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Recorded Debt & Liens</span>
                        <span className="font-bold text-rose-300">$320,000</span>
                      </div>
                    </div>
                  </div>

                  {/* Why it surfaced */}
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 text-xs">
                    <p className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">
                      Why This Property Came Up:
                    </p>
                    <p className="mt-1 text-slate-200 leading-relaxed">
                      Lis Pendens foreclosure filing logged with Brooklyn County Clerk. Referee appointed prior to auction.
                    </p>
                  </div>

                  {/* Owner Contact Snapshot */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Primary Recorded Owner</span>
                      <span className="font-bold text-slate-200">Estate Representative</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#176b4d] px-3 py-1.5 text-xs font-bold text-white shadow-xs">
                      <PhoneCall className="size-3" />
                      Numbers Available
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8 Specific Motivation Categories Section */}
      <section id="categories" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#176b4d]">
            Curated Distress Engine
          </p>
          <h2 className="mt-2.5 font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#172b2a]">
            Eight High-Motivation Seller Triggers. <br />
            <span className="italic font-normal text-slate-600">Zero Random Properties.</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Agents and wholesalers waste hours calling generic homeowner lists. LeadFlow NYC categorizes every parcel into eight proven motivation categories with explicit rationale so you understand the seller's urgency before you call.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {motivationCategories.map((cat) => (
            <Card
              key={cat.num}
              className="border-slate-200/90 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-[#176b4d]/40 hover:shadow-lg rounded-2xl"
            >
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#176b4d] bg-[#edf7f2] px-2.5 py-0.5 rounded-md">
                    Cat {cat.num}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {cat.badge}
                  </span>
                </div>

                <h3 className="font-serif text-xl font-bold tracking-tight text-[#172b2a]">
                  {cat.name}
                </h3>

                <p className="text-xs font-bold text-[#176b4d]">
                  Angle: {cat.hook}
                </p>

                <p className="text-xs leading-relaxed text-slate-600 border-t border-slate-100 pt-2.5">
                  {cat.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Live Public Sources Log & Credibility Audit */}
      <section id="sources" className="bg-[#172b2a] text-white py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
              <Database className="size-3.5" />
              Public Records Audit & Data Credibility
            </div>
            <h2 className="mt-3 font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white">
              Official City Registries. <br />
              <span className="italic font-normal text-[#8edbb8]">No Fabricated or Random Leads.</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              Every address on LeadFlow NYC originates from official municipal data feeds published by the City of New York. We cross-reference deeds, tax assessment rolls, and court filings with zero paid third-party fluff.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {publicSources.map((source, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-xl bg-[#176b4d]/40 p-2 text-emerald-300">
                    <Landmark className="size-4" />
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    {source.latency}
                  </span>
                </div>

                <h3 className="font-serif text-lg font-bold text-white">
                  {source.name}
                </h3>

                <p className="font-mono text-[11px] text-[#8edbb8]">
                  OpenData ID: {source.dataset}
                </p>

                <p className="text-xs leading-relaxed text-slate-300 border-t border-white/10 pt-2.5">
                  {source.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-white/15 bg-white/5 p-6 text-center text-xs text-slate-400">
            All records cited with NYC OpenData Socrata identifiers. No personal identifying information is sold or scraped from private consumer applications.
          </div>
        </div>
      </section>

      {/* Call to Action for Agents & Wholesalers */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="rounded-3xl border border-emerald-900/10 bg-gradient-to-br from-[#172b2a] via-[#1a3834] to-[#172b2a] p-8 sm:p-14 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#8edbb8]">
              Ready for Real Deal Flow?
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              Start Finding Off-Market NYC Deals Today.
            </h2>
            <p className="text-base text-slate-300 leading-relaxed">
              Launch your acquisition feed, inspect forensic title records, compute net equity spreads, and generate customized direct mail letters in seconds.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                size="lg"
                className="bg-[#176b4d] hover:bg-[#12543d] text-white font-bold text-sm h-13 px-8 rounded-xl shadow-lg group"
              >
                <Link href="/dashboard">
                  Launch Live Opportunity Feed
                  <ArrowRight className="size-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-sm h-13 px-7 rounded-xl"
              >
                <Link href="/login">
                  Workspace Login
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 text-slate-500 text-xs">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-[#176b4d]" />
            <span className="font-serif font-bold text-slate-900 text-sm italic">
              LeadFlow <span className="not-italic font-sans text-[#176b4d]">NYC</span>
            </span>
            <span className="text-slate-400">© {new Date().getFullYear()} All Rights Reserved.</span>
          </div>

          <div className="flex items-center gap-6 font-semibold">
            <Link href="/#sources" className="hover:text-slate-900">Data Sources</Link>
            <Link href="/#categories" className="hover:text-slate-900">Distress Categories</Link>
            <Link href="/dashboard" className="hover:text-slate-900">Live Feed</Link>
            <Link href="/login" className="hover:text-slate-900">Agent Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
