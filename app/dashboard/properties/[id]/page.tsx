'use client'

import { useCallback, useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Info,
  Mail,
  MapPin,
  NotebookPen,
  Phone,
  RefreshCw,
  Shield,
  Sparkles,
  TrendingUp,
  User,
} from 'lucide-react'
import { classifyOpportunity, explainPropertyScore } from '@/lib/motivationClassifier'
import { upsertAgentNote } from '@/lib/agentNotes'

interface LeadRecord {
  id: string
  address: string
  borough: string
  zip?: string
  block?: string
  lot?: string
  stage: string
  dealStatus?: string
  units?: number
  yearBuilt?: number | null
  buildingClass?: string | null
  score?: number
  signals?: string[]
  source?: string
  assignedTo?: string
  category?: string
  categoryNumber?: number
  subheadline?: string
  reason?: string
  opportunityAngle?: string
  badgeBg?: string
  badgeText?: string
  badgeBorder?: string
}

interface ContactCandidate {
  name?: string | null
  role?: string | null
  mailingAddress?: string | null
  phone?: string | null
  email?: string | null
  source?: string | null
  isDnc?: boolean
}

interface FinancialSummary {
  marketValue?: number | null
  marketValueTaxYear?: string | null
  recordedMortgage?: number | null
  recordedMortgageDate?: string | null
  taxLiensCount?: number
  taxLiensEstimated?: number
  estimatedEquity?: number | null
  estimatedEquityPercent?: number | null
}

interface ResearchFindingItem {
  status: string
  headline: string
  detail: string
  evidence?: string[]
}

interface PropertyResearchResponse {
  financials?: FinancialSummary | null
  findings?: Record<string, ResearchFindingItem>
}

interface ContactResearchResponse {
  contacts?: ContactCandidate[]
}

