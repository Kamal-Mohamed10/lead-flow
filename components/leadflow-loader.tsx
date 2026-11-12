'use client'

import { useEffect, useMemo, useState } from 'react'

interface LeadFlowLoaderProps {
  title?: string
  userName?: string
  phrases?: string[]
  compact?: boolean
}

export function LeadFlowLoader({
  title = 'LeadFlow NYC Intelligence',
  userName,
  phrases,
  compact = false,
}: LeadFlowLoaderProps) {
  const rotatingPhrases = useMemo(() => {
    if (phrases?.length) return phrases
    const firstName = userName?.trim() || 'Kamal'
    return [
      'Scanning live NYC ACRIS deeds, tax liens & HPD records…',
      'Scoring seller motivation & equity spread signals…',
      'Ranking your highest-scoring opportunities first…',
      `Preparing ${firstName}’s Priority Queue…`,
    ]
  }, [phrases, userName])

  const [phraseIndex, setPhraseIndex] = useState(0)

  useEffect(() => {
    if (rotatingPhrases.length <= 1) return
    const timer = setInterval(() => {
      setPhraseIndex((current) => (current + 1) % rotatingPhrases.length)
    }, 1600)
    return () => clearInterval(timer)
  }, [rotatingPhrases])

  const currentPhrase = rotatingPhrases[phraseIndex % rotatingPhrases.length]

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl border border-emerald-900/10 bg-[#f7f8f6] ${
        compact ? 'p-6' : 'mt-4 p-8'
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative flex size-16 items-center justify-center">
          <span className="absolute inset-0 rounded-2xl border-2 border-[#176b4d]/25 animate-ping" />
          <span className="absolute -inset-1 rounded-2xl border-2 border-transparent border-t-[#176b4d] border-r-[#8edbb8] animate-spin" />
          <div className="relative grid size-12 place-items-center rounded-xl bg-[#172b2a] text-sm font-black tracking-tight text-white shadow-md">
            LF
          </div>
        </div>

        <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-[#176b4d]">
          {title}
        </p>
        <p className="mt-1.5 min-h-[20px] text-sm font-bold text-[#172b2a] transition-opacity">
          {currentPhrase}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Pulling verified municipal filings across Manhattan, Brooklyn, Queens, Bronx &amp; Staten Island
        </p>
      </div>

      {!compact && (
        <div className="mt-6 space-y-2.5">
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white/80 p-3.5 animate-pulse"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="size-9 shrink-0 rounded-lg bg-slate-200/80" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-48 max-w-full rounded bg-slate-200/90" />
                  <div className="h-2.5 w-72 max-w-full rounded bg-slate-100" />
                </div>
              </div>
              <div className="h-6 w-16 shrink-0 rounded-full bg-emerald-100/70" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
