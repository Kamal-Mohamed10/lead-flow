'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Bookmark,
  Building2,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileText,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { explainPropertyScore } from '@/lib/motivationClassifier'
import { fetchAndDownloadPropertyReportPdf } from '@/lib/propertyReportPdf'
import { ScoreBreakdownPanel } from '@/components/score-breakdown-panel'
import {
  clearWatchlistStorage,
  isActiveWatchlistLead,
  readExploredCatalog,
  readSavedLeads,
  syncDealStatusToSavedLeads,
  WATCHLIST_UPDATED_EVENT,
  writeExploredCatalog,
} from '@/lib/propertyStorage'

export interface WatchlistLead {
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
  dealStatus?: 'watchlist' | 'vault' | 'contacted' | 'under_contract' | 'closed' | 'archived'
  category?: string
  categoryNumber?: number
  subheadline?: string
  reason?: string
  opportunityAngle?: string
  badgeBg?: string
  badgeText?: string
  badgeBorder?: string
}

const PROPERTY_PHOTOS = [
  '/images/exterior.jpg',
  '/images/hero-home.jpg',
  '/images/building-facade.jpg',
  '/images/building-dusk.jpg',
  '/images/hero-building.jpg',
  '/images/luxury-building.jpg',
  '/images/kitchen.jpg',
  '/images/interior-warm.jpg',
]

