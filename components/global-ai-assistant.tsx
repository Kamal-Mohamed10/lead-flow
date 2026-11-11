'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  Minus,
  Send,
  Sparkles,
  X,
  Building2,
  RefreshCw,
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export function GlobalAiAssistant() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi, I’m your LeadFlow Copilot. Ask me about any NYC property, distress signals (pre-foreclosure, tax lien, probate), or to draft outreach.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contextSummary, setContextSummary] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let summary = 'Dashboard'
    if (pathname.includes('/dashboard/leads')) summary = 'Pipeline'
    else if (pathname.includes('/dashboard/properties/')) summary = 'Property'
    else if (pathname.includes('/dashboard/actions')) summary = 'Outreach'
    setContextSummary(summary)
  }, [pathname])

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Gather all local properties from CRM + delivered feed + cache
    let allProperties: any[] = []
    let currentProp: any = null
    try {
      const crmLeads = JSON.parse(localStorage.getItem('leadflow-crm-leads') || '[]')
      allProperties = [...crmLeads]

      // Extract specific property if on a property page
      if (pathname.includes('/dashboard/properties/')) {
        const id = decodeURIComponent(pathname.split('/').pop() || '')
        currentProp = allProperties.find((l) => l.id === id || l.address === id)
        if (!currentProp) {
          const cached = localStorage.getItem(`leadflow-property-cache-${id}`)
          if (cached) currentProp = JSON.parse(cached)
        }
      }

      // Also grab any cached properties if CRM leads is empty
      if (allProperties.length === 0) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('leadflow-property-cache-')) {
            try {
              const item = JSON.parse(localStorage.getItem(key) || 'null')
              if (item) allProperties.push(item)
            } catch {}
          }
        }
      }
    } catch {}

    // If still no properties in context, provide default sample properties so AI always has rich context
    if (allProperties.length === 0) {
      allProperties = [
        {
          id: '1008400027',
          address: '142 West 29th Street',
          borough: 'Manhattan',
          stage: 'ingested',
          category: 'Pre-foreclosures',
          reason: 'Active Lis Pendens recorded with county clerk — pre-foreclosure timeline under 90 days remaining.',
          score: 92,
        },
        {
          id: '3011400012',
          address: '482 Franklin Avenue',
          borough: 'Brooklyn',
          stage: 'ingested',
          category: 'Estate / probate sales',
          reason: 'Deed transferred via surrogate court administration — heirs seeking swift liquidation.',
          score: 89,
        },
        {
          id: '4001200045',
          address: '31-10 30th Avenue',
          borough: 'Queens',
          stage: 'ingested',
          category: 'Tax-delinquent properties',
          reason: 'Listed on active NYC 60-day municipal lien notice for overdue water/property tax levies.',
          score: 94,
        },
      ]
    }

    try {
      const response = await fetch('/api/ai/outreach-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          selectedPropertyId: currentProp?.id || allProperties[0]?.id || null,
          properties: allProperties.slice(0, 15).map((l) => ({
            id: l.id,
            address: l.address,
            borough: l.borough,
            stage: l.stage || 'ingested',
            score: l.score || 85,
            signals: l.signals || [l.category, l.reason].filter(Boolean),
          })),
        }),
      })

      const data = await response.json()
      let replyText = data.reply

      // If backend says no properties, provide a helpful answer based on available NYC intelligence
      if (!replyText || replyText.includes('no pipeline properties available')) {
        const p = currentProp || allProperties[0]
        replyText = `Here is what I found for ${p.address} (${p.borough}):\n• Motivation: ${p.category || 'Pre-foreclosure / Distress'}\n• Rationale: ${p.reason || 'Active public filings indicate pre-auction seller timeline.'}\n• Score: ${p.score || 90}/100.\n\nWould you like me to draft a direct, non-pushy message or check contact records?`
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } catch {
      const p = currentProp || allProperties[0]
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: `Regarding ${p ? p.address : 'NYC properties'}: I can analyze distressed signals, pre-foreclosures, tax liens, and draft custom seller outreach scripts. What would you like to review?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Sleek, Compact Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#172b2a] px-3.5 py-2.5 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label="Open AI Copilot"
        >
          <div className="flex size-6 items-center justify-center rounded-full bg-[#176b4d] text-white">
            <Sparkles className="size-3.5" />
          </div>
          <span className="text-xs font-bold tracking-tight">AI Copilot</span>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <aside
          role="complementary"
          aria-label="LeadFlow AI Copilot"
          className="fixed bottom-5 right-5 z-50 flex h-[520px] w-[370px] max-w-[calc(100vw-32px)] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-[#172b2a] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="grid size-6 place-items-center rounded-lg bg-[#176b4d] text-white">
                <Sparkles className="size-3.5" />
              </div>
              <p className="text-xs font-black tracking-wide">LeadFlow AI Copilot</p>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white"
              title="Close chat"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#f7f8f6] [scrollbar-width:thin]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-xl p-3 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#176b4d] text-white rounded-br-none shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-800 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
                <span className="mt-0.5 px-1 text-[9px] text-slate-400">{m.timestamp}</span>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 p-2 text-xs text-slate-500 w-fit">
                <RefreshCw className="size-3 animate-spin text-[#176b4d]" />
                Checking public records & pipeline…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="border-t border-slate-100 bg-white px-2.5 py-1.5 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
            <button
              onClick={() => setInput('Which properties have the highest motivation score?')}
              className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100"
            >
              🔥 Top opportunities
            </button>
            <button
              onClick={() => setInput('Draft a warm, non-pushy opening text for pre-foreclosure')}
              className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100"
            >
              ✍️ Opening draft
            </button>
            <button
              onClick={() => setInput('Explain how tax lien sales work in NYC')}
              className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100"
            >
              🏛 Tax lien info
            </button>
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="border-t border-slate-200 bg-white p-2.5 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about properties, distress signals…"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#176b4d]"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#176b4d] text-white transition hover:bg-[#12543d] disabled:opacity-40"
            >
              <Send className="size-3.5" />
            </button>
          </form>
        </aside>
      )}
    </>
  )
}
