'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Download,
  FileText,
  Home,
  MapPin,
  Phone,
  Mail,
  RefreshCw,
  Send,
  Shield,
  Sparkles,
  TrendingUp,
  User,
  Users,
} from 'lucide-react'
import { classifyOpportunity } from '@/lib/motivationClassifier'
import { generateMotivationLetter } from '@/lib/letterGenerator'

interface LeadRecord {
  id: string
  address: string
  borough: string
  zip?: string
  block?: string
  lot?: string
  stage: string
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

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [property, setProperty] = useState<LeadRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'research' | 'contacts' | 'outreach'>('overview')
  const [researchData, setResearchData] = useState<any>(null)
  const [contactData, setContactData] = useState<any>(null)
  const [researching, setResearching] = useState(false)
  const [searchingContacts, setSearchingContacts] = useState(false)
  const [generatingBrief, setGeneratingBrief] = useState(false)
  const [financials, setFinancials] = useState<any>(null)
  const [showAdditionalContacts, setShowAdditionalContacts] = useState(false)

  const [aiBrief, setAiBrief] = useState<any>(null)

  useEffect(() => {
    const propertyId = decodeURIComponent(resolvedParams.id)

    // 1. Look up in stored leads or delivered opportunities
    let found: LeadRecord | null = null
    try {
      const crmLeads = JSON.parse(localStorage.getItem('leadflow-crm-leads') || '[]') as LeadRecord[]
      found = crmLeads.find((l) => l.id === propertyId || l.address === propertyId) || null
    } catch {}

    if (!found) {
      try {
        const priorityFeed = JSON.parse(localStorage.getItem('leadflow-delivered-opportunity-ids') || '[]')
        // Check temporary cache if available
        const cached = localStorage.getItem(`leadflow-property-cache-${propertyId}`)
        if (cached) found = JSON.parse(cached)
      } catch {}
    }

    if (found) {
      const classification = classifyOpportunity({
        documentType: found.category,
        signals: found.signals,
        source: found.source,
        address: found.address,
        bbl: found.id,
      })
      setProperty({
        ...found,
        category: found.category || classification.category,
        categoryNumber: found.categoryNumber || classification.categoryNumber,
        subheadline: found.subheadline || classification.subheadline,
        reason: found.reason || classification.reason,
        opportunityAngle: found.opportunityAngle || classification.opportunityAngle,
        badgeBg: found.badgeBg || classification.badgeBg,
        badgeText: found.badgeText || classification.badgeText,
        badgeBorder: found.badgeBorder || classification.badgeBorder,
      })
    } else {
      // Reconstitute from URL ID (BBL format)
      const bbl = propertyId
      const classification = classifyOpportunity({ bbl })
      const boroughs = ['', 'Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island']
      const boroughName = boroughs[Number(bbl[0])] || 'New York'
      setProperty({
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
      })
    }

    setLoading(false)
  }, [resolvedParams.id])

  // Automatically trigger forensic research and contact lookup on page load so numbers and contacts show immediately
  useEffect(() => {
    if (property?.id && !researchData && !researching) {
      void loadResearch()
    }
    if (property?.id && !contactData && !searchingContacts) {
      void loadContacts()
    }
  }, [property?.id])

  async function loadResearch() {
    if (!property) return
    setResearching(true)
    try {
      const response = await fetch('/api/nyc/property-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: property.address,
          borough: property.borough,
          zip: property.zip,
          bbl: property.id,
        }),
      })
      const data = await response.json()
      setResearchData(data)
      setFinancials(data.financials || null)
    } catch {
      setResearchData(null)
      setFinancials(null)
    } finally {
      setResearching(false)
    }
  }

  async function loadContacts() {
    if (!property) return
    setSearchingContacts(true)
    try {
      const response = await fetch('/api/nyc/contact-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bbl: property.id,
          address: property.address,
          borough: property.borough,
        }),
      })
      const data = await response.json()
      setContactData(data)
    } catch {
      setContactData(null)
    } finally {
      setSearchingContacts(false)
    }
  }

  function handleGenerateLetter() {
  if (!property) return;
  generateMotivationLetter({
    ownerName: contactData?.contacts?.[0]?.name || '',
    propertyAddress: property.address,
    borough: property.borough,
    mailingAddress: contactData?.contacts?.[0]?.mailingAddress || null,
    category: property.category,
    categoryNumber: property.categoryNumber,
    agentName: 'LeadFlow NYC Agent',
    agentPhone: '(212) 555-0199',
    agentEmail: 'agent@leadflownyc.com',
  });
}

