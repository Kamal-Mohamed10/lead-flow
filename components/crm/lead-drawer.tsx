'use client'

import { useEffect, useState } from 'react'
import { X, FileAudio, Play, Pause, Activity, List } from 'lucide-react'

interface LeadDrawerProps {
  leadId: string
  onClose: () => void
  onUpdate: (id: string, stage: string) => void
}

export function LeadDrawer({ leadId, onClose, onUpdate }: LeadDrawerProps) {
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    loadLead()
  }, [leadId])

  async function loadLead() {
    setLoading(true)
    try {
      const res = await fetch('/api/leads')
      const leads = await res.json()
      const found = leads.find((l: any) => l.id === leadId)
      if (found) setLead(found)
    } catch (error) {
      console.error('Failed to load lead:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full md:w-[500px] bg-white shadow-2xl flex flex-col transform overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-coral-100">
          <h2 className="text-xl font-bold text-[#10243b]">Lead Details</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-coral-50 text-[#5c6a79] hover:text-[#ff6b4a]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-semibold text-[#10243b]">{lead.address}</h3>
                <p className="text-[#5c6a79]">{lead.city}, {lead.state} {lead.zip}</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStageColor(lead.stage)}`}>
                <span className="w-2 h-2 rounded-full bg-current"></span>
                {lead.stage.replace('_', ' ')}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-coral-50 border border-coral-100">
                <p className="text-xs text-[#5c6a79]">Property Type</p>
                <p className="font-medium text-[#10243b]">{lead.propertyType}</p>
              </div>
              <div className="p-3 rounded-xl bg-coral-50 border border-coral-100">
                <p className="text-xs text-[#5c6a79]">Price</p>
                <p className="font-medium text-[#10243b]">${lead.price?.toLocaleString() || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-xl bg-coral-50 border border-coral-100">
                <p className="text-xs text-[#5c6a79]">Beds</p>
                <p className="font-medium text-[#10243b]">{lead.beds}</p>
              </div>
              <div className="p-3 rounded-xl bg-coral-50 border border-coral-100">
                <p className="text-xs text-[#5c6a79]">Baths</p>
                <p className="font-medium text-[#10243b]">{lead.baths}</p>
              </div>
            </div>
          </div>
          {lead.aiTranscript && (
            <div className="border border-coral-100 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-coral-100 bg-coral-50">
                <h4 className="font-semibold text-[#10243b] text-sm">
                  <Activity className="w-4 h-4 mr-2" /> AI Transcript
                </h4>
              </div>
              <div className="p-3">
                <p className="text-sm text-[#5c6a79] whitespace-pre-wrap">{lead.aiTranscript}</p>
              </div>
            </div>
          )}
          {lead.callRecordingUrl && (
            <div className="border border-coral-100 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-coral-100 bg-coral-50">
                <h4 className="font-semibold text-[#10243b] text-sm">
                  <FileAudio className="w-4 h-4 mr-2" /> Call Recording
                </h4>
              </div>
              <div className="p-4">
                <button onClick={toggleAudio} className="flex items-center gap-2 p-2 rounded-lg hover:bg-coral-50 text-[#5c6a79]">
                  {isPlaying ? <Pause className="w-5 h-5 text-[#ff6b4a]" /> : <Play className="w-5 h-5 text-[#ff6b4a]" />}
                </button>
              </div>
            </div>
          )}
          {lead.dobViolations && lead.dobViolations.length > 0 && (
            <div className="border border-red-100 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-red-100 bg-red-50">
                <h4 className="font-semibold text-[#10243b] text-sm">
                  <List className="w-4 h-4 mr-2" /> DOB Violations
                </h4>
              </div>
              <div className="p-3">
                <ul className="space-y-2">
                  {lead.dobViolations.map((v: any, idx: number) => (
                    <li key={idx} className="p-2 rounded-lg bg-red-50 border border-red-100 text-sm">
                      <p className="font-medium text-[#10243b]">{v.violation_code}</p>
                      <p className="text-xs text-[#5c6a79]">{v.violation_description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <div className="border border-coral-100 rounded-xl p-4">
            <label className="block text-sm font-medium text-[#5c6a79] mb-2">Manual Contact Notes</label>
            <textarea rows={4} className="w-full p-3 rounded-lg border border-coral-200 focus:outline-none focus:ring-2 focus:ring-[#ff6b4a]" />
            <button className="mt-3 px-4 py-2 rounded-lg bg-[#ff6b4a] text-white text-sm font-medium hover:shadow-lg">Save Note</button>
          </div>
        </div>
        <div className="p-6 border-t border-coral-100 flex justify-end">
          <button onClick={() => { onUpdate(lead.id, 'qualified'); onClose() }} className="px-6 py-2 rounded-lg bg-[#10243b] text-white hover:bg-[#10243b]/90">
            Mark as Qualified
          </button>
        </div>
      </div>
    </div>
  )
}

function getStageColor(stage: string) {
  const colors: Record<string, string> = {
    ingested: 'bg-blue-100 text-blue-600',
    ai_dialing: 'bg-purple-100 text-purple-600',
    qualified: 'bg-green-100 text-green-600',
    appointment_scheduled: 'bg-cyan-100 text-cyan-600',
    under_contract: 'bg-emerald-100 text-emerald-600',
  }
  return colors[stage] || 'bg-gray-100 text-gray-600'
}