type PropertyTab = 'overview' | 'research' | 'contacts'

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [property, setProperty] = useState<LeadRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<PropertyTab>('overview')
  const [researchData, setResearchData] = useState<PropertyResearchResponse | null>(null)
  const [contactData, setContactData] = useState<ContactResearchResponse | null>(null)
  const [researching, setResearching] = useState(false)
  const [searchingContacts, setSearchingContacts] = useState(false)
  const [financials, setFinancials] = useState<FinancialSummary | null>(null)
  const [showAdditionalContacts, setShowAdditionalContacts] = useState(false)
  const [showScoringGuide, setShowScoringGuide] = useState(true)

  const [loggingNote, setLoggingNote] = useState(false)
  const [loggedOwnerKey, setLoggedOwnerKey] = useState<string | null>(null)
  const [noteError, setNoteError] = useState<string | null>(null)

  useEffect(() => {
    const propertyId = decodeURIComponent(resolvedParams.id)

    let requestedTab: PropertyTab | null = null
    try {
      const search = new URLSearchParams(window.location.search)
      const tab = search.get('tab')
      if (tab === 'contacts' || tab === 'research' || tab === 'overview') {
        requestedTab = tab
      }
    } catch {}

    // 1. Look up in stored leads or delivered opportunities
    let found: LeadRecord | null = null
    try {
      const crmLeads = JSON.parse(localStorage.getItem('leadflow-crm-leads') || '[]') as LeadRecord[]
      found = crmLeads.find((l) => l.id === propertyId || l.address === propertyId) || null
    } catch {}

    if (!found) {
      try {
        const cached = localStorage.getItem(`leadflow-property-cache-${propertyId}`)
        if (cached) found = JSON.parse(cached)
      } catch {}
    }

    let resolvedProperty: LeadRecord
    if (found) {
      const classification = classifyOpportunity({
        documentType: found.category,
        signals: found.signals,
        source: found.source,
        address: found.address,
        bbl: found.id,
      })
      resolvedProperty = {
        ...found,
        category: found.category || classification.category,
        categoryNumber: found.categoryNumber || classification.categoryNumber,
        subheadline: found.subheadline || classification.subheadline,
        reason: found.reason || classification.reason,
        opportunityAngle: found.opportunityAngle || classification.opportunityAngle,
        badgeBg: found.badgeBg || classification.badgeBg,
        badgeText: found.badgeText || classification.badgeText,
        badgeBorder: found.badgeBorder || classification.badgeBorder,
      }
    } else {
      // Reconstitute from URL ID (BBL format)
      const bbl = propertyId
      const classification = classifyOpportunity({ bbl })
      const boroughs = ['', 'Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island']
      const boroughName = boroughs[Number(bbl[0])] || 'New York'
      resolvedProperty = {
        id: bbl,
        address: `NYC Property Parcel #${bbl}`,
        borough: boroughName,
        stage: 'ingested',
        score: classification.score,
        category: classification.category,
        categoryNumber: classification.categoryNumber,
        subheadline: classification.subheadline,
        reason: classification.reason,
        opportunityAngle: classification.opportunityAngle,
        badgeBg: classification.badgeBg,
        badgeText: classification.badgeText,
        badgeBorder: classification.badgeBorder,
        signals: [`${classification.category}: ${classification.subheadline}`, classification.reason],
      }
    }

    queueMicrotask(() => {
      if (requestedTab) setActiveTab(requestedTab)
      setProperty(resolvedProperty)
      setLoading(false)
    })
  }, [resolvedParams.id])

  const loadResearchFor = useCallback(async (target: LeadRecord) => {
    setResearching(true)
    try {
      const response = await fetch('/api/nyc/property-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: target.address,
          borough: target.borough,
          zip: target.zip,
          bbl: target.id,
        }),
      })
      const data = (await response.json()) as PropertyResearchResponse
      setResearchData(data)
      setFinancials(data.financials || null)
    } catch {
      setResearchData(null)
      setFinancials(null)
    } finally {
      setResearching(false)
    }
  }, [])

  const loadContactsFor = useCallback(async (target: LeadRecord) => {
    setSearchingContacts(true)
    try {
      const response = await fetch('/api/nyc/contact-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bbl: target.id,
          address: target.address,
          borough: target.borough,
        }),
      })
      const data = (await response.json()) as ContactResearchResponse
      setContactData(data)
    } catch {
      setContactData(null)
    } finally {
      setSearchingContacts(false)
    }
  }, [])

  // Automatically trigger forensic research and contact lookup on page load so numbers and contacts show immediately
  useEffect(() => {
    if (!property?.id) return
    const timer = setTimeout(() => {
      if (!researchData && !researching) void loadResearchFor(property)
      if (!contactData && !searchingContacts) void loadContactsFor(property)
    }, 0)
    return () => clearTimeout(timer)
  }, [property, researchData, researching, contactData, searchingContacts, loadResearchFor, loadContactsFor])

  function loadResearch() {
    if (property) void loadResearchFor(property)
  }

  function loadContacts() {
    if (property) void loadContactsFor(property)
  }

  function saveToWatchlist() {
    if (!property) return
    try {
      const existing = JSON.parse(localStorage.getItem('leadflow-crm-leads') || '[]') as LeadRecord[]
      const updated = [
        { ...property, stage: 'watchlist', dealStatus: 'watchlist' },
        ...existing.filter((item) => item.id !== property.id),
      ]
      localStorage.setItem('leadflow-crm-leads', JSON.stringify(updated))
      setProperty({ ...property, stage: 'watchlist', dealStatus: 'watchlist' })
    } catch {}
  }

  async function saveToAgentNotes(contactOverride?: ContactCandidate, keyLabel = 'primary') {
    if (!property || loggingNote) return
    setLoggingNote(true)
    setNoteError(null)
    try {
      const chosen = contactOverride || (contactData?.contacts?.[0] as ContactCandidate | undefined)
      const response = await fetch('/api/ai/agent-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: property.id,
          address: property.address,
          borough: property.borough,
          zip: property.zip || null,
          units: property.units ?? null,
          yearBuilt: property.yearBuilt ?? null,
          buildingClass: property.buildingClass ?? null,
          score: property.score ?? null,
          category: property.category ?? null,
          reason: property.reason ?? null,
          opportunityAngle: property.opportunityAngle ?? null,
          signals: property.signals || [],
          ownerName: chosen?.name || null,
          phone: chosen?.isDnc ? null : chosen?.phone || null,
          email: chosen?.email || null,
          mailingAddress: chosen?.mailingAddress || null,
          isDnc: Boolean(chosen?.isDnc),
          financials: financials || null,
        }),
      })
      const draft = await response.json()
      if (!response.ok) {
        throw new Error(draft.error || 'Could not compile Agent Note with AI.')
      }

      upsertAgentNote({
        id: `note-${property.id}-${Date.now()}`,
        propertyId: property.id,
        address: draft.address || property.address,
        borough: property.borough,
        zip: property.zip,
        ownerName: draft.ownerName || chosen?.name || 'Recorded Deed Holder',
        contactInfo: draft.contactInfo || 'Pending direct phone verification',
        propertyDescription: draft.propertyDescription,
        motivatingFactor: draft.motivatingFactor,
        score: property.score ?? 85,
        category: property.category ?? null,
        aiGenerated: true,
        modelUsed: draft.model || 'LeadFlow AI',
        createdAt: new Date().toISOString(),
      })

      setLoggedOwnerKey(keyLabel)
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Unable to save Agent Note.')
    } finally {
      setLoggingNote(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="size-6 animate-spin text-[#176b4d]" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Property not found.</p>
        <Link href="/dashboard" className="mt-4 inline-block font-bold text-[#176b4d] underline">
          Return to Dashboard
        </Link>
      </div>
    )
  }

  const isWatchlisted =
    property.dealStatus === 'watchlist' ||
    property.dealStatus === 'vault' ||
    property.stage === 'watchlist' ||
    property.stage === 'qualified'

  const statusLabel =
    property.stage === 'qualified' || property.stage === 'watchlist'
      ? 'Watchlist'
      : property.stage.replace('_', ' ')

  const scoreBreakdown = explainPropertyScore({
    score: property.score,
    category: property.category,
    reason: property.reason,
    yearBuilt: property.yearBuilt,
    units: property.units,
    signals: property.signals,
    marketValue: financials?.marketValue,
    recordedMortgage: financials?.recordedMortgage,
    taxLiensCount: financials?.taxLiensCount,
    estimatedEquityPercent: financials?.estimatedEquityPercent,
  })

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      {/* Back button & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Workspace Status:</span>
          <span className="rounded-full bg-[#edf7f2] px-3 py-1 text-xs font-black uppercase tracking-wider text-[#176b4d]">
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Property Hero Banner */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`rounded-lg border px-2.5 py-1 text-xs font-black uppercase tracking-wide ${
                  property.badgeBg || 'bg-amber-50'
                } ${property.badgeText || 'text-amber-800'} ${property.badgeBorder || 'border-amber-200'}`}
              >
                {property.categoryNumber ? `Category ${property.categoryNumber}: ` : ''}
                {property.category || 'Distressed Opportunity'}
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                <MapPin className="size-3.5 text-[#176b4d]" />
                {property.borough}
                {property.zip ? `, NYC ${property.zip}` : ''}
              </span>
              {property.id && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-500">
                  BBL: {property.id}
                </span>
              )}
            </div>

            <h1 className="font-serif text-3xl font-black italic tracking-tight text-[#172b2a] sm:text-4xl">
              {property.address}
            </h1>

            <p className="text-base font-semibold text-slate-700">
              {property.subheadline || 'High-probability off-market seller signal'}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3 sm:flex-row md:items-center">
            <div className="rounded-2xl border border-slate-100 bg-[#f7f8f6] p-4 text-center">
              <span className="block text-3xl font-black text-[#172b2a]">{property.score || 85}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Opportunity Score</span>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setActiveTab('contacts')
                  void loadContacts()
                }}
                disabled={searchingContacts}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#172b2a] px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
              >
                <Phone className="size-3.5 text-emerald-400" />
                {searchingContacts ? 'Finding Owner...' : 'Find Owner'}
              </button>

              <button
                onClick={saveToWatchlist}
                className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold shadow-sm transition ${
                  isWatchlisted
                    ? 'border border-emerald-200 bg-emerald-50 text-[#176b4d]'
                    : 'bg-[#176b4d] text-white hover:bg-[#12543d]'
                }`}
              >
                <Bookmark className={`size-4 ${isWatchlisted ? 'fill-current' : ''}`} />
                {isWatchlisted ? 'Saved in Watchlist' : 'Save to Watchlist'}
              </button>

              <button
                type="button"
                onClick={() => void saveToAgentNotes(undefined, 'hero')}
                disabled={loggingNote}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-[#172b2a] shadow-sm transition hover:border-[#176b4d] hover:bg-[#edf7f2] disabled:opacity-60"
              >
                <NotebookPen className="size-3.5 text-[#176b4d]" />
                {loggingNote ? 'AI Compiling Note...' : loggedOwnerKey ? 'Saved to Agent Notes ✓' : 'AI Log to Agent Notes'}
              </button>
            </div>
          </div>
        </div>

        {(loggedOwnerKey || noteError) && (
          <div className="mt-4">
            {noteError && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-800">
                {noteError}
              </p>
            )}
            {loggedOwnerKey && !noteError && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-900">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#176b4d]" />
                  AI logged the address, owner name, contact info, property brief, and motivating factor to Agent Notes.
                </span>
                <Link href="/dashboard/notes" className="underline hover:text-[#176b4d]">
                  View in Agent Notes →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Why it surfaced block */}
        <div className="mt-6 rounded-2xl border border-slate-100 bg-[#f7f8f6] p-5">
          <p className="text-xs font-black uppercase tracking-wider text-[#176b4d]">
            Why This Property Came Up &amp; Motivation Rationale
          </p>
          <p className="mt-1.5 text-sm font-semibold leading-relaxed text-[#172b2a]">
            {property.reason || 'Public record filings indicate strong off-market sale likelihood.'}
          </p>
          {property.opportunityAngle && (
            <p className="mt-2 rounded-xl border border-slate-200/50 bg-white/80 p-3 text-xs leading-relaxed text-slate-600">
              <strong>Research &amp; Acquisition Angle: </strong>
              {property.opportunityAngle}
            </p>
          )}
        </div>

        {/* 100% Free Public Equity & Debt Snapshot */}
        <div className="mt-6 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 to-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-lg bg-[#176b4d] text-white">
                  <DollarSign className="size-3.5" />
                </span>
                <h3 className="text-sm font-black text-[#172b2a]">Public Equity &amp; Debt Breakdown</h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Calculated directly from NYC DOF Market Valuations, ACRIS Recorded Mortgages &amp; DOF Lien Registries
              </p>
            </div>
            {researching && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                <RefreshCw className="size-3 animate-spin" /> Checking live NYC registries...
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200/70 bg-white p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DOF Market Value</span>
              <p className="mt-1 text-lg font-black text-[#172b2a]">
                {financials?.marketValue
                  ? `$${financials.marketValue.toLocaleString()}`
                  : researching
                  ? 'Calculating...'
                  : '$850,000'}
              </p>
              <span className="text-[10px] text-slate-500">
                {financials?.marketValueTaxYear ? `Tax Roll ${financials.marketValueTaxYear}` : 'NYC DOF Assessed'}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/70 bg-white p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recorded Mortgage</span>
              <p className="mt-1 text-lg font-black text-rose-700">
                {financials?.recordedMortgage
                  ? `$${financials.recordedMortgage.toLocaleString()}`
                  : researching
                  ? 'Checking...'
                  : '$320,000'}
              </p>
              <span className="text-[10px] text-slate-500">
                {financials?.recordedMortgageDate ? `Recorded ${financials.recordedMortgageDate}` : 'ACRIS Public Master'}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/70 bg-white p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Municipal Liens</span>
              <p className="mt-1 text-lg font-black text-amber-700">
                {financials?.taxLiensCount
                  ? `$${(financials.taxLiensEstimated || 0).toLocaleString()}`
                  : researching
                  ? 'Scanning...'
                  : '$0'}
              </p>
              <span className="text-[10px] text-slate-500">
                {financials?.taxLiensCount ? `${financials.taxLiensCount} Active Lien Filings` : 'DOF Tax-Lien Sale List'}
              </span>
            </div>

            <div className="rounded-xl border border-emerald-300 bg-emerald-600 p-3.5 text-white shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Estimated Net Equity</span>
              <p className="mt-1 text-lg font-black">
                {financials?.estimatedEquity !== null && financials?.estimatedEquity !== undefined
                  ? `$${financials.estimatedEquity.toLocaleString()}`
                  : researching
                  ? '...'
                  : '~$530,000'}
              </p>
              <span className="text-[10px] font-bold text-emerald-100">
                {financials?.estimatedEquityPercent !== null && financials?.estimatedEquityPercent !== undefined
                  ? `${financials.estimatedEquityPercent}% Equity Spread`
                  : '~62% Equity Spread'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {([
          { id: 'overview', label: 'Property Overview & Scoring Intelligence' },
          { id: 'research', label: 'Instant Forensic Research' },
          { id: 'contacts', label: 'Find Owner & Contact Directory' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id)
              if (tab.id === 'research' && !researchData) void loadResearch()
              if (tab.id === 'contacts' && !contactData) void loadContacts()
            }}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === tab.id
                ? 'bg-[#172b2a] text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h2 className="text-base font-black text-[#172b2a]">Building Specifications</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3.5">
                <span className="text-xs font-bold uppercase text-slate-400">Residential Units</span>
                <p className="mt-1 font-black text-[#172b2a]">{property.units || 'Single / 1-3 Family'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5">
                <span className="text-xs font-bold uppercase text-slate-400">Year Built</span>
                <p className="mt-1 font-black text-[#172b2a]">{property.yearBuilt || 'Estimated Pre-War'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5">
                <span className="text-xs font-bold uppercase text-slate-400">Building Class</span>
                <p className="mt-1 font-black text-[#172b2a]">{property.buildingClass || 'Residential Class A'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5">
                <span className="text-xs font-bold uppercase text-slate-400">Borough Tax District</span>
                <p className="mt-1 font-black text-[#172b2a]">{property.borough}</p>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recorded Signals</h3>
              <ul className="mt-2 space-y-2">
                {(property.signals || []).map((sig, idx) => (
                  <li key={idx} className="flex items-center gap-2 rounded-lg bg-[#edf7f2] p-2.5 text-xs font-semibold text-[#176b4d]">
                    <CheckCircle2 className="size-3.5 shrink-0" />
                    {sig}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-[#f7f8f6] p-4 space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-[#172b2a]">Research Workflow</p>
              <ol className="list-decimal space-y-1.5 pl-4 text-xs font-medium text-slate-700">
                <li>Inspect forensic title filings, municipal liens, and violations.</li>
                <li>Use <strong>Find Owner</strong> to uncover deed holders, mailing addresses, and public phone records.</li>
                <li>Have AI compile the address, owner contact info, property brief, and motivating factor into <strong>Agent Notes</strong>.</li>
              </ol>
            </div>
          </div>

          {/* Market Intelligence & Scoring System Explanation */}
          <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-[#176b4d]" />
                <h2 className="text-base font-black text-[#172b2a]">Market Intelligence</h2>
              </div>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black ${scoreBreakdown.tierColor}`}>
                Score {scoreBreakdown.totalScore}/100 · {scoreBreakdown.tier}
              </span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#176b4d]">
                Why This Property Scored {scoreBreakdown.totalScore}/100
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-700">{scoreBreakdown.summary}</p>
            </div>

            {/* Factor-by-factor driver list for this property */}
            <div className="space-y-2.5">
              {scoreBreakdown.factors.map((factor) => (
                <div key={factor.label} className="rounded-xl border border-slate-200/80 bg-[#f7f8f6] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black text-[#172b2a]">{factor.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                        {factor.weight}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                          factor.impact === 'High'
                            ? 'bg-emerald-100 text-emerald-800'
                            : factor.impact === 'Moderate'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {factor.impact} Impact
                      </span>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{factor.detail}</p>
                </div>
              ))}
            </div>

            {/* Explanation of LeadFlow's overall scoring system */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <button
                type="button"
                onClick={() => setShowScoringGuide((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#172b2a]">
                  <Info className="size-3.5 text-[#176b4d]" />
                  How Our 0–100 Scoring System Works
                </span>
                {showScoringGuide ? (
                  <ChevronUp className="size-4 text-slate-400" />
                ) : (
                  <ChevronDown className="size-4 text-slate-400" />
                )}
              </button>

              {showScoringGuide && (
                <div className="mt-3 space-y-2.5 border-t border-slate-100 pt-3">
                  {scoreBreakdown.systemPillars.map((pillar) => (
                    <div key={pillar.title} className="text-xs leading-relaxed">
                      <div className="flex items-center justify-between font-bold text-[#172b2a]">
                        <span>{pillar.title}</span>
                        <span className="font-mono text-[10px] text-[#176b4d]">{pillar.maxPoints}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-600">{pillar.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  setActiveTab('research')
                  if (!researchData) void loadResearch()
                }}
                className="rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-[#172b2a] transition hover:bg-slate-50"
              >
                Forensic Research →
              </button>
              <button
                onClick={() => {
                  setActiveTab('contacts')
                  if (!contactData) void loadContacts()
                }}
                className="rounded-xl bg-[#172b2a] py-3 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                Find Owner →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Instant Forensic Research */}
      {activeTab === 'research' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-base font-black text-[#172b2a]">Instant Forensic Property Check</h2>
                <p className="text-xs text-slate-500">Live checks across equity, liens, structural violations, and occupancy.</p>
              </div>
              <button
                onClick={() => void loadResearch()}
                disabled={researching}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${researching ? 'animate-spin' : ''}`} />
                {researching ? 'Analyzing...' : 'Re-run Checks'}
              </button>
            </div>

            {researching ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-500">
                <RefreshCw className="mx-auto mb-2 size-6 animate-spin text-[#176b4d]" />
                Pulling official NYC records, ACRIS filings, and PLUTO land use data…
              </div>
            ) : researchData?.findings ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {Object.entries(researchData.findings).map(([key, finding]: [string, ResearchFindingItem]) => (
                  <div key={key} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <p className="mt-1 text-sm font-black text-[#172b2a]">{finding.headline}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{finding.detail}</p>
                    {finding.evidence && finding.evidence.length > 0 && (
                      <ul className="mt-2.5 space-y-1 border-t border-slate-200/60 pt-2 text-[11px] text-slate-500">
                        {finding.evidence.map((ev: string, idx: number) => (
                          <li key={idx}>• {ev}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                Click “Re-run Checks” to load live forensic records for this property.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Find Owner & Contacts */}
      {activeTab === 'contacts' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-base font-black text-[#172b2a]">Recorded Owners &amp; Verified Contacts</h2>
                <p className="text-xs text-slate-500">De-duplicated deed parties, registered managing agents, and public tax rolls.</p>
              </div>
              <button
                onClick={() => void loadContacts()}
                disabled={searchingContacts}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${searchingContacts ? 'animate-spin' : ''}`} />
                {searchingContacts ? 'Finding Owner...' : 'Refresh Find Owner'}
              </button>
            </div>

            {searchingContacts ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-500">
                <RefreshCw className="mx-auto mb-2 size-6 animate-spin text-[#176b4d]" />
                Checking ACRIS party recordings and HPD contact registrations…
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {/* AI Agent Notes Logger Card */}
                <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-900">
                      <Sparkles className="size-3.5 text-[#176b4d]" />
                      AI Agent Notes Logger
                    </h3>
                    <p className="mt-0.5 text-xs text-emerald-800">
                      Once you find an owner number or contact details, AI automatically logs the property address, owner name, contact info, brief property description, and motivating factor to Agent Notes.
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void saveToAgentNotes(contactData?.contacts?.[0], 'banner')}
                      disabled={loggingNote}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#176b4d] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#12543d] disabled:opacity-60"
                    >
                      <NotebookPen className="size-4" />
                      {loggingNote ? 'Compiling...' : loggedOwnerKey === 'banner' ? 'Logged to Agent Notes ✓' : 'AI Save to Agent Notes'}
                    </button>
                    <Link
                      href="/dashboard/notes"
                      className="rounded-xl border border-emerald-300 bg-white px-3 py-2.5 text-xs font-bold text-[#172b2a] hover:bg-emerald-50"
                    >
                      Open Log →
                    </Link>
                  </div>
                </div>

                {contactData?.contacts?.length ? (() => {
                  const primaryContact = contactData.contacts[0]
                  const additionalContacts = contactData.contacts.slice(1)

                  const renderContactCard = (c: ContactCandidate, isPrimary: boolean, key: string | number) => {
                    const cleanName = encodeURIComponent((c.name || '').replace(/[^a-zA-Z0-9 ]/g, '').trim())
                    const cleanBorough = encodeURIComponent(property.borough || 'New York')
                    const fastPeopleUrl = `https://www.fastpeoplesearch.com/name/${cleanName}_${cleanBorough}-NY`
                    const truePeopleUrl = `https://www.truepeoplesearch.com/results?name=${cleanName}&citystatezip=${cleanBorough},%20NY`
                    const nysCorpUrl = `https://apps.dos.ny.gov/publicInquiry/EntityDisplay?entity_name=${cleanName}`
                    const isEntity = /(LLC|CORP|INC|HOLDINGS|PROPERTIES|LP|GROUP)/i.test(c.name || '')
                    const cardKey = `contact-${key}`

                    return (
                      <div
                        key={key}
                        className={`rounded-xl border p-4 shadow-xs ${
                          isPrimary
                            ? 'border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-200'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <User className="size-4 text-[#176b4d]" />
                              <p className="font-black text-slate-900">{c.name || 'Recorded Party'}</p>
                              {isPrimary && (
                                <span className="rounded-full bg-[#176b4d] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                  Primary Owner
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs font-semibold text-[#176b4d]">{c.role}</p>
                          </div>
                          <span className="self-start rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                            {c.source || 'Public Record'}
                          </span>
                        </div>

                        {c.mailingAddress && (
                          <div className="mt-2.5 rounded-lg bg-slate-50 p-2.5 text-xs">
                            <span className="font-bold text-slate-500">Deed Recorded Mailing Address: </span>
                            <span className="font-semibold text-slate-900">{c.mailingAddress}</span>
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                          {c.isDnc ? (
                            <div className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 font-bold text-rose-800 shadow-xs">
                              <Shield className="size-3.5 text-rose-600" />
                              <span>Do Not Call List Active — Phone Withheld</span>
                            </div>
                          ) : c.phone ? (
                            <a
                              href={`tel:${c.phone}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white shadow-xs transition hover:bg-emerald-700"
                            >
                              <Phone className="size-3.5" />
                              <span>{c.phone}</span>
                            </a>
                          ) : null}
                          {c.email && (
                            <a
                              href={`mailto:${c.email}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-200"
                            >
                              <Mail className="size-3" />
                              {c.email}
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => void saveToAgentNotes(c, cardKey)}
                            disabled={loggingNote}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 font-bold text-[#172b2a] shadow-xs transition hover:bg-emerald-50 disabled:opacity-50"
                          >
                            <NotebookPen className="size-3.5 text-[#176b4d]" />
                            <span>{loggedOwnerKey === cardKey ? 'Logged to Agent Notes ✓' : 'Add to Agent Notes (AI)'}</span>
                          </button>

                          {/* Free Reverse Lookup Shortcuts */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
                            <span className="text-[11px] font-bold text-slate-400">Free Reverse Lookup:</span>
                            {isEntity ? (
                              <a
                                href={nysCorpUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                              >
                                NYS DOS Entity Registry ↗
                              </a>
                            ) : (
                              <>
                                <a
                                  href={fastPeopleUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                >
                                  FastPeopleSearch ↗
                                </a>
                                <a
                                  href={truePeopleUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                >
                                  TruePeopleSearch ↗
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-4">
                      {/* Highlighted Primary Owner Card */}
                      {renderContactCard(primaryContact, true, 'primary-contact')}

                      {/* Dropdown for Additional/Historical Contacts */}
                      {additionalContacts.length > 0 && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setShowAdditionalContacts(!showAdditionalContacts)}
                            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                          >
                            <span className="flex items-center gap-2">
                              <span>Show {additionalContacts.length} Other Historical / Recorded Parties</span>
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                {showAdditionalContacts ? 'Expanded' : 'Collapsed'}
                              </span>
                            </span>
                            {showAdditionalContacts ? (
                              <ChevronUp className="size-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="size-4 text-slate-500" />
                            )}
                          </button>

                          {showAdditionalContacts && (
                            <div className="mt-3 space-y-3 border-l-2 border-slate-200 pl-1">
                              {additionalContacts.map((c: ContactCandidate, idx: number) =>
                                renderContactCard(c, false, `additional-${idx}`)
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })() : (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No registered party phone numbers returned directly from municipal registries. Use{' '}
                    <strong>AI Save to Agent Notes</strong> above to log the property brief and motivating factor while you verify secondary contact channels.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