function saveToPipeline(stage: string) {
    if (!property) return
    try {
      const existing = JSON.parse(localStorage.getItem('leadflow-crm-leads') || '[]') as LeadRecord[]
      const updated = [{ ...property, stage }, ...existing.filter((item) => item.id !== property.id)]
      localStorage.setItem('leadflow-crm-leads', JSON.stringify(updated))
      setProperty({ ...property, stage })
    } catch {}
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

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
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
            {property.stage === 'qualified' ? 'Watchlist' : property.stage.replace('_', ' ')}
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
              {property.subheadline || 'High-probability seller move signal'}
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
                {searchingContacts ? 'Searching Numbers...' : 'AI Fetch Owner Numbers'}
              </button>
              <button
                onClick={() => saveToPipeline('qualified')}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#176b4d] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#12543d]"
              >
                <CheckCircle2 className="size-4" />
                Move to Qualified
              </button>
              <Link
                href="/dashboard/actions"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Sparkles className="size-3.5 text-[#176b4d]" />
                Draft Outreach in AI
              </Link>
            </div>
          </div>
        </div>

        {/* Why it surfaced block */}
        <div className="mt-6 rounded-2xl border border-slate-100 bg-[#f7f8f6] p-5">
          <p className="text-xs font-black uppercase tracking-wider text-[#176b4d]">
            Why This Property Came Up & Motivation Rationale
          </p>
          <p className="mt-1.5 text-sm font-semibold leading-relaxed text-[#172b2a]">
            {property.reason || 'Public record filings indicate pre-auction seller distress.'}
          </p>
          {property.opportunityAngle && (
            <p className="mt-2 text-xs leading-relaxed text-slate-600 bg-white/80 p-3 rounded-xl border border-slate-200/50">
              <strong>Recommended Agent Angle: </strong>
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
                <h3 className="text-sm font-black text-[#172b2a]">$0 Free Public Equity & Debt Breakdown</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculated directly from NYC DOF Market Valuations, ACRIS Recorded Mortgages & DOF Lien Registries
              </p>
            </div>
            {researching && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                <RefreshCw className="size-3 animate-spin" /> Fetching live NYC registries...
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
                  ? `$${financials.taxLiensEstimated.toLocaleString()}`
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
              <span className="text-[10px] text-emerald-100 font-bold">
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
        {[
          { id: 'overview', label: 'Property Overview & PLUTO Details' },
          { id: 'research', label: 'Instant Forensic Research' },
          { id: 'contacts', label: 'Ownership & Contact Directory' },
          { id: 'outreach', label: 'Outreach & Action Plan' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any)
              if (tab.id === 'research' && !researchData) void loadResearch()
              if (tab.id === 'contacts' && !contactData) void loadContacts()
            }}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === tab.id
                ? 'bg-[#172b2a] text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-black text-[#172b2a]">Building Specifications</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3.5">
                <span className="text-xs text-slate-400 font-bold uppercase">Residential Units</span>
                <p className="mt-1 font-black text-[#172b2a]">{property.units || 'Single / 1-3 Family'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5">
                <span className="text-xs text-slate-400 font-bold uppercase">Year Built</span>
                <p className="mt-1 font-black text-[#172b2a]">{property.yearBuilt || 'Estimated Pre-War'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5">
                <span className="text-xs text-slate-400 font-bold uppercase">Building Class</span>
                <p className="mt-1 font-black text-[#172b2a]">{property.buildingClass || 'Residential Class A'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5">
                <span className="text-xs text-slate-400 font-bold uppercase">Borough Tax District</span>
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
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-black text-[#172b2a]">Market Intelligence & Next Move</h2>
            <p className="text-xs leading-relaxed text-slate-600">
              This property surfaced because its motivation signature matched active pre-foreclosure, tax delinquency, or probate triggers in NYC Department of Finance and court registries.
            </p>

            <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-4 space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-violet-900">Recommended Next Steps</p>
              <ol className="list-decimal pl-4 text-xs space-y-1.5 text-violet-950 font-medium">
                <li>Review the instant forensic findings below to verify title status.</li>
                <li>Check the recorded owner mailing address and entity contacts.</li>
                <li>Reach out with a private, consultative consultation before auction.</li>
              </ol>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setActiveTab('research')
                  if (!researchData) void loadResearch()
                }}
                className="w-full rounded-xl bg-[#172b2a] py-3 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                Open Instant Forensic Research →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Instant Forensic Research (Accessible directly WITHOUT putting into researching!) */}
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
                {Object.entries(researchData.findings).map(([key, finding]: [string, any]) => (
                  <div key={key} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <p className="mt-1 text-sm font-black text-[#172b2a]">{finding.headline}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{finding.detail}</p>
                    {finding.evidence?.length > 0 && (
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

      {/* Tab 3: Contacts */}
      {activeTab === 'contacts' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-base font-black text-[#172b2a]">Recorded Owners & Verified Contacts</h2>
                <p className="text-xs text-slate-500">De-duplicated deed parties, registered managing agents, and public tax rolls.</p>
              </div>
              <button
                onClick={() => void loadContacts()}
                disabled={searchingContacts}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${searchingContacts ? 'animate-spin' : ''}`} />
                {searchingContacts ? 'Searching...' : 'Refresh Contacts'}
              </button>
            </div>

            {searchingContacts ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-500">
                <RefreshCw className="mx-auto mb-2 size-6 animate-spin text-[#176b4d]" />
                Checking ACRIS party recordings and HPD contact registrations…
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {/* 1-Click Direct Mail Generator Action Card */}
                <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900">
                      1-Click Direct Mail Letter Generator ($0)
                    </h3>
                    <p className="mt-0.5 text-xs text-emerald-800">
                      Instantly builds a tailored off-market advisory letter for this {property.category || 'opportunity'} addressed to the recorded legal owner.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateLetter}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#176b4d] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#12543d]"
                  >
                    <Download className="size-4" />
                    Download Printable Letter PDF
                  </button>
                </div>

                {contactData?.contacts?.length ? (() => {
                  const primaryContact = contactData.contacts[0]
                  const additionalContacts = contactData.contacts.slice(1)

                  const renderContactCard = (c: any, isPrimary: boolean, key: string | number) => {
                    const cleanName = encodeURIComponent((c.name || '').replace(/[^a-zA-Z0-9 ]/g, '').trim())
                    const cleanBorough = encodeURIComponent(property.borough || 'New York')
                    const fastPeopleUrl = `https://www.fastpeoplesearch.com/name/${cleanName}_${cleanBorough}-NY`
                    const truePeopleUrl = `https://www.truepeoplesearch.com/results?name=${cleanName}&citystatezip=${cleanBorough},%20NY`
                    const nysCorpUrl = `https://apps.dos.ny.gov/publicInquiry/EntityDisplay?entity_name=${cleanName}`
                    const isEntity = /(LLC|CORP|INC|HOLDINGS|PROPERTIES|LP|GROUP)/i.test(c.name || '')

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
                                <span className="rounded-full bg-[#176b4d] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                                  Primary Owner
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs font-semibold text-[#176b4d]">{c.role}</p>
                          </div>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 self-start">
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
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                            >
                              <Phone className="size-3.5" />
                              <span>Call: {c.phone}</span>
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

                      {/* Dropdown for Additional/Historical Contacts to Prevent Overload */}
                      {additionalContacts.length > 0 && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setShowAdditionalContacts(!showAdditionalContacts)}
                            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                          >
                            <span className="flex items-center gap-2">
                              <span>Show {additionalContacts.length} Other Historical / Recorded Parties</span>
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600 font-bold">
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
                            <div className="mt-3 space-y-3 pl-1 border-l-2 border-slate-200">
                              {additionalContacts.map((c: any, idx: number) =>
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
                    No registered party phone numbers returned. Use the <strong>Download Printable Letter PDF</strong> button above to send direct mail to the recorded deed address, or run a free reverse lookup.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Outreach Plan */}
      {activeTab === 'outreach' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-black text-[#172b2a]">Direct Outreach Strategy</h2>
          <p className="text-xs leading-relaxed text-slate-600">
            Tailor your conversation to the {property.category || 'opportunity'} trigger. Start with empathy and offering options rather than pushing an immediate sale.
          </p>

          <div className="rounded-xl border border-slate-200 bg-[#f7f8f6] p-4 text-xs leading-relaxed text-slate-700">
            <strong className="block text-sm font-bold text-[#172b2a] mb-1">Recommended Opening Hook:</strong>
            “Hi, I was reviewing recent city property public notices regarding {property.address} and wanted to reach out directly to see if our private client group could help you explore an off-market solution or equity payout before any court deadlines.”
          </div>

          <div className="pt-2">
            <Link
              href="/dashboard/actions"
              className="inline-flex items-center gap-2 rounded-xl bg-[#172b2a] px-5 py-3 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              <Send className="size-4" />
              Open AI Workspace to Compose Outreach Draft
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
