import { ArrowLeft, LockKeyhole, Sparkles } from "lucide-react";
import Link from "next/link";

import { LeadCaptureForm } from "@/components/lead-capture-form";

export const metadata = {
  title: "Check your home value",
  description: "Share your home and next-home plans with a private MoveSmart intake.",
};

export default function SellAndBuyPage() {
  return (
    <main className="relative isolate overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-grid opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-8 lg:pb-28 lg:pt-14">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to MoveSmart
        </Link>
        <div className="mt-10 grid gap-12 lg:grid-cols-[0.65fr_1.35fr] lg:gap-20">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/8 px-3 py-1.5 text-xs font-bold text-accent">
              <Sparkles className="size-3.5" />
              High-intent move profile
            </div>
            <h1 className="mt-5 text-balance font-display text-4xl font-extrabold tracking-[-0.045em] text-slate-950 sm:text-5xl">A little context can change the outcome.</h1>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">Tell us what you know, what you’re planning, and what matters next. We’ll use the signal to make your introduction more useful.</p>
            <div className="mt-8 space-y-4">
              {[
                "A preliminary value estimate",
                "A clear sell + buy intent signal",
                "A private path to local help",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm font-semibold">
                  <span className="flex size-7 items-center justify-center rounded-full bg-accent/12 text-accent"><Sparkles className="size-3.5" /></span>
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-10 flex items-start gap-3 rounded-2xl border border-border bg-white/65 p-4 text-sm leading-6 text-muted-foreground">
              <LockKeyhole className="mt-0.5 size-4 shrink-0 text-primary" />
              Your full contact details stay protected from public marketplace views.
            </div>
          </aside>
          <LeadCaptureForm />
        </div>
      </div>
    </main>
  );
}
