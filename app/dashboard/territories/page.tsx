'use client'

import { Building2, Check, MapPin, Plus, Trash2, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Agent { id: string; name: string; email: string; territories: string[] }
interface PipelineLead { assignedTo?: string }
const defaultAgents: Agent[] = [
  { id: 'alex', name: 'Alex Morgan', email: 'alex@leadflow.local', territories: ['Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island'] },
  { id: 'maya', name: 'Maya Chen', email: 'maya@leadflow.local', territories: ['Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island'] },
]
const boroughs = ['Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island']

export default function TerritoriesPage() {
  const [agents, setAgents] = useState<Agent[]>(defaultAgents)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saved, setSaved] = useState(false)
  const [workloads, setWorkloads] = useState<Record<string, number>>({})

  useEffect(() => {
    try { const value = JSON.parse(localStorage.getItem('leadflow-brokerage-team') || 'null'); if (value) setAgents(value) } catch {}
    try {
      const leads = JSON.parse(localStorage.getItem('leadflow-crm-leads') || '[]') as PipelineLead[]
      const counts: Record<string, number> = {}
      leads.forEach((lead) => { if (lead.assignedTo) counts[lead.assignedTo] = (counts[lead.assignedTo] || 0) + 1 })
      setWorkloads(counts)
    } catch {}
  }, [])

  function save(next: Agent[]) { setAgents(next); localStorage.setItem('leadflow-brokerage-team', JSON.stringify(next)); setSaved(true); setTimeout(() => setSaved(false), 1800) }
  function toggleTerritory(id: string, territory: string) { save(agents.map((agent) => agent.id === id ? { ...agent, territories: agent.territories.includes(territory) ? agent.territories.filter((item) => item !== territory) : [...agent.territories, territory] } : agent)) }
  function addAgent() { if (!name.trim()) return; save([...agents, { id: `${Date.now()}`, name: name.trim(), email: email.trim() || `${name.toLowerCase().replace(/[^a-z]/g, '.')}@leadflow.local`, territories: [] }]); setName(''); setEmail('') }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#176b4d]">
            Brokerage Operations
          </p>
          <h1 className="text-3xl font-black tracking-tight text-[#172b2a] sm:text-4xl">
            Territories & Team
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Assign NYC boroughs, distribute automatically delivered opportunities, and see coverage across all 5 boroughs.
          </p>
        </div>
        {saved && (
          <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 border border-emerald-200">
            <Check className="size-4" />
            Changes saved
          </span>
        )}
      </div>

      {/* Borough Coverage Strip */}
      <div className="grid gap-3 sm:grid-cols-5">
        {boroughs.map((borough) => {
          const owners = agents.filter((agent) => agent.territories.includes(borough))
          return (
            <div key={borough} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <MapPin className="size-4 text-[#176b4d]" />
                <span className={`size-2 rounded-full ${owners.length ? 'bg-emerald-500' : 'bg-rose-400'}`} />
              </div>
              <p className="mt-3 font-black text-[#172b2a]">{borough}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {owners.length ? `${owners.length} active agent${owners.length === 1 ? '' : 's'}` : 'Uncovered'}
              </p>
            </div>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        {/* Agents List */}
        <section className="space-y-4">
          {agents.map((agent) => (
            <article key={agent.id} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-[#edf7f2] font-bold text-[#176b4d]">
                    <UserRound className="size-5" />
                  </div>
                  <div>
                    <h2 className="font-black text-[#172b2a]">{agent.name}</h2>
                    <p className="text-xs text-slate-500">{agent.email}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#176b4d]">
                      {workloads[agent.name] || 0} Assigned Opportunities
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => save(agents.filter((item) => item.id !== agent.id))}
                  aria-label={`Remove ${agent.name}`}
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Assigned Territories
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {boroughs.map((borough) => {
                  const active = agent.territories.includes(borough)
                  return (
                    <button
                      key={borough}
                      onClick={() => toggleTerritory(agent.id, borough)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                        active
                          ? 'border-[#176b4d] bg-[#176b4d] text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <MapPin className="size-3" />
                      {borough}
                    </button>
                  )
                })}
              </div>
            </article>
          ))}
        </section>

        {/* Add Team Member Card */}
        <aside className="rounded-2xl bg-[#172b2a] p-6 text-white shadow-xl">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="rounded-xl border border-white/10 bg-white/10 p-2 text-[#8edbb8]">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8edbb8]">Add team member</p>
              <h2 className="text-base font-black text-white">Brokerage agent</h2>
            </div>
          </div>

          <label className="mt-5 block text-xs font-bold uppercase tracking-wider text-white/70">
            Agent Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#8edbb8] focus:bg-white/10"
              placeholder="e.g. David Vance"
            />
          </label>

          <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-white/70">
            Email Address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#8edbb8] focus:bg-white/10"
              placeholder="agent@brokerage.com"
            />
          </label>

          <button
            onClick={addAgent}
            disabled={!name.trim()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#8edbb8] py-3 text-sm font-bold text-[#172b2a] transition hover:bg-white disabled:opacity-40"
          >
            <Plus className="size-4" />
            Add Team Member
          </button>
        </aside>
      </div>
    </div>
  )
}
