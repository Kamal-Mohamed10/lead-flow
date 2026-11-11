'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  Check,
  ChevronRight,
  Download,
  Edit3,
  FileText,
  MapPin,
  NotebookPen,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react'
import {
  AGENT_NOTES_EVENT,
  AgentNoteEntry,
  deleteAgentNoteById,
  exportAgentNotesCsv,
  loadAgentNotes,
  updateAgentNoteById,
  upsertAgentNote,
} from '@/lib/agentNotes'

interface KnownProperty {
  id: string
  address: string
  borough: string
  zip?: string
  units?: number
  yearBuilt?: number | null
  buildingClass?: string | null
  score?: number
  category?: string
  reason?: string
  opportunityAngle?: string
  signals?: string[]
}

export default function AgentNotesPage() {
  const [notes, setNotes] = useState<AgentNoteEntry[]>([])
  const [knownProperties, setKnownProperties] = useState<KnownProperty[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [boroughFilter, setBoroughFilter] = useState('All')

  // AI Quick Compile form state
  const [showGenerator, setShowGenerator] = useState(false)
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [customOwnerName, setCustomOwnerName] = useState('')
  const [customContactInfo, setCustomContactInfo] = useState('')
  const [compiling, setCompiling] = useState(false)
  const [compileError, setCompileError] = useState<string | null>(null)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<AgentNoteEntry>>({})

  const syncFromStorage = useCallback(() => {
    setNotes(loadAgentNotes())

    const byId = new Map<string, KnownProperty>()
    try {
      const crm = JSON.parse(localStorage.getItem('leadflow-crm-leads') || '[]')
      if (Array.isArray(crm)) {
        for (const item of crm) {
          if (item?.id && item?.address) byId.set(item.id, item)
        }
      }
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('leadflow-property-cache-')) {
          const item = JSON.parse(localStorage.getItem(key) || 'null')
          if (item?.id && item?.address && !byId.has(item.id)) {
            byId.set(item.id, item)
          }
        }
      }
    } catch {}

    const list = Array.from(byId.values())
    setKnownProperties(list)
    setSelectedPropertyId((prev) => prev || list[0]?.id || '')
  }, [])

  useEffect(() => {
    const raf = requestAnimationFrame(syncFromStorage)
    window.addEventListener('storage', syncFromStorage)
    window.addEventListener(AGENT_NOTES_EVENT, syncFromStorage)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('storage', syncFromStorage)
      window.removeEventListener(AGENT_NOTES_EVENT, syncFromStorage)
    }
  }, [syncFromStorage])

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return notes.filter((note) => {
      if (boroughFilter !== 'All' && note.borough !== boroughFilter) return false
      if (!q) return true
      return [
        note.address,
        note.borough,
        note.ownerName,
        note.contactInfo,
        note.propertyDescription,
        note.motivatingFactor,
        note.category || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [notes, searchQuery, boroughFilter])

  async function compileWithAi(e: React.FormEvent) {
    e.preventDefault()
    const prop = knownProperties.find((p) => p.id === selectedPropertyId)
    if (!prop || compiling) return

    setCompiling(true)
    setCompileError(null)

    try {
      // Pull public contact & research records when available so AI has full context
      let foundOwner = customOwnerName.trim() || null
      let foundPhone: string | null = null
      let foundEmail: string | null = null
      let foundMailing: string | null = null
      let financials: Record<string, unknown> | null = null

      if (/^[1-5]\d{9}$/.test(prop.id)) {
        const [contactRes, researchRes] = await Promise.allSettled([
          fetch('/api/nyc/contact-research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bbl: prop.id, address: prop.address, borough: prop.borough }),
          }).then((r) => (r.ok ? r.json() : null)),
          fetch('/api/nyc/property-research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bbl: prop.id, address: prop.address, borough: prop.borough, zip: prop.zip }),
          }).then((r) => (r.ok ? r.json() : null)),
        ])

        if (contactRes.status === 'fulfilled' && contactRes.value?.contacts?.length) {
          const primary = contactRes.value.contacts[0]
          if (!foundOwner) foundOwner = primary.name || null
          foundPhone = primary.isDnc ? null : primary.phone || null
          foundEmail = primary.email || null
          foundMailing = primary.mailingAddress || null
        }
        if (researchRes.status === 'fulfilled' && researchRes.value?.financials) {
          financials = researchRes.value.financials
        }
      }

      const response = await fetch('/api/ai/agent-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: prop.id,
          address: prop.address,
          borough: prop.borough,
          zip: prop.zip || null,
          units: prop.units ?? null,
          yearBuilt: prop.yearBuilt ?? null,
          buildingClass: prop.buildingClass ?? null,
          score: prop.score ?? null,
          category: prop.category ?? null,
          reason: prop.reason ?? null,
          opportunityAngle: prop.opportunityAngle ?? null,
          signals: prop.signals || [],
          ownerName: foundOwner,
          phone: foundPhone,
          email: foundEmail,
          mailingAddress: foundMailing,
          contactSummary: customContactInfo.trim() || null,
          financials,
        }),
      })

      const draft = await response.json()
      if (!response.ok) {
        throw new Error(draft.error || 'Could not compile note.')
      }

      upsertAgentNote({
        id: `note-${prop.id}-${Date.now()}`,
        propertyId: prop.id,
        address: draft.address || prop.address,
        borough: prop.borough,
        zip: prop.zip,
        ownerName: draft.ownerName,
        contactInfo: draft.contactInfo,
        propertyDescription: draft.propertyDescription,
        motivatingFactor: draft.motivatingFactor,
        score: prop.score ?? 85,
        category: prop.category ?? null,
        aiGenerated: true,
        modelUsed: draft.model || 'LeadFlow AI',
        createdAt: new Date().toISOString(),
      })

      setCustomOwnerName('')
      setCustomContactInfo('')
      setShowGenerator(false)
      setNotes(loadAgentNotes())
    } catch (error) {
      setCompileError(error instanceof Error ? error.message : 'Unable to generate AI log entry.')
    } finally {
      setCompiling(false)
    }
  }

  function startEdit(entry: AgentNoteEntry) {
    setEditingId(entry.id)
    setEditDraft({
      ownerName: entry.ownerName,
      contactInfo: entry.contactInfo,
      propertyDescription: entry.propertyDescription,
      motivatingFactor: entry.motivatingFactor,
    })
  }

  function saveEdit(id: string) {
    const next = updateAgentNoteById(id, editDraft)
    setNotes(next)
    setEditingId(null)
    setEditDraft({})
  }

  function removeNote(id: string) {
    setNotes(deleteAgentNoteById(id))
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-14">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-[#176b4d]">
            Research Log · AI Compiled
          </p>
          <h1 className="font-serif text-3xl font-black italic tracking-tight text-[#172b2a] sm:text-4xl">
            Agent Notes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Structured AI log of off-market properties once an owner is found — including address, owner name, contact info, property brief, and motivating factor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {notes.length > 0 && (
            <button
              type="button"
              onClick={() => exportAgentNotesCsv(filteredNotes)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-[#172b2a] shadow-xs transition hover:bg-slate-50"
            >
              <Download className="size-3.5 text-[#176b4d]" />
              <span>Export Log CSV</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowGenerator((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-[#176b4d] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#12543d]"
          >
            <Sparkles className="size-3.5" />
            <span>{showGenerator ? 'Close AI Compiler' : 'AI Add Property Note'}</span>
          </button>
        </div>
      </div>

      {/* AI Auto-Compile Panel */}
      {showGenerator && (
        <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#176b4d]">
                <Sparkles className="size-3.5" />
                AI Agent Note Builder
              </p>
              <h2 className="mt-1 text-lg font-black text-[#172b2a]">
                Compile Property, Owner &amp; Motivation Log with AI
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Choose a researched property (or add any newly found owner phone/email) and AI will structure the full log entry.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowGenerator(false)}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {knownProperties.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-[#f7f8f6] p-6 text-center text-xs text-slate-500">
              No saved or viewed properties in this workspace yet. Visit{' '}
              <Link href="/dashboard" className="font-bold text-[#176b4d] underline">
                Daily Overview
              </Link>{' '}
              or{' '}
              <Link href="/dashboard/leads" className="font-bold text-[#176b4d] underline">
                Explore Properties
              </Link>{' '}
              and click <strong>Find Owner</strong> to log properties automatically.
            </div>
          ) : (
            <form onSubmit={compileWithAi} className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600">
                  Researched / Watchlist Property
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs font-bold text-[#172b2a] outline-none focus:border-[#176b4d] focus:bg-white"
                  >
                    {knownProperties.map((prop) => (
                      <option key={prop.id} value={prop.id}>
                        {prop.address} · {prop.borough} {prop.score ? `(Score ${prop.score})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-xs font-bold text-slate-600">
                Owner Name (Optional — AI checks NYC records if blank)
                <input
                  type="text"
                  value={customOwnerName}
                  onChange={(e) => setCustomOwnerName(e.target.value)}
                  placeholder="e.g. Eleanor Vance or Vance Realty LLC"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#176b4d] focus:bg-white"
                />
              </label>

              <label className="block text-xs font-bold text-slate-600">
                Found Phone / Email / Contact Info (Optional)
                <input
                  type="text"
                  value={customContactInfo}
                  onChange={(e) => setCustomContactInfo(e.target.value)}
                  placeholder="e.g. (718) 555-0142 · mailing address"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-[#176b4d] focus:bg-white"
                />
              </label>

              {compileError && (
                <p role="alert" className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  {compileError}
                </p>
              )}

              <div className="md:col-span-2 flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={compiling || !selectedPropertyId}
                  className="flex items-center gap-2 rounded-xl bg-[#172b2a] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#176b4d] disabled:opacity-50"
                >
                  {compiling ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>AI Compiling Entry...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5 text-emerald-300" />
                      <span>Compile &amp; Save to Agent Notes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs sm:grid-cols-12">
        <div className="relative sm:col-span-8">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes by address, owner name, phone, property details, or motivating factor..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 outline-none focus:border-[#176b4d] focus:bg-white"
          />
        </div>
        <div className="sm:col-span-4">
          <select
            value={boroughFilter}
            onChange={(e) => setBoroughFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs font-bold text-[#172b2a] outline-none focus:border-[#176b4d] focus:bg-white"
          >
            <option value="All">All Boroughs ({notes.length})</option>
            {['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'].map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Agent Notes Log List */}
      {filteredNotes.length === 0 ? (
        <div className="space-y-4 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#edf7f2] text-[#176b4d]">
            <NotebookPen className="size-7" />
          </div>
          <div className="mx-auto max-w-lg space-y-1.5">
            <h2 className="font-serif text-xl font-bold italic text-[#172b2a]">No Agent Notes Logged Yet</h2>
            <p className="text-xs leading-relaxed text-slate-500">
              Open any property report, click <strong>Find Owner</strong> to retrieve the recorded owner and contact details, and click{' '}
              <strong>AI Save to Agent Notes</strong> — AI will automatically log the address, owner name, contact info, brief property description, and motivating factor here.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowGenerator(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#176b4d] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#12543d]"
            >
              <Plus className="size-3.5" />
              <span>AI Add Property Note</span>
            </button>
            <Link
              href="/dashboard/watchlist"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-[#172b2a] hover:bg-slate-50"
            >
              Go to Watchlist →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotes.map((entry) => {
            const isEditing = editingId === entry.id

            return (
              <article
                key={entry.id}
                className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition hover:shadow-md"
              >
                {/* Header bar with Address & Metadata */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-[#f7f8f6] px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl bg-[#172b2a] p-2.5 text-white">
                      <Building2 className="size-4 text-[#8edbb8]" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-serif text-lg font-black italic text-[#172b2a]">
                          {entry.address}
                        </h2>
                        {entry.score != null && (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-[#176b4d]">
                            Score {entry.score}
                          </span>
                        )}
                        {entry.category && (
                          <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 border border-slate-200">
                            {entry.category}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3 text-[#176b4d]" />
                          {entry.borough}
                        </span>
                        <span>•</span>
                        <span>Logged {new Date(entry.createdAt).toLocaleString()}</span>
                        {entry.aiGenerated && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-[#176b4d]">
                              <Sparkles className="size-3" />
                              AI Compiled ({entry.modelUsed || 'LeadFlow AI'})
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.propertyId && (
                      <Link
                        href={`/dashboard/properties/${encodeURIComponent(entry.propertyId)}`}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#172b2a] hover:bg-slate-50"
                      >
                        <span>Property Report</span>
                        <ChevronRight className="size-3.5" />
                      </Link>
                    )}

                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveEdit(entry.id)}
                          className="flex items-center gap-1 rounded-xl bg-[#176b4d] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#12543d]"
                        >
                          <Check className="size-3.5" />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(entry)}
                          className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 hover:text-[#172b2a]"
                          title="Edit note"
                        >
                          <Edit3 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeNote(entry.id)}
                          className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          title="Delete note"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 4 Core Structured Columns */}
                <div className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-4">
                  {/* 1. Owner Name */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <User className="size-3 text-[#176b4d]" />
                      Owner Name
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editDraft.ownerName || ''}
                        onChange={(e) => setEditDraft((d) => ({ ...d, ownerName: e.target.value }))}
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-[#172b2a] outline-none focus:border-[#176b4d]"
                      />
                    ) : (
                      <p className="mt-1.5 text-sm font-black text-[#172b2a]">{entry.ownerName}</p>
                    )}
                  </div>

                  {/* 2. Contact Info */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <Phone className="size-3 text-[#176b4d]" />
                      Contact Info
                    </span>
                    {isEditing ? (
                      <textarea
                        rows={3}
                        value={editDraft.contactInfo || ''}
                        onChange={(e) => setEditDraft((d) => ({ ...d, contactInfo: e.target.value }))}
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-[#176b4d]"
                      />
                    ) : (
                      <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-800 break-words">
                        {entry.contactInfo}
                      </p>
                    )}
                  </div>

                  {/* 3. Brief Property Description */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <FileText className="size-3 text-[#176b4d]" />
                      Property Description
                    </span>
                    {isEditing ? (
                      <textarea
                        rows={3}
                        value={editDraft.propertyDescription || ''}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, propertyDescription: e.target.value }))
                        }
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-[#176b4d]"
                      />
                    ) : (
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                        {entry.propertyDescription}
                      </p>
                    )}
                  </div>

                  {/* 4. Motivating Factor */}
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5">
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#176b4d]">
                      <Sparkles className="size-3" />
                      Motivating Factor
                    </span>
                    {isEditing ? (
                      <textarea
                        rows={3}
                        value={editDraft.motivatingFactor || ''}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, motivatingFactor: e.target.value }))
                        }
                        className="mt-2 w-full rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-[#176b4d]"
                      />
                    ) : (
                      <p className="mt-1.5 text-xs font-semibold leading-relaxed text-[#172b2a]">
                        {entry.motivatingFactor}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
