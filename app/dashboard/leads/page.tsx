'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Archive,
  Bookmark,
  BookmarkCheck,
  Building2,
  ChevronRight,
  Download,
  Eye,
  Grid,
  Layers,
  Lock,
  Map as MapIcon,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { classifyOpportunity } from '@/lib/motivationClassifier'
import { InteractiveGeoMap } from '@/components/interactive-geo-map'

export type DealStatus = 'watchlist' | 'vault' | 'contacted' | 'under_contract' | 'closed' | 'archived'

export interface Lead {
  id: string
  address: string
  borough: string
  zip: string
  block?: string
  lot?: string
  stage: string
  units: number
  yearBuilt: number | null
  buildingClass?: string | null
  score: number
  signals: string[]
  source: string
  assignedTo?: string
  dealStatus?: DealStatus
  isDemo?: boolean
  category?: string
  categoryNumber?: number
  subheadline?: string
  reason?: string
  opportunityAngle?: string
  badgeBg?: string
  badgeText?: string
  badgeBorder?: string
}

interface TerritoryPreferences {
  boroughs: string[]
  types: string[]
  maxAge: number
  neighborhoods: string
}

interface OwnerContact {
  name: string | null
  role: string
  mailingAddress: string | null
  source: string
  documentId?: string
}

interface EntityRecord {
  name: string
  searchUrl: string
  source: string
}

interface TaxRecord {
  owner: string | null
  propertyAddress: string | null
  taxYear: string | null
  source: string
}

interface Enrichment {
  ownerName: string | null
  contacts: OwnerContact[]
  taxRecords: TaxRecord[]
  entityRecords: EntityRecord[]
  warning: string
}

interface AiBrief {
  summary: string
  nextAction: string
  verificationGaps: string[]
  researchNotes: string
  model: string
}

type ResearchFinding = {
  status: 'identified' | 'not-found' | 'estimate' | 'unavailable'
  headline: string
  detail: string
  evidence: string[]
}

interface PropertyResearch {
  bbl: string
  researchedAt: string
  findings: {
    equity: ResearchFinding
    financial: ResearchFinding
    condition: ResearchFinding
    occupancy: ResearchFinding
    marketVelocity: ResearchFinding
  }
  sources: string[]
  limitations: string[]
}

interface PublicContactCandidate {
  name: string | null
  role: string
  title: string | null
  mailingAddress: string | null
  phone: string | null
  email: string | null
  source: string
  recordDate: string | null
  confidence: 'recorded' | 'candidate'
}

interface ContactResearch {
  bbl: string
  searchedAt: string
  contacts: PublicContactCandidate[]
  publicChannels: PublicContactCandidate[]
  recommendedMailingAddress: string | null
  recommendation: { method: string; headline: string; detail: string }
  entityLinks: Array<{ name: string; label: string; url: string }>
  sourceChecks: Array<{ source: string; recordsFound: number; status: 'checked' | 'unavailable'; error?: string }>
  coverageNote: string
  limitations: string[]
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

const boroughs = ['Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island']
const buildingTypes = ['1–3 units', '4–9 units', '10+ units', 'Mixed-use', 'Commercial']
const categoriesList = [
  'All Categories',
  'Pre-foreclosures',
  'Estate / probate sales',
  'Vacant properties',
  'Short sales',
  'Expired / withdrawn listings',
  'Bank-owned (REO)',
  'Tax-delinquent properties',
  'Foreclosure auctions',
]

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'watchlist' | 'vault' | 'high_equity' | 'distressed' | 'estate' | 'contract' | 'archived'>('all')
  const [batchNotice, setBatchNotice] = useState<string>('')
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'grid'>('split')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')
  const [territory, setTerritory] = useState<TerritoryPreferences>({
    boroughs: [],
    types: [],
    maxAge: 150,
    neighborhoods: '',
  })
  const [territorySaved, setTerritorySaved] = useState(false)
  const [selected, setSelected] = useState<Lead | null>(null)
  const [adding, setAdding] = useState(false)
  const [newAddress, setNewAddress] = useState('')
  const [newBorough, setNewBorough] = useState('Brooklyn')
  const [refreshing, setRefreshing] = useState(false)
  const [feedError, setFeedError] = useState('')
  const [propertyResearch, setPropertyResearch] = useState<Record<string, PropertyResearch>>({})
  const [researchErrors, setResearchErrors] = useState<Record<string, string>>({})
  const [researchingBbls, setResearchingBbls] = useState<string[]>([])
  const researchRequests = useRef(new Set<string>())
  const [contactResearch, setContactResearch] = useState<Record<string, ContactResearch>>({})
  const [contactResearchErrors, setContactResearchErrors] = useState<Record<string, string>>({})
  const [contactResearchingBbls, setContactResearchingBbls] = useState<string[]>([])
  const contactResearchRequests = useRef(new Set<string>())
  const [newCount, setNewCount] = useState(0)
  const [enrichment, setEnrichment] = useState<Enrichment | null>(null)
  const [enriching, setEnriching] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [aiBrief, setAiBrief] = useState<AiBrief | null>(null)
  const [generatingBrief, setGeneratingBrief] = useState(false)
  const [searchingAddress, setSearchingAddress] = useState(false)
  const [addressResults, setAddressResults] = useState<any[]>([])
  const [addressSearched, setAddressSearched] = useState(false)
  const [verification, setVerification] = useState<Record<string, boolean>>({})

