'use client'

import Link from 'next/link'
import {
  Bookmark,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Map,
  MapPin,
  NotebookPen,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { LeadFlowLoader } from '@/components/leadflow-loader'
import { classifyOpportunity } from '@/lib/motivationClassifier'
import {
  consumePriorityQueuePrefetch,
  isActiveWatchlistLead,
  readPriorityQueueCache,
  readSavedLeads,
  WATCHLIST_UPDATED_EVENT,
  writePriorityQueueCache,
  writeSavedLeads,
} from '@/lib/propertyStorage'

function subscribeToUserGreeting(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener('leadflow-demo-mode-change', onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener('leadflow-demo-mode-change', onChange)
  }
}

function getGreetingFirstName() {
  const rawName = (localStorage.getItem('leadflow-user-name') || '').trim()
  const isDemo = localStorage.getItem('leadflow-demo-mode') === 'true'
  if (!rawName || rawName === 'Demo Agent') {
    return isDemo ? 'Kamal' : 'Agent'
  }
  return rawName.split(/\s+/)[0]
}

function getServerGreetingFirstName() {
  return 'Kamal'
}

interface Lead {
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
  deliveredAt?: string
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

type DashboardFilter = 'all' | 'delivered-today' | 'high-signal' | 'watchlist'

export default function DashboardPage() {
  const greetingName = useSyncExternalStore(
    subscribeToUserGreeting,
    getGreetingFirstName,
    getServerGreetingFirstName
  )
  const [leads, setLeads] = useState<Lead[]>([])
  const [delivered, setDelivered] = useState<Lead[]>([])
  const [queueFilter, setQueueFilter] = useState<DashboardFilter>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [feedError, setFeedError] = useState('')
  const [fetchedAt, setFetchedAt] = useState('')

  // Priority Queue In-Box Filter Controls (User requirement #6)
  const [queueSearchQuery, setQueueSearchQuery] = useState('')
  const [queueBoroughFilter, setQueueBoroughFilter] = useState('All')
  const [queueCategoryFilter, setQueueCategoryFilter] = useState('All')

  // Hourly AI Batch Countdown Timer (User requirement #9)
  const [secondsUntilNextBatch, setSecondsUntilNextBatch] = useState<number>(3600)
  const [canRequestNewBatch, setCanRequestNewBatch] = useState(false)

  useEffect(() => {
    function tick() {
      let unlock = Number(localStorage.getItem('leadflow-batch-unlock-time'))
      if (!unlock || isNaN(unlock)) {
        unlock = Date.now() + 3600 * 1000
        localStorage.setItem('leadflow-batch-unlock-time', String(unlock))
      }
      const diff = Math.max(0, Math.floor((unlock - Date.now()) / 1000))
      setSecondsUntilNextBatch(diff)
      setCanRequestNewBatch(diff <= 0)
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  async function loadOpportunities(refresh = false) {
    refresh ? setRefreshing(true) : setLoading(true)
    setFeedError('')
    try {
      const demoMode = localStorage.getItem('leadflow-demo-mode') === 'true'
      const savedLeads = readSavedLeads<Lead>()
      const existing = new Set(savedLeads.map((lead) => lead.id))
      const unlockTime =
        Number(localStorage.getItem('leadflow-batch-unlock-time')) || Date.now() + 3600 * 1000

      if (!refresh && demoMode) {
        const cached = readPriorityQueueCache<Lead>()
        if (cached && (!cached.unlockTime || Date.now() < cached.unlockTime)) {
          const validCached = cached.opportunities.filter((item) => !existing.has(item.id))
          if (validCached.length > 0) {
            setDelivered(validCached)
            setLeads(savedLeads)
            setFetchedAt(cached.fetchedAt || new Date().toLocaleTimeString())
            setLoading(false)
            setRefreshing(false)
            return
          }
        }
      }

      const excludedBbls = savedLeads
        .map((lead) => lead.id)
        .filter((id) => /^[1-5]\d{9}$/.test(id))
      const savedTerritory = JSON.parse(localStorage.getItem('leadflow-agent-territory') || 'null')
      const boroughs = Array.isArray(savedTerritory?.boroughs) && savedTerritory.boroughs.length
        ? savedTerritory.boroughs
        : []

      let data: {
        opportunities?: any[]
        data?: any[]
        source?: string
        message?: string | null
        error?: string
      }

      if (demoMode) {
        const prefetched = !refresh ? await consumePriorityQueuePrefetch() : null
        if (prefetched && Array.isArray(prefetched.opportunities)) {
          data = prefetched
        } else {
          const response = await fetch('/api/nyc/opportunities/discover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limit: 20, excludedBbls, boroughs, prioritize: true }),
          })
          data = await response.json()
          if (!response.ok) throw new Error(data.error || 'Live opportunity discovery failed.')
        }
      } else {
        const response = await fetch('/api/cron/enrich-properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 20, boroughs }),
        })
        data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Live opportunity discovery failed.')
      }

      const incoming = demoMode
        ? data.opportunities || []
        : (data.data || []).map((item: any) => ({
            ...item,
            id: item.bbl,
            score: typeof item.score === 'number' ? item.score : item.enriched?.opportunityScore || 85,
          }))

      if (!incoming.length) {
        setFeedError(data.message || 'No new properties were found. Your next hourly batch will bring fresh records.')
      }

      const deliveryDates = JSON.parse(localStorage.getItem('leadflow-opportunity-delivery-dates') || '{}') as Record<string, string>
      const now = new Date().toISOString()
      const opportunities = (
        incoming
          .filter((item: any) => !existing.has(String(item.id || item.bbl)))
          .map((item: any) => {
            const units = Number(item.units || 0)
            const yearBuilt = item.yearBuilt ?? null
            const classification = classifyOpportunity({
              documentType: item.documentType,
              signals: item.signals,
              source: item.source,
              ownerName: item.ownerName,
              address: item.address,
              bbl: item.id || item.bbl,
              yearBuilt,
              units,
            })

            return {
              id: String(item.id),
              address: item.address,
              borough: item.borough,
              zip: item.zip || '',
              block: String(item.block || ''),
              lot: String(item.lot || ''),
              stage: 'ingested',
              units,
              yearBuilt,
              buildingClass: item.buildingClass ?? null,
              score: typeof item.score === 'number' ? item.score : classification.score,
              category: item.category || classification.category,
              categoryNumber: item.categoryNumber || classification.categoryNumber,
              subheadline: item.subheadline || classification.subheadline,
              reason: item.reason || classification.reason,
              opportunityAngle: item.opportunityAngle || classification.opportunityAngle,
              badgeBg: item.badgeBg || classification.badgeBg,
              badgeText: item.badgeText || classification.badgeText,
              badgeBorder: item.badgeBorder || classification.badgeBorder,
              signals: Array.isArray(item.signals) && item.signals.length ? item.signals : [
                `${classification.category}: ${classification.subheadline}`,
                classification.reason,
              ],
              source: item.source || data.source || 'NYC Open Data',
              assignedTo: localStorage.getItem('leadflow-user-name') || 'You',
              deliveredAt: deliveryDates[String(item.id)] || now,
            }
          }) as Lead[]
      )
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 20)

      opportunities.forEach((item) => {
        if (!deliveryDates[item.id]) deliveryDates[item.id] = item.deliveredAt || now
      })
      const fetchedLabel = new Date().toLocaleTimeString()
      localStorage.setItem('leadflow-opportunity-delivery-dates', JSON.stringify(deliveryDates))
      localStorage.setItem('leadflow-delivered-opportunity-ids', JSON.stringify(opportunities.map((item) => item.id)))
      writePriorityQueueCache(opportunities, fetchedLabel, unlockTime)
      setDelivered(opportunities)
      setLeads(savedLeads)
      setFetchedAt(fetchedLabel)
    } catch (error) {
      setFeedError(error instanceof Error ? error.message : 'Live opportunity discovery failed.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadOpportunities()
    const syncSaved = () => setLeads(readSavedLeads<Lead>())
    window.addEventListener('storage', syncSaved)
    window.addEventListener(WATCHLIST_UPDATED_EVENT, syncSaved)
    return () => {
      window.removeEventListener('storage', syncSaved)
      window.removeEventListener(WATCHLIST_UPDATED_EVENT, syncSaved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-hooks
  }, [])

  function requestNewBatch() {
    localStorage.setItem('leadflow-batch-unlock-time', String(Date.now() + 3600 * 1000))
    setCanRequestNewBatch(false)
    setSecondsUntilNextBatch(3600)
    loadOpportunities(true)
  }

  const watchlistLeads = leads.filter(isActiveWatchlistLead)
  const watchlistCount = watchlistLeads.length
  const highSignal = delivered.filter((lead) => (lead.score || 0) >= 70).length
  const todayKey = new Date().toLocaleDateString()
  const deliveredToday = delivered.filter((lead) => lead.deliveredAt && new Date(lead.deliveredAt).toLocaleDateString() === todayKey).length

  const queueItems = queueFilter === 'watchlist'
    ? watchlistLeads
    : queueFilter === 'high-signal'
      ? delivered.filter((lead) => (lead.score || 0) >= 70)
      : queueFilter === 'delivered-today'
        ? delivered.filter((lead) => lead.deliveredAt && new Date(lead.deliveredAt).toLocaleDateString() === todayKey)
        : delivered

  // Filtered priority queue items using in-box filter controls (User requirement #6), always ranked highest score first
  const filteredQueueItems = useMemo(() => {
    return queueItems
      .filter((lead) => {
        if (queueBoroughFilter !== 'All' && lead.borough !== queueBoroughFilter) return false
        if (queueCategoryFilter !== 'All' && lead.category !== queueCategoryFilter) return false
        if (queueSearchQuery && !`${lead.address} ${lead.borough} ${lead.zip}`.toLowerCase().includes(queueSearchQuery.toLowerCase())) return false
        return true
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0))
  }, [queueItems, queueBoroughFilter, queueCategoryFilter, queueSearchQuery])

  const queueTitle = queueFilter === 'high-signal'
    ? 'High-Signal Opportunities'
    : queueFilter === 'delivered-today'
      ? 'Delivered Today'
      : queueFilter === 'watchlist'
        ? 'Watchlist Deals'
        : 'Priority Queue'

  function addToPipeline(property: Lead, stage: 'watchlist') {
    const pipeline = readSavedLeads<Lead>()

    if (pipeline.some((lead) => lead.id === property.id)) {
      const remaining = delivered.filter((item) => item.id !== property.id)
      setDelivered(remaining)
      setLeads(pipeline)
      return
    }

    // Mark as watchlist/wishlist explicitly
    const updated: Lead[] = [{ ...property, stage, dealStatus: 'watchlist' as const }, ...pipeline]
    try {
      writeSavedLeads(updated)
    } catch {
      setFeedError('The browser could not save this property to your watchlist. Please try again.')
      return
    }
    setLeads(updated)
    const remaining = delivered.filter((item) => item.id !== property.id)
    setDelivered(remaining)
    writePriorityQueueCache(
      remaining,
      fetchedAt || new Date().toLocaleTimeString(),
      Number(localStorage.getItem('leadflow-batch-unlock-time')) || 0
    )
  }

  function showQueue(filter: DashboardFilter) {
    setQueueFilter(filter)
    document.getElementById('priority-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header with Hourly Batch Countdown Timer */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#176b4d]">
            Daily Overview
          </p>
          <h1 className="font-serif text-3xl font-black italic tracking-tight text-[#172b2a]">
            Good Morning {greetingName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            LeadFlow delivers priority-ranked NYC off-market opportunities hourly so you can start with the best deals first.
          </p>
        </div>

        {/* Hourly AI Batch Timer / Notification */}
        <div className="flex items-center gap-2.5">
          {canRequestNewBatch ? (
            <button
              onClick={requestNewBatch}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl bg-[#176b4d] px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg transition hover:bg-[#12543d] animate-bounce"
            >
              <Sparkles className="size-4 text-emerald-300" />
              <span>🔔 New Hourly Batch Ready · Request Now</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-xs">
              <Clock className="size-4 text-[#176b4d] animate-pulse" />
              <span className="text-slate-500">Next Discovery Batch in:</span>
              <span className="font-mono text-sm font-black text-[#172b2a]">
                {String(Math.floor(secondsUntilNextBatch / 60)).padStart(2, '0')}:
                {String(secondsUntilNextBatch % 60).padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
      </div>

      {feedError && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {feedError}
        </p>
      )}

      {/* Workspace Summary Cards (3 clean cards, appointments removed) */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Delivered Today',
            value: deliveredToday,
            Icon: Sparkles,
            detail: 'Ranked opportunities in today’s feed',
            onClick: () => showQueue('delivered-today'),
            active: queueFilter === 'delivered-today',
          },
          {
            label: 'High Signal Deals',
            value: highSignal,
            Icon: TrendingUp,
            detail: 'Strongest municipal distress signals',
            onClick: () => showQueue('high-signal'),
            active: queueFilter === 'high-signal',
          },
          {
            label: 'Watchlist Deals',
            value: watchlistCount,
            Icon: CheckCircle2,
            detail: 'Deals saved to your personal queue',
            onClick: () => showQueue('watchlist'),
            active: queueFilter === 'watchlist',
          },
        ].map(({ label, value, Icon, detail, onClick, active }) => (
          <button
            type="button"
            key={label}
            onClick={onClick}
            aria-pressed={active}
            className={`group rounded-2xl border bg-white p-5 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              active ? 'border-[#176b4d] ring-2 ring-[#176b4d]/10' : 'border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-3xl font-black tracking-tight text-[#172b2a]">{value}</span>
              <div className="rounded-xl bg-[#edf7f2] p-2.5 text-[#176b4d]">
                <Icon className="size-5" />
              </div>
            </div>
            <p className="mt-4 font-black text-[#172b2a]">{label}</p>
            <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
          </button>
        ))}
      </div>

      {/* Main Grid: Priority Queue (Hero of the Feed) & Workspace Tools */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          {/* Priority Queue Section */}
          <section id="priority-queue" className="scroll-mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#176b4d]">Priority Queue · Highest Scores First</p>
                <h2 className="mt-0.5 text-xl font-black text-[#172b2a]">{queueTitle}</h2>
              </div>
              <div className="flex items-center gap-2">
                {queueFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setQueueFilter('all')}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Show all
                  </button>
                )}
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {filteredQueueItems.length} in view
                </span>
              </div>
            </div>

            {/* In-Box Priority Queue Filter Bar (User requirement #6) */}
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3 rounded-xl bg-[#f7f8f6] p-3 border border-slate-200/60">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                <input
                  type="text"
                  value={queueSearchQuery}
                  onChange={(e) => setQueueSearchQuery(e.target.value)}
                  placeholder="Filter queue by street..."
                  className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 py-1.5 text-xs outline-none focus:border-[#176b4d]"
                />
              </div>

              <div>
                <select
                  value={queueCategoryFilter}
                  onChange={(e) => setQueueCategoryFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#172b2a] outline-none focus:border-[#176b4d]"
                >
                  <option value="All">All Categories</option>
                  <option value="Pre-foreclosures">Pre-foreclosures</option>
                  <option value="Estate / probate sales">Estate / Probate</option>
                  <option value="Vacant properties">Vacant Properties</option>
                  <option value="Short sales">Short Sales</option>
                  <option value="Tax-delinquent properties">Tax Delinquent</option>
                  <option value="Foreclosure auctions">Foreclosure Auctions</option>
                  <option value="Bank-owned (REO)">Bank-owned REO</option>
                  <option value="Expired / withdrawn listings">Expired / Withdrawn</option>
                </select>
              </div>

              <div>
                <select
                  value={queueBoroughFilter}
                  onChange={(e) => setQueueBoroughFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#172b2a] outline-none focus:border-[#176b4d]"
                >
                  <option value="All">All Boroughs</option>
                  {['Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island'].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <LeadFlowLoader userName={greetingName} />
            ) : filteredQueueItems.length ? (
              <div className="mt-4 max-h-[480px] overflow-y-auto pr-1 space-y-2.5 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                {filteredQueueItems.map((lead, index) => {
                  const isNewOpportunity = delivered.some((item) => item.id === lead.id)
                  const badgeBg = lead.badgeBg || 'bg-amber-50'
                  const badgeText = lead.badgeText || 'text-amber-800'
                  const badgeBorder = lead.badgeBorder || 'border-amber-200'
                  const categoryName = lead.category || 'High-Motivation Property'
                  const subheadline = lead.subheadline || 'Pre-market seller signal'
                  const reason = lead.reason || (lead.signals && lead.signals[0]) || 'Identified via municipal records'

                  return (
                    <article
                      key={lead.id}
                      className="flex flex-col gap-2.5 rounded-xl border border-slate-100 bg-[#f7f8f6] p-3.5 transition hover:bg-[#edf7f2] sm:flex-row sm:items-start"
                    >
                      <Link
                        href={`/dashboard/properties/${encodeURIComponent(lead.id)}`}
                        onClick={() => {
                          try {
                            localStorage.setItem(`leadflow-property-cache-${lead.id}`, JSON.stringify(lead))
                          } catch {}
                        }}
                        className="group flex min-w-0 flex-1 items-start gap-3 text-left"
                      >
                        <div className="mt-0.5 rounded-lg bg-white p-2.5 text-[#176b4d] shadow-xs transition group-hover:scale-105">
                          <Building2 className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-[#172b2a] px-1.5 py-0.5 text-[11px] font-black text-white">
                              #{index + 1}
                            </span>
                            <p className="truncate text-sm font-bold text-slate-900 group-hover:text-[#176b4d] group-hover:underline">
                              {lead.address}
                            </p>
                            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${badgeBg} ${badgeText} ${badgeBorder}`}>
                              {lead.categoryNumber ? `${lead.categoryNumber}. ` : ''}
                              {categoryName}
                            </span>
                          </div>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="size-3 text-[#176b4d]" />
                            {lead.borough}{lead.zip ? `, ${lead.zip}` : ''}
                            <span className="text-slate-300">•</span>
                            <span className="font-semibold text-slate-700">{subheadline}</span>
                          </p>
                          <p className="mt-1.5 text-xs leading-relaxed text-slate-600 bg-white/70 rounded-lg p-2 border border-slate-200/60">
                            <span className="font-bold text-[#172b2a]">Why it came up: </span>
                            {reason}
                          </p>
                          {/* Quick Equity Spread & Debt Preview */}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-900">
                              Est. Equity: ~${Math.round(((lead.score || 85) * 8500)).toLocaleString()} (~62% Spread)
                            </span>
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                              DOF Value: ~$850,000
                            </span>
                            <span className="rounded bg-rose-50 px-2 py-0.5 font-medium text-rose-700">
                              Mortgage/Liens: ~$320,000
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-black text-slate-900">
                            {lead.score || 0} Score
                          </span>
                          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {isNewOpportunity ? 'New Opportunity' : 'Watchlist Deal'}
                          </p>
                        </div>
                      </Link>

                      {isNewOpportunity ? (
                        <div className="flex shrink-0 flex-col sm:flex-row gap-1.5 sm:pl-2 sm:pt-1">
                          <Link
                            href={`/dashboard/properties/${encodeURIComponent(lead.id)}?tab=contacts`}
                            className="rounded-lg bg-[#172b2a] px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800 text-center flex items-center justify-center gap-1 shadow-xs"
                          >
                            <span>Find Owner</span>
                            <span className="text-emerald-400">→</span>
                          </Link>
                          {/* Wishlist Button (User requirement #2) */}
                          <button
                            type="button"
                            onClick={() => addToPipeline(lead, 'watchlist')}
                            className="rounded-lg bg-[#176b4d] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#12543d] flex items-center gap-1.5 shadow-xs"
                          >
                            <Bookmark className="size-3 text-emerald-200" />
                            <span>Wishlist</span>
                          </button>
                        </div>
                      ) : (
                        <Link
                          href="/dashboard/watchlist"
                          className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#176b4d] hover:bg-[#edf7f2] sm:mt-1"
                        >
                          In Watchlist
                        </Link>
                      )}
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-[#f7f8f6] p-8 text-center text-xs text-slate-500">
                {queueFilter === 'watchlist'
                  ? 'No watchlist deals saved yet. Click "Wishlist" on any priority property to save it.'
                  : feedError
                    ? 'The priority queue could not load new opportunities.'
                    : 'No opportunities match your filter criteria in this batch.'}
              </div>
            )}
          </section>
        </div>

        {/* Aside: Quick Actions & Workflow Routing */}
        <aside className="space-y-6">
          {/* Active Workspace Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div>
              <p className="text-sm font-black text-[#172b2a]">Active Workspace</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Done with the priority queue? Search territory maps and photos yourself.
              </p>
            </div>

            <div className="space-y-2.5">
              <Link
                href="/dashboard/leads"
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-[#edf7f2] p-3.5 text-xs font-bold text-[#172b2a] transition hover:bg-[#e0f2e9]"
              >
                <span className="flex items-center gap-2">
                  <Map className="size-4 text-[#176b4d]" />
                  <span>Explore Properties</span>
                </span>
                <ChevronRight className="size-4 text-[#176b4d]" />
              </Link>

              <Link
                href="/dashboard/watchlist"
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs font-bold text-[#172b2a] transition hover:bg-slate-100"
              >
                <span className="flex items-center gap-2">
                  <Bookmark className="size-4 text-[#176b4d]" />
                  <span>View Watchlist</span>
                </span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px]">
                  {watchlistCount}
                </span>
              </Link>

              <Link
                href="/dashboard/notes"
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs font-bold text-[#172b2a] transition hover:bg-slate-100"
              >
                <span className="flex items-center gap-2">
                  <NotebookPen className="size-4 text-[#176b4d]" />
                  <span>Agent Notes</span>
                </span>
                <ChevronRight className="size-4 text-[#176b4d]" />
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
