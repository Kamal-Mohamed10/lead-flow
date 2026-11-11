'use client'

import { useState, useSyncExternalStore } from 'react'
import { BellRing, Building2, MessageSquare, Send, UserRound } from 'lucide-react'

type AssignmentStatus = 'assigned' | 'in_progress' | 'update_requested' | 'needs_help' | 'complete'
type AssignmentNote = {
  id: string
  author: string
  role: 'admin' | 'agent'
  message: string
  kind: 'comment' | 'update_request' | 'agent_update'
  createdAt: string
}
type Lead = {
  id: string
  address: string
  borough: string
  stage: string
  score: number
  assignedTo?: string
  assignmentStatus?: AssignmentStatus
  assignmentNotes?: AssignmentNote[]
}
type TeamMember = { id: string; name: string; email?: string; territories?: string[] }

const leadStorageKey = 'leadflow-crm-leads'
const teamStorageKey = 'leadflow-brokerage-team'

const statusLabels: Record<AssignmentStatus, string> = {
  assigned: 'Assigned',
  in_progress: 'In progress',
  update_requested: 'Update requested',
  needs_help: 'Needs help',
  complete: 'Complete',
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

function getAssignmentSnapshot() {
  return JSON.stringify([
    localStorage.getItem(leadStorageKey) || '[]',
    localStorage.getItem(teamStorageKey) || '[]',
    localStorage.getItem('leadflow-workspace-mode') || 'agent',
  ])
}

function getServerAssignmentSnapshot() {
  return JSON.stringify(['[]', '[]', 'agent'])
}

function subscribeToAssignments(onChange: () => void) {
  window.addEventListener('leadflow-assignments-change', onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener('leadflow-assignments-change', onChange)
    window.removeEventListener('storage', onChange)
  }
}

function saveLeads(leads: Lead[]) {
  localStorage.setItem(leadStorageKey, JSON.stringify(leads))
  window.dispatchEvent(new Event('leadflow-assignments-change'))
}

export default function AssignmentsPage() {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const snapshot = useSyncExternalStore(subscribeToAssignments, getAssignmentSnapshot, getServerAssignmentSnapshot)
  const [leadsJson, teamJson, mode] = JSON.parse(snapshot) as [string, string, string]
  const leads = parseJson<Lead[]>(leadsJson, [])
  const team = parseJson<TeamMember[]>(teamJson, [])
  const isBrokerage = mode === 'brokerage'

  const assignedLeads = leads.filter((lead) => lead.assignedTo)

  function updateLead(id: string, change: Partial<Lead>, note?: AssignmentNote) {
    const updated = leads.map((lead) => lead.id === id
      ? { ...lead, ...change, assignmentNotes: note ? [...(lead.assignmentNotes || []), note] : lead.assignmentNotes }
      : lead)
    saveLeads(updated)
  }

  function addAdminNote(lead: Lead, kind: AssignmentNote['kind']) {
    const message = drafts[lead.id]?.trim()
    if (!message) return
    const note: AssignmentNote = {
      id: crypto.randomUUID(),
      author: localStorage.getItem('leadflow-user-name') || 'Brokerage admin',
      role: 'admin',
      message,
      kind,
      createdAt: new Date().toISOString(),
    }
    updateLead(lead.id, kind === 'update_request'
      ? { assignmentStatus: 'update_requested' }
      : {}, note)
    setDrafts((current) => ({ ...current, [lead.id]: '' }))
  }

  function assignLead(lead: Lead, name: string) {
    updateLead(lead.id, {
      assignedTo: name || undefined,
      assignmentStatus: name ? 'assigned' : undefined,
    })
  }

  if (!isBrokerage) {
    return <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <h1 className="text-xl font-black text-slate-950">Brokerage workspace required</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Team assignments are managed from a brokerage workspace. Switch workspace mode to continue.</p>
    </div>
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-7">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#176b4d]">Brokerage workspace</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Team assignments</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Assign pipeline properties, follow each agent’s progress, and leave a comment or request an update.
        </p>
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          Team assignments are currently saved in this browser only. They are not yet shared between separate agent accounts or devices.
        </p>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Assigned properties</p><p className="mt-1 text-2xl font-black text-slate-950">{assignedLeads.length}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Team members</p><p className="mt-1 text-2xl font-black text-slate-950">{team.length}</p></div>
        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-1"><p className="text-xs font-semibold text-slate-500">Updates requested</p><p className="mt-1 text-2xl font-black text-amber-600">{assignedLeads.filter((lead) => lead.assignmentStatus === 'update_requested').length}</p></div>
      </div>

      {assignedLeads.length === 0 && leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Building2 className="mx-auto size-8 text-slate-400" />
          <h2 className="mt-3 font-black text-slate-900">No pipeline properties yet</h2>
          <p className="mt-1 text-sm text-slate-500">Add opportunities to your pipeline before assigning them to the team.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => (
            <article key={lead.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-black text-slate-950">{lead.address}</h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{statusLabels[lead.assignmentStatus || 'assigned']}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{lead.borough} · Pipeline: {lead.stage.replace('_', ' ')} · Score {lead.score || '—'}</p>
                </div>
                <label className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-600">
                  <UserRound className="size-4 text-[#176b4d]" />
                  <span className="sr-only">Assign {lead.address}</span>
                  <select
                    value={lead.assignedTo || ''}
                    onChange={(event) => assignLead(lead, event.target.value)}
                    className="h-10 min-w-48 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#176b4d]"
                  >
                    <option value="">Unassigned</option>
                    {team.map((member) => <option key={member.id} value={member.name}>{member.name}</option>)}
                  </select>
                </label>
              </div>

              {lead.assignedTo && <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.2fr]">
                <section>
                  <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-700"><MessageSquare className="size-4 text-[#176b4d]" /> Assignment conversation</h3>
                  <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                    {(lead.assignmentNotes || []).length === 0
                      ? <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">No comments or updates yet.</p>
                      : lead.assignmentNotes?.map((note) => (
                        <div key={note.id} className={`rounded-xl p-3 ${note.kind === 'update_request' ? 'bg-amber-50' : note.role === 'agent' ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-black text-slate-800">{note.author}{note.kind === 'update_request' ? ' · Update requested' : ''}</span>
                            <time className="text-[10px] text-slate-400">{new Date(note.createdAt).toLocaleString()}</time>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-slate-700">{note.message}</p>
                        </div>
                      ))}
                  </div>
                </section>
                <section>
                  <label htmlFor={`comment-${lead.id}`} className="text-xs font-black uppercase tracking-wide text-slate-700">Message {lead.assignedTo}</label>
                  <textarea
                    id={`comment-${lead.id}`}
                    value={drafts[lead.id] || ''}
                    onChange={(event) => setDrafts((current) => ({ ...current, [lead.id]: event.target.value }))}
                    placeholder="Add context or ask the agent to follow up…"
                    rows={3}
                    className="mt-3 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#176b4d]"
                  />
                  <div className="mt-2 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => addAdminNote(lead, 'update_request')}
                      disabled={!drafts[lead.id]?.trim()}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-40"
                    ><BellRing className="size-3.5" /> Request update</button>
                    <button
                      type="button"
                      onClick={() => addAdminNote(lead, 'comment')}
                      disabled={!drafts[lead.id]?.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#176b4d] px-3 py-2 text-xs font-bold text-white hover:bg-[#12583f] disabled:opacity-40"
                    ><Send className="size-3.5" /> Send comment</button>
                  </div>
                </section>
              </div>}
              {!lead.assignedTo && <p className="p-5 text-xs text-slate-500">Choose a teammate above to create an assignment.</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