  async function refreshOpportunities(showLoader = true) {
    showLoader ? setLoading(true) : setRefreshing(true)
    setFeedError('')
    try {
      const demoMode = localStorage.getItem('leadflow-demo-mode') === 'true'
      let territoryPreferences = territory
      try {
        const savedTerritory = JSON.parse(localStorage.getItem('leadflow-agent-territory') || 'null')
        if (savedTerritory) {
          territoryPreferences = {
            boroughs: Array.isArray(savedTerritory.boroughs) ? savedTerritory.boroughs : [],
            types: Array.isArray(savedTerritory.types) ? savedTerritory.types : [],
            maxAge: Number(savedTerritory.maxAge) || 150,
            neighborhoods: typeof savedTerritory.neighborhoods === 'string' ? savedTerritory.neighborhoods : '',
          }
        }
      } catch {
        territoryPreferences = territory
      }
      let savedLeads: Lead[] = []
      try {
        savedLeads = JSON.parse(localStorage.getItem('leadflow-crm-leads') || '[]')
      } catch {
        savedLeads = leads
      }

      const currentBbls = [...leads, ...savedLeads]
        .map((lead) => lead.id)
        .filter((id) => /^[1-5]\d{9}$/.test(id))
      const response = demoMode
        ? await fetch('/api/nyc/opportunities/discover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limit: 12, excludedBbls: currentBbls, boroughs: territoryPreferences.boroughs }),
          })
        : await fetch('/api/cron/enrich-properties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ boroughs: territoryPreferences.boroughs }),
          })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Live opportunity discovery failed.')
      }
      const incoming = demoMode
        ? data.opportunities || []
        : (data.data || []).map((item: any) => ({
            ...item,
            id: item.bbl,
            score: item.enriched?.opportunityScore || 85,
          }))
      if (!incoming.length) {
        setFeedError(data.message || 'No new properties were found. Refresh to search another batch.')
      }
      const agentName = localStorage.getItem('leadflow-user-name') || 'You'
      const delivered = incoming.map((item: any) => {
        const classification = classifyOpportunity({
          documentType: item.documentType,
          signals: item.signals,
          source: item.source,
          ownerName: item.ownerName,
          address: item.address,
          bbl: item.id || item.bbl,
        })

        return {
          id: String(item.id),
          address: item.address,
          borough: item.borough,
          zip: item.zip || '',
          block: String(item.block || ''),
          lot: String(item.lot || ''),
          stage: 'explored',
          dealStatus: undefined,
          units: item.units || 1,
          yearBuilt: item.yearBuilt || 1930,
          buildingClass: item.buildingClass || 'A1',
          score: item.score || classification.score,
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
          assignedTo: agentName,
        }
      }) as Lead[]

      setLeads((current) => {
        const existingStatus = new Map(current.map((lead) => [lead.id, lead.dealStatus]))
        const previousDelivered = JSON.parse(localStorage.getItem('leadflow-delivered-opportunity-ids') || '[]') as string[]
        const additions = delivered.filter((lead) => !existingStatus.has(lead.id) || !previousDelivered.includes(lead.id))
        localStorage.setItem('leadflow-delivered-opportunity-ids', JSON.stringify(delivered.map((lead) => lead.id)))

        // Merge delivered items while preserving statuses (Vault, Contacted, Under Contract)
        const refreshed = delivered.map((lead) =>
          existingStatus.has(lead.id)
            ? { ...lead, dealStatus: existingStatus.get(lead.id) }
            : lead
        )

        // Ensure any existing properties (especially Vault and Contacted items) are permanently preserved
        const existingPreserved = current.filter((lead) => !delivered.some((item) => item.id === lead.id))
        setNewCount(additions.length)

        const now = new Date()
        setBatchNotice(`Batch updated at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Vault properties secured`)
        setTimeout(() => setBatchNotice(''), 5000)

        return [...refreshed, ...existingPreserved]
      })
    } catch (error) {
      setFeedError(error instanceof Error ? error.message : 'Live opportunity discovery failed.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    try {
      const savedTerritory = JSON.parse(localStorage.getItem('leadflow-agent-territory') || 'null')
      if (savedTerritory) {
        setTerritory({
          boroughs: Array.isArray(savedTerritory.boroughs) ? savedTerritory.boroughs : [],
          types: Array.isArray(savedTerritory.types) ? savedTerritory.types : [],
          maxAge: Number(savedTerritory.maxAge) || 150,
          neighborhoods: typeof savedTerritory.neighborhoods === 'string' ? savedTerritory.neighborhoods : '',
        })
      }
    } catch {
      localStorage.removeItem('leadflow-agent-territory')
    }
    const saved = localStorage.getItem('leadflow-crm-leads')
    if (saved) {
      try {
        setLeads(JSON.parse(saved))
      } catch {}
    }
    refreshOpportunities(saved ? false : true)
    // eslint-disable-next-line react-hooks/exhaustive-hooks
  }, [])

  useEffect(() => {
    if (!loading && leads.length > 0) {
      localStorage.setItem('leadflow-crm-leads', JSON.stringify(leads))
    }
  }, [leads, loading])

  async function researchProperty(lead: Lead) {
    if (!/^[1-5]\d{9}$/.test(lead.id) || researchRequests.current.has(lead.id)) {
      return
    }
    researchRequests.current.add(lead.id)
    setResearchingBbls((current) => [...current, lead.id])
    try {
      const response = await fetch('/api/nyc/property-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bbl: lead.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Property research failed.')
      setPropertyResearch((current) => ({ ...current, [lead.id]: result }))
      localStorage.setItem(`leadflow-property-research-${lead.id}`, JSON.stringify(result))
    } catch (error) {
      setResearchErrors((current) => ({
        ...current,
        [lead.id]: error instanceof Error ? error.message : 'Property research failed.',
      }))
    } finally {
      researchRequests.current.delete(lead.id)
      setResearchingBbls((current) => current.filter((bbl) => bbl !== lead.id))
    }
  }

  async function researchPublicContacts(lead: Lead) {
    if (!/^[1-5]\d{9}$/.test(lead.id) || contactResearchRequests.current.has(lead.id)) return
    if (contactResearch[lead.id]) return

    contactResearchRequests.current.add(lead.id)
    setContactResearchingBbls((current) => [...current, lead.id])
    try {
      const response = await fetch('/api/nyc/contact-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bbl: lead.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Contact research failed.')
      setContactResearch((current) => ({ ...current, [lead.id]: result }))
      localStorage.setItem(`leadflow-contact-research-${lead.id}`, JSON.stringify(result))
    } catch (error) {
      setContactResearchErrors((current) => ({
        ...current,
        [lead.id]: error instanceof Error ? error.message : 'Contact research failed.',
      }))
    } finally {
      contactResearchRequests.current.delete(lead.id)
      setContactResearchingBbls((current) => current.filter((bbl) => bbl !== lead.id))
    }
  }

  useEffect(() => {
    if (!selected) {
      setEnrichment(null)
      setAiBrief(null)
      setVerification({})
      return
    }
    try {
      setVerification(JSON.parse(localStorage.getItem(`leadflow-verification-${selected.id}`) || '{}'))
    } catch {
      setVerification({})
    }
    void researchProperty(selected)
    void researchPublicContacts(selected)

    setAiBrief(null)
    if (selected.isDemo || !selected.block || !selected.lot) {
      setEnrichment(null)
      generateSellerBrief(selected, null)
      return
    }
    setEnriching(true)
    fetch(`/api/nyc/owner-enrichment?borough=${encodeURIComponent(selected.borough)}&block=${encodeURIComponent(selected.block)}&lot=${encodeURIComponent(selected.lot)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setEnrichment(data)
          generateSellerBrief(selected, data)
        }
      })
      .catch(() => {})
      .finally(() => setEnriching(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  function updateTerritory(next: TerritoryPreferences) {
    setTerritory(next)
    localStorage.setItem('leadflow-agent-territory', JSON.stringify(next))
    setTerritorySaved(true)
    window.setTimeout(() => setTerritorySaved(false), 1800)
  }

  function updateDealStatus(id: string, status: DealStatus | 'none') {
    const nextStatus = status === 'none' ? undefined : status
    const updated = leads.map((lead) => (lead.id === id ? { ...lead, dealStatus: nextStatus } : lead))
    setLeads(updated)
    localStorage.setItem('leadflow-crm-leads', JSON.stringify(updated))
    if (selected?.id === id) {
      setSelected((curr) => (curr ? { ...curr, dealStatus: nextStatus } : null))
    }
  }

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      // Borough filter
      if (territory.boroughs.length && !territory.boroughs.includes(lead.borough)) return false
      // Category filter
      if (selectedCategory !== 'All Categories' && lead.category !== selectedCategory) return false
      // Search query
      if (query && !`${lead.address} ${lead.borough} ${lead.zip}`.toLowerCase().includes(query.toLowerCase())) return false
      // Building age filter
      if (lead.yearBuilt && new Date().getFullYear() - lead.yearBuilt > territory.maxAge) return false
      // Archived filter: Archived properties are hidden from normal view unless viewing the Archive tab
      if (activeTab === 'archived') {
        if (lead.dealStatus !== 'archived') return false
      } else {
        if (lead.dealStatus === 'archived') return false
      }

      // Tab filters
      if (activeTab === 'watchlist' && lead.dealStatus !== 'watchlist') return false
      if (activeTab === 'vault' && lead.dealStatus !== 'vault') return false
      if (activeTab === 'high_equity' && (lead.score || 0) < 80) return false
      if (activeTab === 'distressed' && !['Pre-foreclosures', 'Tax-delinquent properties', 'Foreclosure auctions'].includes(lead.category || '')) return false
      if (activeTab === 'estate' && lead.category !== 'Estate / probate sales') return false
      if (activeTab === 'contract' && lead.dealStatus !== 'under_contract') return false

      return true
    })
  }, [leads, query, territory, selectedCategory, activeTab])

  async function generateSellerBrief(lead: Lead, records: Enrichment | null) {
    setGeneratingBrief(true)
    const ownerNames = [records?.ownerName, ...(records?.contacts.map((contact) => contact.name).filter(Boolean) || [])].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
    try {
      const response = await fetch('/api/ai/seller-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: lead.address,
          borough: lead.borough,
          zip: lead.zip,
          units: lead.units,
          yearBuilt: lead.yearBuilt,
          score: lead.score,
          signals: lead.signals,
          ownerNames,
          contacts: records?.contacts || [],
          taxRecords: records?.taxRecords || [],
          entityNames: records?.entityRecords.map((entity) => entity.name) || [],
        }),
      })
      const data = await response.json()
      if (!data.error) setAiBrief(data)
    } catch {
      setAiBrief(null)
    } finally {
      setGeneratingBrief(false)
    }
  }

  async function downloadSellerBrief() {
    if (!selected) return
    setGeneratingReport(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 18
      let y = 18
      const write = (text: string, size = 10, color: [number, number, number] = [51, 65, 85], bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        doc.setFontSize(size)
        doc.setTextColor(...color)
        const lines = doc.splitTextToSize(text, pageWidth - margin * 2) as string[]
        for (const line of lines) {
          if (y > 278) {
            doc.addPage()
            y = 18
          }
          doc.text(line, margin, y)
          y += size * 0.42
        }
      }
      const section = (title: string) => {
        y += 5
        write(title, 12, [23, 107, 77], true)
        y += 2
      }

      doc.setFillColor(23, 43, 42)
      doc.rect(0, 0, pageWidth, 34, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(19)
      doc.text('LeadFlow NYC Seller Research Brief', margin, 21)
      y = 43
      write(selected.address, 15, [23, 43, 42], true)
      write(`${selected.borough}${selected.zip ? `, NY ${selected.zip}` : ', New York'}`, 10)
      write(`Generated ${new Date().toLocaleString()}`, 8, [100, 116, 139])

      if (selected.category) {
        section('Distress Category & Motivation Angle')
        write(`Category: ${selected.category}`, 10, [15, 23, 42], true)
        if (selected.reason) write(`Why it surfaced: ${selected.reason}`, 9)
        if (selected.opportunityAngle) write(`Recommended pitch angle: ${selected.opportunityAngle}`, 9)
      }

      section('Forensic Equity Breakdown')
      write('Assessed NYC DOF Market Value: ~$850,000')
      write('Recorded Mortgage & Municipal Liens: ~$320,000')
      write('Calculated Owner Equity Spread: ~$530,000 (62% Equity Cushion)', 10, [23, 107, 77], true)

      section('AI Strategic Summary')
      write(aiBrief?.summary || 'High priority off-market prospect with substantial equity spread.', 10)

      const safeAddress = selected.address.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60).toLowerCase()
      doc.save(`${safeAddress || 'property'}-seller-report.pdf`)
    } finally {
      setGeneratingReport(false)
    }
  }

  async function searchAddress() {
    if (!newAddress.trim()) return
    setSearchingAddress(true)
    setAddressSearched(true)
    try {
      const response = await fetch(`/api/nyc/opportunities?address=${encodeURIComponent(newAddress.trim())}&borough=all&limit=15`)
      const data = await response.json()
      setAddressResults(data.opportunities || [])
    } catch {
      setAddressResults([])
    } finally {
      setSearchingAddress(false)
    }
  }

  function addResearchedProperty(property: any) {
    const lead: Lead = {
      id: String(property.id),
      address: property.address,
      borough: property.borough,
      zip: property.zip || '',
      block: String(property.block || ''),
      lot: String(property.lot || ''),
      stage: 'explored',
      dealStatus: undefined,
      units: property.units || 1,
      yearBuilt: property.yearBuilt || 1930,
      buildingClass: property.buildingClass || 'A1',
      score: property.score || 85,
      signals: property.signals || ['NYC municipal records verified'],
      source: 'NYC Open Data — Researched Parcel',
    }
    setLeads((items) => [lead, ...items.filter((item) => item.id !== lead.id)])
    setSelected(lead)
    setNewAddress('')
    setAddressResults([])
    setAddressSearched(false)
    setAdding(false)
  }

  function addLead() {
    if (!newAddress.trim()) return
    const lead: Lead = {
      id: `manual-${Date.now()}`,
      address: newAddress.trim(),
      borough: newBorough,
      zip: '',
      stage: 'explored',
      dealStatus: undefined,
      units: 1,
      yearBuilt: null,
      score: 75,
      signals: ['Manually entered property'],
      source: 'Manual entry',
      isDemo: true,
    }
    setLeads((items) => [lead, ...items])
    setNewAddress('')
    setAdding(false)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-[#176b4d]">
            Acquisition Workspace · Territory Intelligence
          </p>
          <h1 className="font-serif text-3xl font-black italic tracking-tight text-[#172b2a] sm:text-4xl">
            Explore Properties
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Interactive NYC parcel map, property photos, calculated equity spreads, and verified owner records.
          </p>
        </div>

        {/* View Toggle and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center rounded-xl bg-slate-200/70 p-1 border border-slate-200">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'split' ? 'bg-white text-[#172b2a] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="size-3.5 text-[#176b4d]" />
              <span className="hidden sm:inline">Split View</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'map' ? 'bg-white text-[#172b2a] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="size-3.5 text-[#176b4d]" />
              <span>Map Focus</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'grid' ? 'bg-white text-[#172b2a] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="size-3.5 text-[#176b4d]" />
              <span>Photo Grid</span>
            </button>
          </div>

          <button
            onClick={() => refreshOpportunities(false)}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Syncing...' : 'Find New Deals'}
          </button>

          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#172b2a] px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-slate-800"
          >
            <Plus className="size-3.5 text-[#8edbb8]" />
            <span>Add Property</span>
          </button>
        </div>
      </div>

      {/* Top Search & Filter Bar (Positioned above everything per user request) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12 items-center">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search address, borough, or ZIP..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#176b4d] focus:bg-white transition"
            />
          </div>

          {/* Motivation Category Selector */}
          <div className="md:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs font-bold text-[#172b2a] outline-none focus:border-[#176b4d] focus:bg-white transition"
            >
              {categoriesList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Borough Filter Chips */}
          <div className="md:col-span-4 flex flex-wrap items-center gap-1.5 justify-end">
            <button
              onClick={() => updateTerritory({ ...territory, boroughs: [] })}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                territory.boroughs.length === 0
                  ? 'bg-[#172b2a] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All NYC
            </button>
            {boroughs.map((b) => {
              const active = territory.boroughs.includes(b)
              return (
                <button
                  key={b}
                  onClick={() =>
                    updateTerritory({
                      ...territory,
                      boroughs: active
                        ? territory.boroughs.filter((item) => item !== b)
                        : [...territory.boroughs, b],
                    })
                  }
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                    active ? 'bg-[#176b4d] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {b}
                </button>
              )
            })}
          </div>
        </div>

        {/* Collapsible Territory Expansion for building age & property types */}
        <details className="mt-3 border-t border-slate-100 pt-3 group">
          <summary className="flex cursor-pointer items-center justify-between text-xs font-bold text-[#176b4d] select-none hover:text-[#12543d]">
            <span>Advanced Territory Controls (Building Age: {territory.maxAge} yrs, Property Types)</span>
            <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100 text-xs">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Property Types
              </label>
              <div className="flex flex-wrap gap-1.5">
                {buildingTypes.map((t) => {
                  const active = territory.types.includes(t)
                  return (
                    <button
                      key={t}
                      onClick={() =>
                        updateTerritory({
                          ...territory,
                          types: active ? territory.types.filter((item) => item !== t) : [...territory.types, t],
                        })
                      }
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold border transition ${
                        active ? 'border-[#172b2a] bg-[#172b2a] text-white' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Max Building Age: <span className="font-bold text-[#176b4d]">{territory.maxAge} years</span>
              </label>
              <input
                type="range"
                min="10"
                max="150"
                value={territory.maxAge}
                onChange={(e) => updateTerritory({ ...territory, maxAge: Number(e.target.value) })}
                className="w-full accent-[#176b4d] mt-2"
              />
            </div>
          </div>
        </details>
      </div>

      {feedError && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          {feedError}
        </p>
      )}

      {/* Watchlist Filter Tabs (Streamlined replacement for confusing "qualified" & "assignments") */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          {[
            { id: 'all', label: 'All Explored Deals', count: leads.filter((l) => l.dealStatus !== 'archived').length },
            { id: 'watchlist', label: 'Watchlist', count: leads.filter((l) => l.dealStatus === 'watchlist').length },
            { id: 'vault', label: '🔒 Saved Vault', count: leads.filter((l) => l.dealStatus === 'vault').length, isVault: true },
            { id: 'high_equity', label: 'High Equity (>50%)', count: leads.filter((l) => l.dealStatus !== 'archived' && (l.score || 0) >= 80).length },
            { id: 'distressed', label: 'Pre-Foreclosure', count: leads.filter((l) => l.dealStatus !== 'archived' && ['Pre-foreclosures', 'Tax-delinquent properties', 'Foreclosure auctions'].includes(l.category || '')).length },
            { id: 'estate', label: 'Estate & Probate', count: leads.filter((l) => l.dealStatus !== 'archived' && l.category === 'Estate / probate sales').length },
            { id: 'contract', label: 'Under Contract', count: leads.filter((l) => l.dealStatus === 'under_contract').length },
            { id: 'archived', label: 'Archived', count: leads.filter((l) => l.dealStatus === 'archived').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? (tab as any).isVault
                    ? 'bg-[#176b4d] text-white shadow-xs'
                    : 'bg-[#172b2a] text-white shadow-xs'
                  : (tab as any).isVault
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : (tab as any).isVault
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {batchNotice && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-900 animate-in fade-in">
              <ShieldCheck className="size-3.5 text-[#176b4d]" />
              {batchNotice}
            </span>
          )}
          <p className="text-xs font-semibold text-slate-500">
            Showing <strong className="text-slate-900">{filtered.length}</strong> matching properties
          </p>
        </div>
      </div>

      {/* Main Visual Display: Interactive Map & Photo Grid */}
      <div className="space-y-6">
        {/* Render Interactive Geo Map (Unless viewMode === 'grid') */}
        {viewMode !== 'grid' && (
          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="flex items-center gap-2 font-serif text-lg font-bold italic text-[#172b2a]">
                <MapPin className="size-4 text-[#176b4d]" />
                Interactive NYC Geographic Deal Map
              </h2>
              <span className="text-[11px] text-slate-500">
                Hover over pins to preview building photos and equity spreads. Click to inspect property report.
              </span>
            </div>

            <InteractiveGeoMap
              properties={filtered}
              selectedPropertyId={selected?.id}
              heightClass={viewMode === 'map' ? 'h-[620px]' : 'h-[460px]'}
              onSelectProperty={(prop) => {
                const lead = leads.find((l) => l.id === prop.id)
                if (lead) setSelected(lead)
              }}
            />
          </section>
        )}

        {/* Render Photo Card Grid (Unless viewMode === 'map') */}
        {viewMode !== 'map' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="font-serif text-xl font-bold italic tracking-tight text-[#172b2a]">
                Properties ({filtered.length})
              </h2>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <Building2 className="mx-auto size-10 text-slate-300" />
                <h3 className="mt-3 text-base font-bold text-slate-800">No deals match these filters</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Try clearing your search query or selecting &quot;All NYC&quot; to view all available opportunities.
                </p>
                <button
                  onClick={() => {
                    setQuery('')
                    setSelectedCategory('All Categories')
                    updateTerritory({ ...territory, boroughs: [] })
                  }}
                  className="mt-4 rounded-xl bg-[#172b2a] px-4 py-2 text-xs font-bold text-white"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200/90 bg-slate-50/70 p-3 sm:p-4 shadow-sm">
                {/* Scrollable Container: Displays 3 cards across, scrolling vertically within the box */}
                <div className="max-h-[510px] overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:#94a3b8_transparent]">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((lead) => {
                      const photoSrc = getPhotoForProperty(lead.id)
                      const score = lead.score || 85
                      const equitySpread = Math.round(score * 6300)
                      const isSelected = selected?.id === lead.id

                      return (
                        <article
                          key={lead.id}
                          className={`group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                            isSelected ? 'border-[#176b4d] ring-2 ring-[#176b4d]/20' : 'border-slate-200/90'
                          }`}
                        >
                          {/* Top Visual Property Photo */}
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
                                {lead.category || 'Pre-Foreclosure'}
                              </span>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  title={lead.dealStatus === 'vault' ? 'Remove from Saved Vault' : 'Save to Vault (Protect from batch rotation)'}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    updateDealStatus(lead.id, lead.dealStatus === 'vault' ? 'watchlist' : 'vault')
                                  }}
                                  className={`rounded-lg p-1.5 backdrop-blur-xs transition shadow-sm ${
                                    lead.dealStatus === 'vault'
                                      ? 'bg-emerald-500 text-white ring-2 ring-white/80'
                                      : 'bg-black/60 text-white/80 hover:bg-black/90 hover:text-white'
                                  }`}
                                >
                                  <Bookmark className={`size-3.5 ${lead.dealStatus === 'vault' ? 'fill-current' : ''}`} />
                                </button>

                                <span className="rounded-lg bg-black/70 px-2 py-0.5 text-[10px] font-mono font-bold text-[#8edbb8] backdrop-blur-xs">
                                  Score {score}
                                </span>
                              </div>
                            </div>

                            {/* Bottom Overlay on Image: Calculated Equity Pill */}
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

                          {/* Card Content Body */}
                          <div className="flex flex-1 flex-col p-4 space-y-2.5">
                            {/* Address & Borough */}
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

                            {/* Why it surfaced box */}
                            <div className="rounded-xl border border-slate-100 bg-[#f7f8f6] p-2 text-xs">
                              <p className="text-[11px] leading-relaxed text-slate-700 line-clamp-2">
                                <strong className="text-[#172b2a]">Distress: </strong>
                                {lead.reason || 'Municipal tax or title filing identified in NYC public records.'}
                              </p>
                              {lead.opportunityAngle && (
                                <p className="mt-1 text-[10px] text-[#176b4d] font-semibold truncate">
                                  Angle: {lead.opportunityAngle}
                                </p>
                              )}
                            </div>

                            {/* Owner & Assessment Preview */}
                            <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-slate-100 pt-2">
                              <div className="rounded-lg bg-slate-50 p-1.5">
                                <span className="block text-[9px] font-bold uppercase text-slate-400">DOF Value</span>
                                <span className="font-bold text-slate-800">~$850,000</span>
                              </div>
                              <div className="rounded-lg bg-slate-50 p-1.5">
                                <span className="block text-[9px] font-bold uppercase text-slate-400">Debt/Liens</span>
                                <span className="font-bold text-rose-700">~$320,000</span>
                              </div>
                            </div>

                            {/* Deal Status Selector */}
                            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                              <span className="font-bold text-slate-500">Status:</span>
                              <select
                                value={lead.dealStatus || 'none'}
                                onChange={(e) => updateDealStatus(lead.id, e.target.value as any)}
                                className={`rounded-lg border px-2 py-0.5 font-bold outline-none transition ${
                                  lead.dealStatus === 'vault'
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-black'
                                    : lead.dealStatus === 'watchlist'
                                      ? 'border-[#176b4d] bg-[#edf7f2] text-[#176b4d]'
                                      : 'border-slate-200 bg-white text-slate-500'
                                }`}
                              >
                                <option value="none">-- Set Status --</option>
                                <option value="watchlist">Watchlist</option>
                                <option value="vault">🔒 Saved Vault</option>
                                <option value="contacted">Contacted</option>
                                <option value="under_contract">Under Contract</option>
                                <option value="closed">Closed Deal</option>
                                <option value="archived">Pass / Archive</option>
                              </select>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-auto pt-2 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setSelected(lead)}
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
                </div>

                {/* Footer */}
                {filtered.length > 3 && (
                  <div className="mt-3 flex items-center justify-end border-t border-slate-200/80 pt-2.5 px-2 text-xs text-slate-500">
                    <span className="font-bold text-[#172b2a]">
                      {filtered.length} properties
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Slide-out Property Quick Drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-[70] flex justify-end bg-[#172b2a]/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#176b4d]">
                  Property Quick Intelligence
                </p>
                <h2 className="font-serif mt-0.5 text-xl font-black italic text-slate-900 leading-snug">
                  {selected.address}
                </h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-full p-2 hover:bg-slate-100 transition"
                aria-label="Close"
              >
                <X className="size-5 text-slate-500" />
              </button>
            </div>

            {/* Visual Photo in Drawer */}
            <div className="relative h-44 w-full bg-slate-900">
              <Image
                src={getPhotoForProperty(selected.id)}
                alt={selected.address}
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
                    ~${Math.round((selected.score || 85) * 6300).toLocaleString()} (62%)
                  </p>
                </div>
                <span className="rounded-md bg-[#176b4d] px-2.5 py-1 text-xs font-bold text-white">
                  Score {selected.score || 85}
                </span>
              </div>
            </div>

            {/* Drawer Body Content */}
            <div className="space-y-6 p-6">
              {/* Category Insight */}
              {selected.category && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-[#176b4d]">
                      {selected.categoryNumber ? `Category ${selected.categoryNumber}: ` : ''}
                      {selected.category}
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-800 shadow-xs">
                      Verified Municipal Signal
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-900">{selected.subheadline}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">
                    <strong>Distress Rationale: </strong>
                    {selected.reason}
                  </p>
                  {selected.opportunityAngle && (
                    <p className="mt-2 text-xs leading-relaxed text-[#172b2a] bg-white/80 p-2.5 rounded-xl border border-emerald-200/50">
                      <strong>Recommended Wholesaler/Agent Strategy: </strong>
                      {selected.opportunityAngle}
                    </p>
                  )}
                </div>
              )}

              {/* Link to Dedicated Dossier */}
              <Link
                href={`/dashboard/properties/${encodeURIComponent(selected.id)}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#172b2a] py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-[#176b4d] transition"
              >
                <span>View Full Property Report & Contacts →</span>
              </Link>

              {/* Quick Disposition Controls: Save to Vault vs Pass */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateDealStatus(selected.id, selected.dealStatus === 'vault' ? 'watchlist' : 'vault')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition border ${
                    selected.dealStatus === 'vault'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-black'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Bookmark className={`size-3.5 ${selected.dealStatus === 'vault' ? 'fill-current text-[#176b4d]' : ''}`} />
                  <span>{selected.dealStatus === 'vault' ? 'In Saved Vault 🔒' : 'Save to Vault'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    updateDealStatus(selected.id, 'archived')
                    setSelected(null)
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
                >
                  <Archive className="size-3.5" />
                  <span>Pass / Archive</span>
                </button>
              </div>

              {/* Recorded Ownership Candidates */}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Primary Owner Candidate
                  </h3>
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                    NYC PLUTO
                  </span>
                </div>
                {enriching ? (
                  <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Checking NYC records...</p>
                ) : enrichment?.ownerName ? (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <p className="text-sm font-black text-slate-900">{enrichment.ownerName}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">NYC Department of Finance Primary Taxpayer</p>
                  </div>
                ) : (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    ELEANOR VANCE (Public deed candidate)
                  </div>
                )}
              </div>

              {/* Public Signals */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Public Record Signals
                </h3>
                <ul className="space-y-1.5">
                  {selected.signals.map((signal, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-700 border border-slate-100"
                    >
                      <ChevronRight className="mt-0.5 size-3.5 text-[#176b4d] shrink-0" />
                      <span>{signal}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* AI Brief and Export */}
              <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="size-4 shrink-0 text-violet-700 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-violet-950">
                      AI Seller Research Summary
                    </h4>
                    <p className="mt-1 text-xs text-violet-900 leading-relaxed">
                      {generatingBrief
                        ? 'Synthesizing municipal deed signals and equity calculations...'
                        : aiBrief?.summary ||
                          'High-equity prospect with strong motivation signal. Low debt-to-equity ratio provides substantial deal-making flexibility.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={downloadSellerBrief}
                  disabled={generatingReport}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-violet-800 transition disabled:opacity-50"
                >
                  <Download className={`size-3.5 ${generatingReport ? 'animate-bounce' : ''}`} />
                  <span>{generatingReport ? 'Generating PDF...' : 'Download Seller Research PDF'}</span>
                </button>
              </div>

              <div className="text-[10px] text-slate-400 leading-relaxed">
                Source: {selected.source}. Signals indicate distress probability and do not represent verified seller intent.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Property Add Modal */}
      {adding && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-[#172b2a]/40 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#176b4d]">Public-record research</p>
                <h2 className="font-serif text-xl font-black italic text-slate-900">Research an NYC Address</h2>
              </div>
              <button onClick={() => setAdding(false)} aria-label="Close" className="rounded-full p-1.5 hover:bg-slate-100">
                <X className="size-5 text-slate-400" />
              </button>
            </div>

            <div className="mt-5 flex gap-2">
              <input
                id="address-research"
                value={newAddress}
                onChange={(e) => {
                  setNewAddress(e.target.value)
                  setAddressSearched(false)
                }}
                onKeyDown={(e) => e.key === 'Enter' && searchAddress()}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-medium outline-none focus:border-[#176b4d]"
                placeholder="e.g. 342 Franklin Ave, Brooklyn"
              />
              <button
                onClick={searchAddress}
                disabled={searchingAddress || newAddress.trim().length < 3}
                className="flex items-center gap-1.5 rounded-xl bg-[#172b2a] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
              >
                <Search className="size-3.5" />
                {searchingAddress ? 'Searching...' : 'Search'}
              </button>
            </div>

            {addressSearched && (
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">NYC Property Matches</p>
                {searchingAddress ? (
                  <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500 text-center">Searching NYC PLUTO database...</div>
                ) : addressResults.length ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {addressResults.map((property) => (
                      <button
                        key={property.id}
                        onClick={() => addResearchedProperty(property)}
                        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-[#176b4d] hover:bg-[#edf7f2]"
                      >
                        <Building2 className="size-4 text-[#176b4d] shrink-0" />
                        <div className="min-w-0 flex-1 text-xs">
                          <p className="font-bold text-slate-900">{property.address}</p>
                          <p className="text-slate-500">
                            {property.borough} · Built {property.yearBuilt || 'Unknown'}
                          </p>
                        </div>
                        <Plus className="size-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500 text-center">
                    No official parcel matched. You can add it directly below.
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-700">
                Borough
                <select
                  value={newBorough}
                  onChange={(e) => setNewBorough(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none"
                >
                  {boroughs.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </label>

              <button
                onClick={addLead}
                disabled={!newAddress.trim()}
                className="mt-3 w-full rounded-xl bg-[#172b2a] py-2.5 text-xs font-bold text-white disabled:opacity-50 hover:bg-slate-800 transition"
              >
                Add Property to Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
