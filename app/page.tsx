import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Home,
  LockKeyhole,
  MapPin,
  Sparkles,
  TrendingUp,
  UsersRound,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    number: "01",
    title: "Share your property",
    description: "A short, private intake captures your address, home details, and next-move intent.",
  },
  {
    number: "02",
    title: "Get a clear signal",
    description: "We estimate value and identify whether your timing qualifies as a dual-transaction lead.",
  },
  {
    number: "03",
    title: "Connect with the right team",
    description: "Local agents who are ready for your move can review your signal and reach out directly.",
  },
];

const audience = [
  {
    icon: Home,
    title: "Selling soon",
    description: "Know your estimated value before you start a full listing conversation.",
  },
  {
    icon: TrendingUp,
    title: "Buying soon",
    description: "Tell the right agent that your purchase timeline is part of the same move.",
  },
  {
    icon: UsersRound,
    title: "Local agents",
    description: "Spend time on high-intent conversations instead of cold, generic leads.",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-grid [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
        <div className="mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20 lg:pb-28 lg:pt-24">
          <div className="max-w-2xl">
            <Badge className="mb-6 gap-2 bg-white/70 px-3.5 py-1.5 shadow-sm backdrop-blur">
              <Sparkles className="size-3.5" />
              The dual-transaction lead marketplace
            </Badge>
            <h1 className="max-w-3xl text-balance font-display text-5xl font-extrabold leading-[1.02] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">
              Your next move is more than one transaction.
            </h1>
            <p className="mt-7 max-w-xl text-balance text-lg leading-8 text-muted-foreground sm:text-xl">
              MoveSmart helps homeowners sell and buy with confidence, then connects
              high-intent movers to the local agents ready to help.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="group">
                <Link href="/sell-and-buy">
                  Check my home value
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#how-it-works">See how it works</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-accent" />
                Free, private intake
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 className="size-4 text-accent" />
                Takes about 3 minutes
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:ml-auto">
            <div className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-primary/10 blur-3xl" />
            <Card className="relative overflow-hidden border-white/80 bg-white/90 shadow-glow backdrop-blur">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
              <CardHeader className="relative border-b border-border/70 pb-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent">
                      <span className="size-2 rounded-full bg-accent shadow-[0_0_0_5px_hsl(187_92%_42_/_0.12)]" />
                      High-intent lead preview
                    </div>
                    <CardTitle className="text-2xl">A stronger signal than “just browsing.”</CardTitle>
                  </div>
                  <span className="rounded-lg bg-accent/10 px-2 py-1 text-xs font-bold text-accent">LIVE</span>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-5 pt-6">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated home value</p>
                    <p className="mt-1 font-display text-4xl font-extrabold tracking-tight text-slate-950">$485,000</p>
                  </div>
                  <div className="rounded-xl bg-primary/8 px-3 py-2 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Intent</p>
                    <p className="text-sm font-extrabold text-primary">92 / 100</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/70 bg-background/70 p-3.5">
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-bold"><MapPin className="size-3.5 text-accent" />Austin, TX 78704</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/70 p-3.5">
                    <p className="text-xs text-muted-foreground">Home</p>
                    <p className="mt-1 text-sm font-bold">3 bed · 2 bath · 1,840 ft²</p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Transaction profile</p>
                    <p className="mt-1 text-sm font-extrabold text-primary">Selling + buying in 30–90 days</p>
                  </div>
                  <Zap className="size-5 text-primary" />
                </div>
                <div className="space-y-2 border-t border-border/70 pt-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Protected until unlocked</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Full name</span>
                    <span className="select-none blur-sm">Jordan Mitchell</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Contact details</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary"><LockKeyhole className="size-3.5" /> Agent access only</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>


      <section className="border-y border-border/70 bg-white/65">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-8 sm:grid-cols-4 sm:px-8">
          {[
            ["3 min", "to complete"],
            ["30–90", "day intent window"],
            ["100%", "private by default"],
            ["0", "cold lead lists"],
          ].map(([value, label]) => (
            <div key={label} className="text-center sm:text-left">
              <p className="font-display text-2xl font-extrabold tracking-tight text-slate-950">{value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">A better lead signal</p>
          <h2 className="mt-4 text-balance font-display text-4xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-5xl">Make your timeline part of the conversation.</h2>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">The best agent is often the one who understands the whole move. MoveSmart captures the context that a generic “contact me” form throws away.</p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {steps.map((step) => (
            <Card key={step.number} className="group border-border/70 bg-white/75 transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-glow">
              <CardContent className="p-7">
                <span className="font-mono text-sm font-bold text-primary/70">{step.number}</span>
                <h3 className="mt-8 font-display text-xl font-extrabold tracking-tight">{step.title}</h3>
                <p className="mt-3 leading-7 text-muted-foreground">{step.description}</p>
                <div className="mt-7 h-1 w-12 rounded-full bg-primary/20 transition-all group-hover:w-20 group-hover:bg-primary" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">Built for the full move</p>
              <h2 className="mt-4 text-balance font-display text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">One signal. Three ways it can help.</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {audience.map(({ icon: Icon, title, description }) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <Icon className="size-5 text-cyan-300" />
                  <h3 className="mt-5 font-display font-extrabold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <Card className="overflow-hidden border-0 bg-primary text-primary-foreground shadow-glow">
          <CardContent className="relative p-8 sm:p-12 lg:p-16">
            <div className="absolute -right-20 -top-24 size-80 rounded-full border-[40px] border-white/10" />
            <div className="absolute -bottom-32 right-40 size-72 rounded-full border-[28px] border-cyan-300/15" />
            <div className="relative max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-200">Ready when you are</p>
              <h2 className="mt-4 text-balance font-display text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">Find out what your next move could be worth.</h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-primary-foreground/75">Start with a private, no-pressure check. It only takes a few minutes.</p>
              <Button asChild variant="dark" size="lg" className="mt-8 group">
                <Link href="/sell-and-buy">
                  Start my private check
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-primary-foreground/70">
                <Check className="size-3.5" />
                No obligation. No spam. You choose what happens next.
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
