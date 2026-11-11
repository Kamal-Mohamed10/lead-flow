'use client'

import { CalendarDays, CheckCircle2, Mail, MessageSquareText, Phone, Send, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Note { id: string; text: string; property: string; createdAt: string }
interface PipelineLead { id: string; address: string; borough: string; stage: string; assignedTo?: string; signals?: string[]; zip?: string; block?: string; lot?: string; units?: number; yearBuilt?: number | null; buildingClass?: string | null; score?: number; source?: string; isDemo?: boolean }
interface Activity { id: string; property: string; agent: string; channel: 'Direct mail' | 'Email' | 'Phone'; status: string; note: string; createdAt: string }
interface PropertyResearchReport { bbl: string; researchedAt: string; findings: Record<string, { status: string; headline: string; detail: string; evidence: string[] }>; sources: string[]; limitations: string[] }
type AssistantAction = { type: 'research_property' | 'research_owner' | 'research_contacts' | 'draft_outreach'; title: string; detail: string }
type AssistantPlan = { reply: string; propertyId: string | null; actions: AssistantAction[]; provider: string; warning?: string; requiresApproval: boolean }
interface AssistantResearchSummary { source: string; title: string; summary: string; details: string[] }
interface OwnerResearchData { ownerName: string | null; contacts: Array<{ name: string | null; role: string; mailingAddress: string | null; source: string }>; taxRecords: Array<{ owner: string | null; propertyAddress: string | null; taxYear: string | null; source: string }>; warning: string; sources: Record<string, string> }
interface ContactResearchData { contacts: Array<{ name: string | null; role: string; title: string | null; mailingAddress: string | null; phone: string | null; email: string | null; source: string; recordDate: string | null }>; publicChannels: Array<{ name: string | null; role: string; mailingAddress: string | null; phone: string | null; email: string | null; source: string }>; recommendedMailingAddress: string | null; recommendation: { headline: string; detail: string }; sourceChecks: Array<{ source: string; recordsFound: number; status: string }>; coverageNote: string; limitations: string[] }
interface AssistantResearchData { propertyReport?: PropertyResearchReport; ownerReport?: OwnerResearchData; contactReport?: ContactResearchData; errors: string[] }
interface AssistantPlanResponse { reply: string; propertyId: string | null; actions: AssistantAction[]; provider: string; warning?: string; requiresApproval: boolean; researchSummary?: AssistantResearchSummary[]; error?: string }
interface AssistantMessage { id: string; role: 'user' | 'assistant'; content: string; plan?: AssistantPlan; planStatus?: 'pending' | 'approved' | 'dismissed' | 'researched'; research?: AssistantResearchData }
interface SavedContactResearch { publicChannels?: Array<{ phone?: string | null; email?: string | null }>; recommendedMailingAddress?: string | null }

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function ActionsPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [agentName, setAgentName] = useState('your agent')
  const [leads, setLeads] = useState<PipelineLead[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [outreachProperty, setOutreachProperty] = useState('')
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([])
  const [assistantInput, setAssistantInput] = useState('')
  const [assistantBusy, setAssistantBusy] = useState(false)
  const [assistantError, setAssistantError] = useState('')

  useEffect(() => {
    queueMicrotask(() => {
      try { const saved = JSON.parse(localStorage.getItem('leadflow-voice-notes') || '[]'); setNotes(saved) } catch {}
      try {
        const savedLeads = JSON.parse(localStorage.getItem('leadflow-crm-leads') || '[]') as PipelineLead[]
        setLeads(savedLeads)
        setOutreachProperty(savedLeads[0]?.address || '')
      } catch {}
      try { const saved = JSON.parse(localStorage.getItem('leadflow-outreach') || '[]'); if (Array.isArray(saved)) setActivities(saved) } catch {}
      try {
        const currentAgent = localStorage.getItem('leadflow-user-name') || 'Demo Agent'
        setAgentName(currentAgent)
      } catch {
        setAgentName(localStorage.getItem('leadflow-user-name') || 'your agent')
      }
    })
  }, [])
  function saveActivities(next: Activity[]) { setActivities(next); localStorage.setItem('leadflow-outreach', JSON.stringify(next)) }
  async function sendAssistantMessage() {
    const message = assistantInput.trim()
    if (!message || assistantBusy) return
    const userMessage: AssistantMessage = { id: createLocalId('assistant-user'), role: 'user', content: message }
    const nextMessages = [...assistantMessages, userMessage]
    setAssistantMessages(nextMessages)
    setAssistantInput('')
    setAssistantError('')
    setAssistantBusy(true)
    try {
      const selectedLead = leads.find((lead) => lead.address === outreachProperty)
      const mentionedLead = leads.find((lead) =>
        typeof lead.address === 'string' &&
        lead.address.length > 0 &&
        message.toLowerCase().includes(lead.address.toLowerCase())
      )
      const contextLead = mentionedLead || selectedLead
      const pipelineProperties = leads
        .filter((lead) => lead && typeof lead.id === 'string' && lead.id.length > 0 && typeof lead.address === 'string' && lead.address.trim().length > 0)
        .slice(0, 50)
        .map((lead) => {
          const includeDetails = lead.id === contextLead?.id
          return {
            id: lead.id.slice(0, 80),
            address: lead.address.trim().slice(0, 200),
            borough: typeof lead.borough === 'string' ? lead.borough.slice(0, 80) : '',
            stage: typeof lead.stage === 'string' ? lead.stage.slice(0, 40) : 'unknown',
            ...(typeof lead.zip === 'string' ? { zip: lead.zip.slice(0, 20) } : {}),
            units: typeof lead.units === 'number' && Number.isFinite(lead.units) ? lead.units : null,
            yearBuilt: typeof lead.yearBuilt === 'number' && Number.isFinite(lead.yearBuilt) ? lead.yearBuilt : null,
            buildingClass: typeof lead.buildingClass === 'string' ? lead.buildingClass.slice(0, 80) : null,
            score: typeof lead.score === 'number' && Number.isFinite(lead.score) ? lead.score : null,
            signals: includeDetails && Array.isArray(lead.signals)
              ? lead.signals.filter((signal): signal is string => typeof signal === 'string').slice(0, 8).map((signal) => signal.slice(0, 180))
              : [],
            ...(includeDetails && typeof lead.source === 'string' ? { source: lead.source.slice(0, 160) } : {}),
          }
        })
      const response = await fetch('/api/ai/outreach-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: assistantMessages.slice(-8).map(({ role, content }) => ({
            role,
            content: content.slice(-1200),
          })),
          selectedPropertyId: contextLead?.id || null,
          properties: pipelineProperties,
        }),
      })
      const result = await response.json() as AssistantPlanResponse
      if (!response.ok) throw new Error(result.error || 'The assistant could not create a plan.')
      const assistantId = createLocalId('assistant')
      const readActions = result.actions.filter((action) => action.type.startsWith('research_'))
      const approvalActions = result.actions.filter((action) => !action.type.startsWith('research_'))
      setAssistantMessages((current) => [...current, {
        id: assistantId,
        role: 'assistant',
        content: result.reply,
        plan: { ...result, actions: approvalActions },
        planStatus: approvalActions.length ? 'pending' : undefined,
      }])
      if (readActions.length && result.propertyId) {
        const lead = leads.find((item) => item.id === result.propertyId)
        const research = lead ? await executeAssistantResearch(lead, readActions) : {
          errors: ['The matched pipeline property is no longer available.'],
        }
        const researchLead = lead || {
          id: result.propertyId,
          address: 'Selected property',
          borough: 'NYC',
          stage: 'unknown',
        }
        setAssistantMessages((current) => current.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                research,
                planStatus: approvalActions.length ? 'pending' : 'researched',
              }
            : item
        ))
        const researchSummary = summarizeResearchForAssistant(research, researchLead)
        if (researchSummary.length) {
          try {
            const summaryResponse = await fetch('/api/ai/outreach-assistant', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: 'Summarize these public-record research findings for the selected property.',
                history: [],
                selectedPropertyId: result.propertyId,
                properties: lead ? [{
                  id: lead.id,
                  address: lead.address,
                  borough: lead.borough,
                  stage: lead.stage,
                  signals: [],
                }] : [],
                researchSummary,
              }),
            })
            const summaryResult = await summaryResponse.json() as AssistantPlanResponse
            if (!summaryResponse.ok) throw new Error(summaryResult.error || 'The research summary could not be generated.')
            setAssistantMessages((current) => current.map((item) =>
              item.id === assistantId
                ? { ...item, content: `${result.reply}\n\n${summaryResult.reply}` }
                : item
            ))
          } catch (error) {
            const summaryError = error instanceof Error ? error.message : 'The research summary could not be generated.'
            setAssistantMessages((current) => current.map((item) =>
              item.id === assistantId
                ? { ...item, content: `${result.reply}\n\nI completed the public-record lookup, but could not generate a conversational summary: ${summaryError}` }
                : item
            ))
          }
        }
      }
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : 'The assistant could not respond.')
    } finally {
      setAssistantBusy(false)
    }
  }
  async function approveAssistantPlan(messageId: string) {
    const message = assistantMessages.find((item) => item.id === messageId)
    const plan = message?.plan
    const lead = plan?.propertyId ? leads.find((item) => item.id === plan.propertyId) : null
    if (!message || !plan || !lead || message.planStatus !== 'pending') return

    setAssistantBusy(true)
    setAssistantError('')
    try {
      let contactResearch: SavedContactResearch | null = null
      let draftActivity: Activity | null = null
      for (const action of plan.actions) {
        if (action.type === 'research_contacts') {
          if (!/^[1-5]\d{9}$/.test(lead.id)) {
            throw new Error(`Contact research for ${lead.address} needs a matched NYC parcel (BBL). No changes were saved.`)
          }
          const response = await fetch('/api/nyc/contact-research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bbl: lead.id }),
          })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error || 'Public contact research failed. No changes were saved.')
          contactResearch = result as SavedContactResearch
        } else if (action.type === 'draft_outreach') {
          if (!contactResearch) {
            try {
              contactResearch = JSON.parse(localStorage.getItem(`leadflow-contact-research-${lead.id}`) || 'null') as SavedContactResearch | null
            } catch {
              contactResearch = null
            }
          }
          const hasPhone = Boolean(contactResearch?.publicChannels?.some((contact) => contact.phone))
          const hasEmail = Boolean(contactResearch?.publicChannels?.some((contact) => contact.email))
          const channel: Activity['channel'] = hasEmail ? 'Email' : hasPhone ? 'Phone' : 'Direct mail'
          const response = await fetch('/api/ai/outreach-draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: lead.address,
              borough: lead.borough,
              agentName: lead.assignedTo || agentName,
              channel,
              hasPublicMailingAddress: Boolean(contactResearch?.recommendedMailingAddress),
              signals: lead.signals || [],
            }),
          })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error || 'Outreach draft generation failed. No changes were saved.')
          draftActivity = {
            id: createLocalId('assistant-draft'),
            property: lead.address,
            agent: lead.assignedTo || agentName,
            channel,
            status: 'Draft ready · not sent',
            note: `${result.subject ? `Subject: ${result.subject}\n\n` : ''}${result.message}\n\nBefore contact: ${result.nextStep}`,
            createdAt: new Date().toLocaleString(),
          }
        }
      }

      if (contactResearch) {
        localStorage.setItem(`leadflow-contact-research-${lead.id}`, JSON.stringify(contactResearch))
      }
      if (draftActivity) saveActivities([draftActivity, ...activities])
      setAssistantMessages((current) => current.map((item) =>
        item.id === messageId ? { ...item, planStatus: 'approved' } : item
      ))
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : 'The approved plan could not be completed.')
    } finally {
      setAssistantBusy(false)
    }
  }
  function dismissAssistantPlan(messageId: string) {
    setAssistantMessages((current) => current.map((item) =>
      item.id === messageId ? { ...item, planStatus: 'dismissed' } : item
    ))
  }
  async function executeAssistantResearch(lead: PipelineLead, actions: AssistantAction[]): Promise<AssistantResearchData> {
    const bbl = /^[1-5]\d{9}$/.test(lead.id) ? lead.id : null
    const results: AssistantResearchData = { errors: [] }
    const requests = actions
      .filter((action) => ['research_property', 'research_owner', 'research_contacts'].includes(action.type))
      .map(async (action) => {
        if (!bbl) {
          results.errors.push(`${action.title}: a matched 10-digit NYC BBL is required for public-record research.`)
          return
        }
        try {
          let response: Response
          if (action.type === 'research_property') {
            response = await fetch('/api/nyc/property-research', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bbl }),
            })
          } else if (action.type === 'research_owner') {
            response = await fetch(`/api/nyc/owner-enrichment?bbl=${encodeURIComponent(bbl)}`)
          } else {
            response = await fetch('/api/nyc/contact-research', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bbl }),
            })
          }
          const result: unknown = await response.json()
          if (!response.ok) {
            const errorMessage = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
              ? result.error
              : `HTTP ${response.status}`
            throw new Error(errorMessage)
          }
          if (action.type === 'research_property') {
            results.propertyReport = result as PropertyResearchReport
          } else if (action.type === 'research_owner') {
            results.ownerReport = result as OwnerResearchData
          } else {
            results.contactReport = result as ContactResearchData
          }
          try {
            const cacheKey = action.type === 'research_property'
              ? `leadflow-property-research-${bbl}`
              : action.type === 'research_owner'
                ? `leadflow-owner-research-${bbl}`
                : `leadflow-contact-research-${bbl}`
            localStorage.setItem(cacheKey, JSON.stringify(result))
          } catch {
            results.errors.push(`${action.title}: the results were received but could not be cached in this browser.`)
          }
        } catch (error) {
          results.errors.push(`${action.title}: ${error instanceof Error ? error.message : 'Public-record lookup failed.'}`)
        }
      })
    await Promise.all(requests)
    return results
  }
  function summarizeResearchForAssistant(data: AssistantResearchData, lead: PipelineLead): AssistantResearchSummary[] {
    const pipelineFacts = [
      `Stage: ${lead.stage}`,
      lead.score != null ? `Pipeline score: ${lead.score}` : null,
      lead.units != null ? `Units: ${lead.units}` : null,
      lead.yearBuilt != null ? `Year built: ${lead.yearBuilt}` : null,
      lead.buildingClass ? `Building class: ${lead.buildingClass}` : null,
      lead.zip ? `ZIP: ${lead.zip}` : null,
      lead.source ? `Pipeline source: ${lead.source}` : null,
      lead.signals?.length ? `Recorded pipeline signals: ${lead.signals.join(', ')}` : null,
    ].filter(Boolean)
    const summary: AssistantResearchSummary[] = [{
      source: 'Opportunity Pipeline',
      title: 'Existing pipeline context',
      summary: pipelineFacts.join('; ').slice(0, 600) || 'No additional pipeline details are recorded.',
      details: [],
    }]
    if (data.propertyReport) {
      for (const [key, finding] of Object.entries(data.propertyReport.findings)) {
        summary.push({
          source: (data.propertyReport.sources.join(', ') || 'NYC Open Data').slice(0, 120),
          title: `${key.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase())}: ${finding.headline} (${finding.status})`,
          summary: `${finding.headline} (${finding.status}).`,
          details: [],
        })
      }
      if (data.propertyReport.limitations.length) {
        summary.push({
          source: 'NYC public-record research limitations',
          title: 'Limitations',
          summary: data.propertyReport.limitations.slice(0, 5).join(' ').slice(0, 600),
          details: [],
        })
      }
    }
    if (data.ownerReport) {
      const ownerSources = Object.values(data.ownerReport.sources || {}).join('; ')
      summary.push({
        source: (ownerSources || 'NYC PLUTO, ACRIS, and DOF').slice(0, 120),
        title: 'Ownership and tax records',
        summary: `${data.ownerReport.ownerName ? 'A recorded owner candidate is available in the results panel; the name is not sent to the AI service. ' : 'No owner name was returned. '}${data.ownerReport.contacts.length} public recorded party/contact candidates and ${data.ownerReport.taxRecords.length} assessment records were found.`,
        details: data.ownerReport.taxRecords.slice(0, 3).map((record) => `Tax year ${record.taxYear || 'not listed'}.`),
      })
    }
    if (data.contactReport) {
      const hasPhone = data.contactReport.publicChannels.some((contact) => contact.phone)
      const hasEmail = data.contactReport.publicChannels.some((contact) => contact.email)
      summary.push({
        source: data.contactReport.sourceChecks.map((source) => source.source).join(', ').slice(0, 120),
        title: 'Public contact research',
        summary: `${data.contactReport.contacts.length} recorded contact candidates found. Public phone ${hasPhone ? 'field present' : 'not found'}; public email ${hasEmail ? 'field present' : 'not found'}; mailing address ${data.contactReport.recommendedMailingAddress ? 'candidate available' : 'not found'}. Direct contact details and names are withheld from the AI service and shown in the source panel.`,
        details: [
          data.contactReport.recommendation.headline,
          ...data.contactReport.sourceChecks.map((source) => `${source.source}: ${source.status}, ${source.recordsFound} records.`),
        ].slice(0, 8),
      })
    }
    for (const error of data.errors) {
      summary.push({ source: 'Research status', title: 'A source could not be checked', summary: error.slice(0, 600), details: [] })
    }
    return summary
  }
  return <div>
    <div className="mb-8"><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[#176b4d]">Agent workspace</p><h1 className="text-3xl font-black">Action plan &amp; outreach</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">Research properties, review AI-prepared outreach drafts, and revisit saved agent notes and outreach history.</p></div>
    <section className="mb-6 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
      <header className="bg-[#172b2a] p-5 text-white sm:p-6">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8edbb8]"><Sparkles className="size-4" />LeadFlow AI assistant</p>
        <h2 className="mt-2 text-xl font-black">Tell me what you want to do</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-white/65">Ask about condition, ownership, tax records, contacts, or pipeline context. I can check official NYC public records automatically; I’ll ask before saving outreach drafts, and I never send outreach.</p>
      </header>
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="mb-4 max-h-[440px] min-h-32 space-y-3 overflow-y-auto rounded-xl bg-[#f7f8f6] p-3" aria-live="polite">
            {assistantMessages.length ? assistantMessages.map((message) => <article key={message.id} className={`max-w-[95%] rounded-xl p-3 text-sm leading-6 ${message.role === 'user' ? 'ml-auto bg-[#176b4d] text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.plan?.warning && <p className="mt-2 text-xs text-amber-700">{message.plan.warning}</p>}
              {message.plan?.actions.length ? <div className="mt-3 rounded-lg border border-violet-100 bg-violet-50/70 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-violet-800">Proposed plan for {leads.find((lead) => lead.id === message.plan?.propertyId)?.address || 'selected property'}</p>
                <ul className="mt-2 space-y-2">{message.plan.actions.map((action, index) => <li key={`${action.type}-${index}`} className="text-xs leading-5 text-slate-700"><strong>{index + 1}. {action.title}</strong><br />{action.detail}</li>)}</ul>
                {message.planStatus === 'pending' && <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => approveAssistantPlan(message.id)} disabled={assistantBusy} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{assistantBusy ? 'Working on approved plan…' : 'Approve plan & save draft'}</button>
                  <button type="button" onClick={() => dismissAssistantPlan(message.id)} disabled={assistantBusy} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-50">Decline</button>
                </div>}
                {message.planStatus === 'approved' && <p className="mt-3 text-xs font-bold text-emerald-700">Approved work completed and saved. Nothing was sent.</p>}
                {message.planStatus === 'dismissed' && <p className="mt-3 text-xs font-semibold text-slate-500">Plan declined. No changes were made.</p>}
                {message.planStatus === 'researched' && <p className="mt-3 text-xs font-bold text-emerald-700">Read-only public-record research completed. No pipeline changes or outreach were made.</p>}
                  <p className="mt-2 text-[10px] text-slate-400">{message.plan.provider}</p>
                </div> : null}
                {message.research && <div className="mt-3 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-900">Live public-record research · {leads.find((lead) => lead.id === message.plan?.propertyId)?.address || 'selected property'}</p>
                  {(() => {
                    const context = leads.find((lead) => lead.id === message.plan?.propertyId)
                    if (!context) return null
                    return <div className="rounded-md bg-white p-3 text-xs text-slate-700">
                      <p className="font-bold text-slate-800">Existing Opportunity Pipeline context</p>
                      <p className="mt-1">Stage: {context.stage}{context.score != null ? ` · Score: ${context.score}` : ''}{context.units != null ? ` · Units: ${context.units}` : ''}{context.yearBuilt != null ? ` · Year built: ${context.yearBuilt}` : ''}{context.buildingClass ? ` · Building class: ${context.buildingClass}` : ''}{context.zip ? ` · ZIP: ${context.zip}` : ''}</p>
                      {context.signals?.length ? <p className="mt-1">Recorded signals: {context.signals.join(', ')}</p> : null}
                      {context.source ? <p className="mt-1 text-[10px] text-slate-500">Pipeline source: {context.source}</p> : null}
                    </div>
                  })()}
                  {message.research.propertyReport && <div className="rounded-md bg-white p-3">
                    <p className="text-xs font-bold text-slate-800">Property factors</p>
                    <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                      {Object.entries(message.research.propertyReport.findings).map(([key, finding]) => <div key={key} className="rounded border border-slate-100 p-2">
                        <dt className="text-[10px] font-bold uppercase text-slate-500">{key.replace(/[A-Z]/g, (letter) => ` ${letter}`)}</dt>
                        <dd className="text-xs font-semibold text-slate-800">{finding.headline} · {finding.status}</dd>
                        <dd className="mt-1 text-[11px] leading-4 text-slate-600">{finding.detail}</dd>
                        {finding.evidence.length > 0 && <dd className="mt-1 text-[10px] text-slate-500">{finding.evidence.slice(0, 3).join(' · ')}</dd>}
                      </div>)}
                    </dl>
                    <p className="mt-2 text-[10px] text-slate-500">Sources: {message.research.propertyReport.sources.join(', ')}</p>
                    {message.research.propertyReport.limitations.length > 0 && <p className="mt-1 text-[10px] leading-4 text-amber-800">Limitations: {message.research.propertyReport.limitations.join(' ')}</p>}
                  </div>}
                  {message.research.ownerReport && (() => {
                    const seenNames = new Set<string>()
                    const uniqueContacts = message.research.ownerReport.contacts.filter((c) => {
                      const name = (c.name || '').trim().toLowerCase()
                      if (!name || seenNames.has(name)) return false
                      seenNames.add(name)
                      return true
                    })
                    const uniqueTaxRecords = message.research.ownerReport.taxRecords.filter((t) => {
                      const name = (t.owner || '').trim().toLowerCase()
                      if (!name || seenNames.has(name)) return false
                      seenNames.add(name)
                      return true
                    })

                    return (
                      <div className="rounded-md bg-white p-3">
                        <p className="text-xs font-bold text-slate-800">Recorded ownership & tax candidates</p>
                        {message.research.ownerReport.ownerName && (
                          <p className="mt-1 text-xs text-slate-700">Primary owner: <strong>{message.research.ownerReport.ownerName}</strong></p>
                        )}
                        {uniqueContacts.map((contact, index) => (
                          <p key={`owner-contact-${index}`} className="mt-1.5 text-xs text-slate-700">
                            {contact.name} · {contact.role} {contact.mailingAddress ? `· ${contact.mailingAddress}` : ''} <span className="text-slate-400">({contact.source})</span>
                          </p>
                        ))}
                        {uniqueTaxRecords.map((record, index) => (
                          <p key={`tax-record-${index}`} className="mt-1.5 text-xs text-slate-700">
                            {record.owner} · Tax year {record.taxYear || 'Current'} <span className="text-slate-400">({record.source})</span>
                          </p>
                        ))}
                        <p className="mt-2 text-[10px] leading-4 text-amber-800">{message.research.ownerReport.warning}</p>
                      </div>
                    )
                  })()}
                  {message.research.contactReport && (() => {
                    const seenContacts = new Set<string>()
                    const dedupedContacts = message.research.contactReport.contacts.filter((c) => {
                      const key = `${(c.name || '').trim().toLowerCase()}-${(c.phone || '').trim()}-${(c.email || '').trim()}`
                      if (seenContacts.has(key)) return false
                      seenContacts.add(key)
                      return true
                    })

                    return (
                      <div className="rounded-md bg-white p-3">
                        <p className="text-xs font-bold text-slate-800">Public contact candidates</p>
                        {dedupedContacts.length ? dedupedContacts.map((contact, index) => (
                          <div key={`public-contact-${index}`} className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-700">
                            <p className="font-semibold">{contact.name || 'Recorded contact'} · {contact.role}{contact.title ? ` · ${contact.title}` : ''}</p>
                            <p>{contact.phone ? `Phone: ${contact.phone}` : 'No public phone'} · {contact.email ? `Email: ${contact.email}` : 'No public email'}</p>
                            {contact.mailingAddress && <p>{contact.mailingAddress} <span className="text-slate-400">({contact.source})</span></p>}
                          </div>
                        )) : <p className="mt-1 text-xs text-slate-600">No named contact candidates were returned.</p>}
                        <p className="mt-2 text-xs font-semibold text-violet-800">{message.research.contactReport.recommendation.headline}: {message.research.contactReport.recommendation.detail}</p>
                      </div>
                    )
                  })()}
                  {message.research.errors.length > 0 && <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                    <p className="font-bold">Some research checks did not complete</p>
                    <ul className="mt-1 list-disc pl-4">{message.research.errors.map((error, index) => <li key={`research-error-${index}`}>{error}</li>)}</ul>
                  </div>}
                </div>}
            </article>) : <div className="grid min-h-28 place-items-center px-4 text-center text-xs leading-5 text-slate-500"><p>Try: “I want to reach out to this property. Research the owner and prepare a draft for my approval.”</p></div>}
            {assistantBusy && <p className="text-xs font-semibold text-violet-700">LeadFlow is reviewing the request…</p>}
          </div>
          {assistantError && <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{assistantError}</p>}
          <form onSubmit={(event) => { event.preventDefault(); void sendAssistantMessage() }} className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="assistant-message">Message LeadFlow AI assistant</label>
            <input id="assistant-message" value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} maxLength={1200} placeholder="Tell me what you want done…" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400" />
            <button type="submit" disabled={!assistantInput.trim() || assistantBusy} className="flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><Send className="size-4" />Send</button>
          </form>
        </div>
        <aside className="rounded-xl border border-slate-200 p-4">
          <label className="block text-xs font-bold text-slate-500">Current property context<select value={outreachProperty} onChange={(event) => setOutreachProperty(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal text-[#172b2a] outline-none focus:border-violet-400"><option value="">Select pipeline property</option>{leads.map((lead) => <option key={lead.id} value={lead.address}>{lead.address} · {lead.borough}</option>)}</select></label>
          <div className="mt-4 rounded-lg bg-violet-50 p-3 text-xs leading-5 text-violet-900"><strong>Permission boundary</strong><br />Approving a plan allows public-record research and saving an internal draft. Sending, calling, or mailing is not available here and always requires a separate approval.</div>
          <p className="mt-3 text-[10px] leading-4 text-slate-400">AI plans are suggestions. Verify records, contact eligibility, and applicable outreach rules before acting.</p>
        </aside>
      </div>
    </section>

    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#176b4d]">Conversation history</p><h2 className="mt-1 text-lg font-black">Saved agent notes</h2></div><span className="text-xs font-bold text-slate-400">{notes.length} notes</span></div>
      <div className="space-y-3">{notes.length ? notes.map((note) => <article key={note.id} className="rounded-xl bg-[#f7f8f6] p-4"><p className="text-sm font-bold">{note.property}</p><p className="mt-2 text-sm leading-6 text-slate-600">{note.text}</p><p className="mt-2 text-[10px] text-slate-400">{note.createdAt}</p></article>) : <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">Saved agent notes will appear here.</p>}</div>
    </section>

    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#176b4d]">Outreach history</p><h2 className="mt-1 text-lg font-black">Agent outreach</h2></div><span className="rounded-full bg-[#edf7f2] px-3 py-1 text-xs font-bold text-[#176b4d]">{activities.length} activities</span></div>
        {activities.length ? <div className="mt-5 space-y-3">{activities.map((activity) => { const Icon = activity.channel === 'Direct mail' ? Mail : activity.channel === 'Email' ? MessageSquareText : Phone; return <article key={activity.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start gap-3"><div className="rounded-lg bg-[#edf7f2] p-2 text-[#176b4d]"><Icon className="size-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-black text-[#172b2a]">{activity.property}</h3><p className="mt-1 text-xs text-slate-500">{activity.agent || 'Unassigned agent'} · {activity.channel} · {activity.createdAt}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${activity.status === 'Do not contact' ? 'bg-red-50 text-red-600' : activity.status === 'Appointment booked' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{activity.status}</span></div>{activity.note && <p className="mt-3 text-sm leading-6 text-slate-600">{activity.note}</p>}</div></div></article>})}</div> : <div className="mt-5 grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-200 text-center"><div><CalendarDays className="mx-auto size-7 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-500">No outreach history yet</p><p className="mt-1 text-xs text-slate-400">AI-prepared drafts you approve will appear here. Nothing is sent automatically.</p></div></div>}
    </section>
    <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800"><CheckCircle2 className="size-5 shrink-0" /><span>Outreach tools are an agent workflow. Record consent, suppress do-not-contact requests, and follow applicable calling, texting, email, and commercial solicitation rules.</span></div>
  </div>
}
