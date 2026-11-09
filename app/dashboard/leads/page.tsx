'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { LeadDrawer } from '@/components/crm/lead-drawer'

interface Lead {
  id: string
  address: string
  city: string
  state: string
  zip: string
  stage: string
  propertyType: string
  price: number | null
  beds: number | null
  baths: number | null
  aiTranscript: string | null
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([
    {
      id: '1',
      address: '123 Main St, Brooklyn, NY 11201',
      city: 'Brooklyn',
      state: 'NY',
      zip: '11201',
      stage: 'ingested',
      propertyType: 'Multi-family',
      price: 750000,
      beds: 4,
      baths: 2,
      aiTranscript: null,
    },
    {
      id: '2',
      address: '456 Ocean Ave, Queens, NY 11101',
      city: 'Queens',
      state: 'NY',
      zip: '11101',
      stage: 'ai_dialing',
      propertyType: 'Single-family',
      price: 850000,
      beds: 3,
      baths: 2,
      aiTranscript: 'Seller mentioned they are motivated to sell quickly.',
    },
    {
      id: '3',
      address: '789 Park Pl, Manhattan, NY 10025',
      city: 'Manhattan',
      state: 'NY',
      zip: '10025',
      stage: 'qualified',
      propertyType: 'Condo',
      price: 1200000,
      beds: 2,
      baths: 2,
      aiTranscript: 'Owner interested in cash offer, flexible on closing date.',
    },
    {
      id: '4',
      address: '321 Broadway, Bronx, NY 10451',
      city: 'Bronx',
      state: 'NY',
      zip: '10451',
      stage: 'appointment_scheduled',
      propertyType: 'Townhouse',
      price: 650000,
      beds: 3,
      baths: 2.5,
      aiTranscript: 'Scheduled appointment for tomorrow at 2 PM.',
    },
    {
      id: '5',
      address: '654 Lexington Ave, Brooklyn, NY 11238',
      city: 'Brooklyn',
      state: 'NY',
      zip: '11238',
      stage: 'under_contract',
      propertyType: 'Multi-family',
      price: 950000,
      beds: 5,
      baths: 3,
      aiTranscript: 'Contract signed, closing in 30 days.',
    },
  ])

  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null)

  const stages = [
    { id: 'ingested', name: 'Ingested', color: 'bg-blue-100' },
    { id: 'ai_dialing', name: 'AI Dialing', color: 'bg-purple-100' },
    { id: 'qualified', name: 'Qualified', color: 'bg-green-100' },
    { id: 'appointment_scheduled', name: 'Appointment Scheduled', color: 'bg-cyan-100' },
    { id: 'under_contract', name: 'Under Contract', color: 'bg-emerald-100' },
  ]

  const leadsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = leads.filter((l) => l.stage === stage.id)
    return acc
  }, {} as Record<string, typeof leads>)

  const updateLeadStage = (id: string, stage: string) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)))
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#10243b]">Leads Dashboard</h1>
          <p className="text-[#5c6a79] mt-1">Manage your real estate leads in one place</p>
        </div>
        <Link href="/dashboard/leads/new">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#ff6b4a] text-white rounded-lg hover:bg-[#e8563c] transition-colors">
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 h-[calc(100vh-14rem)] overflow-y-auto">
        {stages.map((stage) => (
          <div key={stage.id} className="bg-[#f6f2ea]/30 rounded-xl p-4 min-w-0 flex flex-col">
            <div className={`mb-4 pb-2 border-b border-coral-100 ${stage.color} rounded`} style={{ paddingBottom: '8px' }}>
              <h3 className="font-semibold text-[#10243b] text-sm uppercase tracking-wider">
                {stage.name}
              </h3>
              <span className="text-2xl font-bold text-[#10243b]">{leadsByStage[stage.id]?.length || 0}</span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
              {leadsByStage[stage.id]?.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setDrawerLeadId(lead.id)}
                  className="bg-white rounded-xl p-4 shadow border border-coral-100 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <h4 className="font-medium text-[#10243b]">{lead.address}</h4>
                  <p className="text-sm text-[#5c6a79] mt-1">{lead.propertyType}</p>
                  <div className="flex justify-between items-center mt-2">
                    {lead.price && (
                      <span className="text-sm font-medium text-[#ff6b4a]">
                        ${lead.price.toLocaleString()}
                      </span>
                    )}
                    <div className="flex gap-1">
                      {lead.beds && <span className="text-xs text-[#5c6a79]">{lead.beds} bd</span>}
                      {lead.baths && <span className="text-xs text-[#5c6a79]">{lead.baths} ba</span>}
                    </div>
                  </div>
                  {lead.aiTranscript && (
                    <div className="mt-2 p-2 bg-coral-50 rounded-lg text-xs text-[#5c6a79]">
                      {lead.aiTranscript.substring(0, 100)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {drawerLeadId && (
        <LeadDrawer
          leadId={drawerLeadId}
          onClose={() => setDrawerLeadId(null)}
          onUpdate={(id, stage) => {
            updateLeadStage(id, stage)
            setDrawerLeadId(null)
          }}
        />
      )}
    </div>
  )
}