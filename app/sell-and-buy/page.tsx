import { ArrowLeft, Building2, CheckCircle2, LockKeyhole, Sparkles } from "lucide-react";
import Link from "next/link";

import { LeadCaptureForm } from "@/components/lead-capture-form";

export const metadata = {
  title: "Property Valuation Intake | LeadFlow NYC",
  description: "Private parcel and valuation check for New York City real estate professionals and property owners.",
};

export default function SellAndBuyPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#f7f8f6] text-[#172b2a]">
      <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-grid opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-8 lg:pb-28 lg:pt-14">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-900">
          <ArrowLeft className="size-4" />
          Back to LeadFlow NYC Home
        </Link>
        <div className="mt-8 grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <aside className="lg:sticky lg:top-28 lg:self-start space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-[#176b4d]">
              <Sparkles className="size-3.5" />
              Direct Property Valuation Intake
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#172b2a] leading-tight">
              Evaluate Property Equity & <span className="italic font-normal text-[#176b4d]">Market Value.</span>
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600">
              Submit parcel details to generate forensic equity estimates, recent deed transfer history, and public lien balances against official NYC Department of Finance tax assessment rolls.
            </p>
            <div className="space-y-3 pt-2">
              {[
                "NYC DOF assessed valuation match",
                "ACRIS recorded mortgage and lien history",
                "Dual-transaction timeline priority check",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-700">
                  <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-[#176b4d]">
                    <CheckCircle2 className="size-3.5" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-500 shadow-xs">
              <LockKeyhole className="mt-0.5 size-4 shrink-0 text-[#176b4d]" />
              Submitted property details remain private and are never syndicated to public consumer search engines.
            </div>
          </aside>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <LeadCaptureForm />
          </div>
        </div>
      </div>
    </main>
  );
}

