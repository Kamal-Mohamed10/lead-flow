'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Info, ShieldCheck, TrendingUp } from 'lucide-react'
import type { ScoreExplanation } from '@/lib/motivationClassifier'

interface ScoreBreakdownPanelProps {
  breakdown: ScoreExplanation
  compact?: boolean
  scrollBodyClassName?: string
}

const SEGMENT_COLORS = [
  'bg-[#176b4d]',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-sky-600',
]

export function ScoreBreakdownPanel({
  breakdown,
  compact = false,
  scrollBodyClassName,
}: ScoreBreakdownPanelProps) {
  const [showScoringGuide, setShowScoringGuide] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-[#176b4d]" />
          <h3 className={compact ? 'text-xs font-black uppercase tracking-wider text-[#172b2a]' : 'text-base font-black text-[#172b2a]'}>
            {compact ? 'How This Score Was Made' : 'Market Intelligence'}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            {breakdown.verificationStatus === 'Live Public-Record Verified' ? (
              <ShieldCheck className="size-3 text-[#176b4d]" />
            ) : (
              <CheckCircle2 className="size-3 text-slate-400" />
            )}
            {breakdown.verificationStatus}
          </span>
          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black ${breakdown.tierColor}`}>
            Score {breakdown.totalScore}/100 · {breakdown.tier}
          </span>
        </div>
      </div>

      <div className={scrollBodyClassName ? `space-y-3 pr-1.5 ${scrollBodyClassName}` : 'space-y-3'}>
        {/* Exact Score Math & Stacked Composition Bar */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-[#176b4d]">
            Why This Property Scored {breakdown.totalScore}/100
          </p>
          <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-[#172b2a] border border-emerald-200/80">
            {breakdown.equationLabel}
          </span>
        </div>

        {/* Stacked 100-Point Bar */}
        <div className="space-y-1">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80">
            {breakdown.factors.map((factor, idx) => (
              <div
                key={factor.label}
                style={{ width: `${factor.pointsEarned}%` }}
                className={`${SEGMENT_COLORS[idx % SEGMENT_COLORS.length]} transition-all duration-300`}
                title={`${factor.label}: ${factor.weight}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-600">
            {breakdown.factors.map((factor, idx) => (
              <span key={factor.label} className="inline-flex items-center gap-1">
                <span className={`inline-block size-2 rounded-full ${SEGMENT_COLORS[idx % SEGMENT_COLORS.length]}`} />
                <span>{factor.weight}</span>
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs leading-relaxed text-slate-700">{breakdown.summary}</p>
      </div>

      {/* Factor-by-factor driver list */}
      <div className="space-y-2.5">
        {breakdown.factors.map((factor, idx) => {
          const pct = Math.min(100, Math.round((factor.pointsEarned / factor.maxPoints) * 100))
          return (
            <div key={factor.label} className="rounded-xl border border-slate-200/80 bg-[#f7f8f6] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black text-[#172b2a]">{factor.label}</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                    {factor.sourceTag}
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[10px] font-black text-[#172b2a] border border-slate-200">
                    {factor.weight}
                  </span>
                  {!compact && (
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                        factor.impact === 'High'
                          ? 'bg-emerald-100 text-emerald-800'
                          : factor.impact === 'Moderate'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {factor.impact}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  style={{ width: `${pct}%` }}
                  className={`h-full rounded-full ${SEGMENT_COLORS[idx % SEGMENT_COLORS.length]}`}
                />
              </div>

              {!compact && <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{factor.detail}</p>}
            </div>
          )
        })}
      </div>

      {/* Transparent 100-point rubric explanation */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
        <button
          type="button"
          onClick={() => setShowScoringGuide((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#172b2a]">
            <Info className="size-3.5 text-[#176b4d]" />
            How Scores Are Made (100-Point Model)
          </span>
          {showScoringGuide ? (
            <ChevronUp className="size-4 text-slate-400" />
          ) : (
            <ChevronDown className="size-4 text-slate-400" />
          )}
        </button>

        {showScoringGuide && (
          <div className="mt-3 space-y-2.5 border-t border-slate-100 pt-3">
            {breakdown.systemPillars.map((pillar) => (
              <div key={pillar.title} className="rounded-lg bg-slate-50/80 p-2.5 text-xs leading-relaxed">
                <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-[#172b2a]">
                  <span>{pillar.title}</span>
                  <span className="font-mono text-[10px] font-black text-[#176b4d]">{pillar.maxPoints}</span>
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-slate-500">{pillar.formula}</p>
                <p className="mt-1 text-[11px] text-slate-600">{pillar.description}</p>
              </div>
            ))}
            <p className="text-[10px] leading-relaxed text-slate-500 pt-1">
              Confidence note: Scores combine public filing urgency, DOF/ACRIS equity checks, PLUTO building age, and parcel ownership structure to rank which off-market records to research first—they reflect public data signals, not guaranteed seller intent.
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
