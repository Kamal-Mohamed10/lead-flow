import Image from "next/image";
import { ArrowLeft, Check, Clock3, Home, KeyRound, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

import { LeadCaptureForm } from "@/components/lead-capture-form";

export const metadata = {
  title: "Check your home value",
  description: "Share your home and next-home plans with a private MoveSmart intake.",
};

export default function SellAndBuyPage() {
  return (
    <main className="bg-[#f6f2ea] text-[#10243b]">
      <section className="relative overflow-hidden bg-[#10243b] text-white">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="relative mx-auto max-w-7xl px-5 pb-28 pt-8 sm:px-8 lg:pb-32">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-300 transition-colors hover:text-white"><ArrowLeft className="size-4" /> Back to MoveSmart</Link>
          <div className="mt-12 grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-16">
            <div><div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-sky-200"><Sparkles className="size-3.5 text-coral-400" /> Private move profile</div><h1 className="mt-6 max-w-xl text-balance font-display text-4xl font-black leading-[1.02] tracking-[-0.05em] sm:text-6xl">A little context can change the outcome.</h1><p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">Tell us what you know, what you’re planning, and what matters next. We’ll use the signal to make your introduction more useful.</p><div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold text-slate-300"><span className="inline-flex items-center gap-2"><Check className="size-4 text-coral-400" /> About 3 minutes</span><span className="inline-flex items-center gap-2"><Check className="size-4 text-coral-400" /> No obligation</span></div></div>
            <div className="relative mx-auto w-full max-w-xl lg:ml-auto"><div className="relative aspect-[1.35/1] overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-2"><div className="relative h-full overflow-hidden rounded-[1.5rem]"><Image src="/images/interior-warm.jpg" alt="Warm modern living room" fill priority sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#10243b]/75 via-transparent to-transparent" /><div className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-white"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">Your home, your terms</p><p className="mt-1 font-display text-2xl font-black">Let’s make the next step clearer.</p></div><div className="flex size-11 items-center justify-center rounded-full bg-coral-500"><Sparkles className="size-5" /></div></div></div></div><div className="absolute -bottom-5 -left-4 flex items-center gap-3 rounded-2xl border border-white/15 bg-white p-4 text-[#10243b] shadow-2xl sm:-left-8"><div className="flex size-10 items-center justify-center rounded-xl bg-[#fff2ee] text-coral-500"><Home className="size-5" /></div><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Step 1</p><p className="mt-0.5 text-sm font-black">Tell us about home</p></div></div></div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24"><div className="grid gap-10 lg:grid-cols-[0.68fr_1.32fr] lg:gap-16"><aside className="lg:sticky lg:top-28 lg:self-start"><p className="text-xs font-black uppercase tracking-[0.24em] text-coral-500">What you’ll walk away with</p><div className="mt-7 space-y-5">{[{ icon: Home, title: "A sharper number", text: "A preliminary value estimate based on your home and location." }, { icon: KeyRound, title: "A stronger signal", text: "A clear view of whether you are selling, buying, or doing both." }, { icon: Clock3, title: "A useful next step", text: "A private path to the kind of local help that fits your timing." }].map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-coral-500 shadow-soft"><Icon className="size-5" /></div><div><h2 className="font-display text-lg font-black">{title}</h2><p className="mt-1 text-sm leading-6 text-[#5c6a79]">{text}</p></div></div>)}</div><div className="mt-9 flex items-start gap-3 rounded-2xl border border-[#10243b]/10 bg-white p-4 text-sm leading-6 text-[#5c6a79]"><LockKeyhole className="mt-0.5 size-4 shrink-0 text-coral-500" /><span><strong className="text-[#10243b]">Your privacy matters.</strong> Your full contact details stay protected from public marketplace views.</span></div></aside><LeadCaptureForm /></div></section>
      <section className="border-t border-[#10243b]/10 bg-white"><div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-6 text-xs font-bold text-[#5c6a79] sm:px-8"><ShieldCheck className="size-4 text-[#2d8dc4]" /> No spam. No data selling. You choose what happens next.</div></section>
    </main>
  );
}