function getPhotoForProperty(id: string) {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return PROPERTY_PHOTOS[hash % PROPERTY_PHOTOS.length]
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistLead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBorough, setSelectedBorough] = useState('All')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [statusFilter, setStatusFilter] = useState<'all' | 'watchlist' | 'vault' | 'contacted' | 'contract'>('all')
  const [selectedProperty, setSelectedProperty] = useState<WatchlistLead | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  // Load watchlist items from localStorage (explicitly saved deals only)
  function loadWatchlist() {
    try {
      const saved = readSavedLeads<WatchlistLead>()
      const activeWatchlist = saved.filter(isActiveWatchlistLead)
      setWatchlist(activeWatchlist)
    } catch {
      setWatchlist([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWatchlist()
    window.addEventListener('storage', loadWatchlist)
    window.addEventListener(WATCHLIST_UPDATED_EVENT, loadWatchlist)
    return () => {
      window.removeEventListener('storage', loadWatchlist)
      window.removeEventListener(WATCHLIST_UPDATED_EVENT, loadWatchlist)
    }
  }, [])

  function updateStatus(id: string, newStatus: string) {
    try {
      const target = watchlist.find((lead) => lead.id === id) || readSavedLeads<WatchlistLead>().find((lead) => lead.id === id)
      const normalizedStatus = newStatus === 'remove' ? undefined : newStatus
      if (target) {
        syncDealStatusToSavedLeads(target, normalizedStatus)
      }
      const catalog = readExploredCatalog<WatchlistLead>()
      if (catalog.some((item) => item.id === id)) {
        writeExploredCatalog(
          catalog.map((item) =>
            item.id === id
              ? {
                  ...item,
                  dealStatus: normalizedStatus as WatchlistLead['dealStatus'],
                  stage: normalizedStatus || 'explored',
                }
              : item
          )
        )
      }
      loadWatchlist()
      if (selectedProperty?.id === id) {
        if (newStatus === 'remove') setSelectedProperty(null)
        else setSelectedProperty((curr) => (curr ? { ...curr, dealStatus: newStatus as any } : null))
      }
    } catch {}
  }

  function clearAllWatchlist() {
    clearWatchlistStorage()
    setSelectedProperty(null)
    loadWatchlist()
  }

  const filteredWatchlist = useMemo(() => {
    return watchlist.filter((lead) => {
      if (selectedBorough !== 'All' && lead.borough !== selectedBorough) return false
      if (selectedCategory !== 'All' && lead.category !== selectedCategory) return false
      if (statusFilter === 'vault' && lead.dealStatus !== 'vault') return false
      if (statusFilter === 'watchlist' && lead.dealStatus !== 'watchlist' && !(!lead.dealStatus && lead.stage === 'watchlist')) return false
      if (statusFilter === 'contacted' && lead.dealStatus !== 'contacted') return false
      if (statusFilter === 'contract' && lead.dealStatus !== 'under_contract') return false
      if (searchQuery && !`${lead.address} ${lead.borough} ${lead.zip}`.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      return true
    })
  }, [watchlist, selectedBorough, selectedCategory, statusFilter, searchQuery])

  async function downloadResearchBrief(property: WatchlistLead) {
    setGeneratingReport(true)
    setReportError(null)
    try {
      const statusLabel = property.dealStatus
        ? property.dealStatus.replace('_', ' ')
        : 'Watchlist'
      await fetchAndDownloadPropertyReportPdf({
        property,
        statusLabel,
      })
    } catch (error) {
      setReportError(
        error instanceof Error ? error.message : 'Unable to generate Property Report PDF.'
      )
    } finally {
      setGeneratingReport(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-[#176b4d]">
            Saved Deals · Research Hub
          </p>
          <h1 className="font-serif text-3xl font-black italic tracking-tight text-[#172b2a] sm:text-4xl">
            Watchlist
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Your shortlisted off-market properties queued for deep title research, Find Owner lookups, and Agent Notes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {watchlist.length > 0 && (
            <button
              type="button"
              onClick={clearAllWatchlist}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-2.5 text-xs font-bold text-rose-700 shadow-xs hover:bg-rose-100 transition"
            >
              <Trash2 className="size-3.5" />
              <span>Clear Watchlist</span>
            </button>
          )}
          <Link
            href="/dashboard/leads"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-[#172b2a] shadow-xs hover:bg-slate-50 transition"
          >
            <Plus className="size-3.5 text-[#176b4d]" />
            <span>Explore More Properties</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-xl bg-[#172b2a] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition"
          >
            <span>Daily Overview</span>
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12 items-center">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search watchlist by address or ZIP..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#176b4d] focus:bg-white transition"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs font-bold text-[#172b2a] outline-none focus:border-[#176b4d] focus:bg-white transition"
            >
              <option value="All">All Motivation Categories</option>
              <option value="Pre-foreclosures">Pre-foreclosures</option>
              <option value="Estate / probate sales">Estate / Probate</option>
              <option value="Vacant properties">Vacant Properties</option>
              <option value="Short sales">Short Sales</option>
              <option value="Tax-delinquent properties">Tax Delinquent</option>
              <option value="Foreclosure auctions">Foreclosure Auctions</option>
              <option value="Bank-owned (REO)">Bank-owned REO</option>
            </select>
          </div>

          {/* Borough Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedBorough}
              onChange={(e) => setSelectedBorough(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs font-bold text-[#172b2a] outline-none focus:border-[#176b4d] focus:bg-white transition"
            >
              <option value="All">All Boroughs</option>
              {['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'].map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sub-status tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
          {[
            { id: 'all', label: 'All Saved', count: watchlist.length },
            { id: 'watchlist', label: 'Watchlist', count: watchlist.filter((l) => l.dealStatus === 'watchlist' || (!l.dealStatus && l.stage === 'watchlist')).length },
            { id: 'vault', label: '🔒 Saved Vault', count: watchlist.filter((l) => l.dealStatus === 'vault').length },
            { id: 'contacted', label: 'Contacted', count: watchlist.filter((l) => l.dealStatus === 'contacted').length },
            { id: 'contract', label: 'Under Contract', count: watchlist.filter((l) => l.dealStatus === 'under_contract').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === tab.id
                  ? 'bg-[#172b2a] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  statusFilter === tab.id ? 'bg-[#176b4d] text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Watchlist Cards Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-white p-8 text-slate-400">
          <RefreshCw className="size-6 animate-spin text-[#176b4d]" />
        </div>
      ) : filteredWatchlist.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#edf7f2] text-[#176b4d]">
            <Bookmark className="size-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-serif text-xl font-bold italic text-slate-900">Your Watchlist is Empty</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              When you find high-conviction properties on the Daily Overview or Explore Properties map, click &quot;Wishlist&quot; or &quot;Save to Vault&quot; to queue them here for research.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="rounded-xl bg-[#172b2a] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition"
            >
              View Daily Overview
            </Link>
            <Link
              href="/dashboard/leads"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Explore Properties Map
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWatchlist.map((lead) => {
            const photoSrc = getPhotoForProperty(lead.id)
            const score = explainPropertyScore({
              category: lead.category,
              reason: lead.reason,
              yearBuilt: lead.yearBuilt,
              units: lead.units,
            }).totalScore
            const equitySpread = Math.round(score * 6300)

            return (
              <article
                key={lead.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
              >
                {/* Photo Header */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                  <Image
                    src={photoSrc}
                    alt={lead.address}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2">
                    <span className="rounded-lg bg-[#176b4d] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                      {lead.categoryNumber ? `${lead.categoryNumber}. ` : ''}
                      {lead.category || 'Distressed Deal'}
                    </span>

                    <span className="rounded-lg bg-black/70 px-2 py-0.5 text-[10px] font-mono font-bold text-[#8edbb8] backdrop-blur-xs">
                      Score {score}
                    </span>
                  </div>

                  {/* Equity Cushion Overlay */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between text-white">
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-300">
                        Calculated Equity Cushion
                      </span>
                      <span className="font-serif text-base font-black italic text-[#8edbb8]">
                        ~${equitySpread.toLocaleString()} (62%)
                      </span>
                    </div>
                    <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold backdrop-blur-xs">
                      {lead.units ? `${lead.units} Units` : '1–3 Family'}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col p-4 space-y-3">
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#172b2a] group-hover:text-[#176b4d] transition line-clamp-1">
                      {lead.address}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="size-3 text-[#176b4d]" />
                      {lead.borough}{lead.zip ? `, NYC ${lead.zip}` : ''}
                      <span className="text-slate-300">•</span>
                      <span>Built {lead.yearBuilt || '1930'}</span>
                    </p>
                  </div>

                  {/* Distress Signal */}
                  <div className="rounded-xl border border-slate-100 bg-[#f7f8f6] p-2.5 text-xs">
                    <p className="text-[11px] leading-relaxed text-slate-700 line-clamp-2">
                      <strong className="text-[#172b2a]">Motivation: </strong>
                      {lead.reason || 'NYC municipal deed or tax filing indicates high seller urgency.'}
                    </p>
                    {lead.opportunityAngle && (
                      <p className="mt-1 text-[10px] text-[#176b4d] font-semibold truncate">
                        Angle: {lead.opportunityAngle}
                      </p>
                    )}
                  </div>

                  {/* Financial Overview */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-slate-100 pt-2">
                    <div className="rounded-lg bg-slate-50 p-1.5">
                      <span className="block text-[9px] font-bold uppercase text-slate-400">Assessed Value</span>
                      <span className="font-bold text-slate-800">~$850,000</span>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-1.5">
                      <span className="block text-[9px] font-bold uppercase text-slate-400">Est. Liens</span>
                      <span className="font-bold text-rose-700">~$320,000</span>
                    </div>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                    <span className="font-bold text-slate-500">Disposition:</span>
                    <select
                      value={lead.dealStatus || 'watchlist'}
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 font-bold text-[#172b2a] outline-none focus:border-[#176b4d]"
                    >
                      <option value="watchlist">Watchlist</option>
                      <option value="vault">🔒 Saved Vault</option>
                      <option value="contacted">Contacted</option>
                      <option value="under_contract">Under Contract</option>
                      <option value="closed">Closed Deal</option>
                      <option value="remove">Remove from Watchlist</option>
                    </select>
                  </div>

                  {/* Research & Action Buttons */}
                  <div className="mt-auto pt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedProperty(lead)}
                      className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Eye className="size-3.5 text-slate-400" />
                      <span>Quick Brief</span>
                    </button>

                    <Link
                      href={`/dashboard/properties/${encodeURIComponent(lead.id)}`}
                      className="flex items-center justify-center gap-1 rounded-xl bg-[#172b2a] py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#176b4d] transition"
                    >
                      <span>Property Details</span>
                      <ChevronRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Quick Research Drawer */}
      {selectedProperty && (
        <div
          className="fixed inset-0 z-[70] flex justify-end bg-[#172b2a]/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#176b4d]">
                  Watchlist Research Summary
                </p>
                <h2 className="font-serif mt-0.5 text-xl font-black italic text-slate-900 leading-snug">
                  {selectedProperty.address}
                </h2>
              </div>
              <button
                onClick={() => setSelectedProperty(null)}
                className="rounded-full p-2 hover:bg-slate-100 transition"
                aria-label="Close"
              >
                <X className="size-5 text-slate-500" />
              </button>
            </div>

            <div className="relative h-44 w-full bg-slate-900">
              <Image
                src={getPhotoForProperty(selectedProperty.id)}
                alt={selectedProperty.address}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    Calculated Equity Cushion
                  </span>
                  <p className="font-serif text-xl font-bold italic text-[#8edbb8]">
                    ~${Math.round((selectedProperty.score || 85) * 6300).toLocaleString()} (62%)
                  </p>
                </div>
                <span className="rounded-md bg-[#176b4d] px-2.5 py-1 text-xs font-bold text-white">
                  Score {explainPropertyScore({
                    category: selectedProperty.category,
                    reason: selectedProperty.reason,
                    yearBuilt: selectedProperty.yearBuilt,
                    units: selectedProperty.units,
                  }).totalScore}/100
                </span>
              </div>
            </div>

            <div className="space-y-6 p-6">
              {/* Strategic Angle */}
              {selectedProperty.category && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <span className="text-xs font-black uppercase tracking-wider text-[#176b4d]">
                    {selectedProperty.category}
                  </span>
                  <p className="mt-1 text-xs font-bold text-slate-900">{selectedProperty.subheadline}</p>
                  <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                    <strong>Distress Rationale: </strong>
                    {selectedProperty.reason}
                  </p>
                  {selectedProperty.opportunityAngle && (
                    <p className="mt-2 text-xs text-[#172b2a] bg-white/80 p-2.5 rounded-xl border border-emerald-200/50">
                      <strong>Recommended Strategy: </strong>
                      {selectedProperty.opportunityAngle}
                    </p>
                  )}
                </div>
              )}

              {/* Compact Scoring Confidence Breakdown */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <ScoreBreakdownPanel
                  breakdown={explainPropertyScore({
                    category: selectedProperty.category,
                    reason: selectedProperty.reason,
                    yearBuilt: selectedProperty.yearBuilt,
                    units: selectedProperty.units,
                  })}
                  compact
                  scrollBodyClassName="max-h-[250px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]"
                />
              </div>

              {/* Research Link to Full Report */}
              <Link
                href={`/dashboard/properties/${encodeURIComponent(selectedProperty.id)}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#172b2a] py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-[#176b4d] transition"
              >
                <span>View Full Property Report & Contacts →</span>
              </Link>

              {/* PDF Research Brief Download */}
              <button
                onClick={() => downloadResearchBrief(selectedProperty)}
                disabled={generatingReport}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
              >
                <Download className={`size-3.5 ${generatingReport ? 'animate-bounce' : ''}`} />
                <span>{generatingReport ? 'Preparing Full PDF...' : 'Download Full Property Report PDF'}</span>
              </button>
              {reportError && (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                  {reportError}
                </p>
              )}

              {/* Remove from watchlist */}
              <button
                onClick={() => updateStatus(selectedProperty.id, 'remove')}
                className="flex w-full items-center justify-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 transition pt-2"
              >
                <Trash2 className="size-3.5" />
                <span>Remove from Watchlist</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
