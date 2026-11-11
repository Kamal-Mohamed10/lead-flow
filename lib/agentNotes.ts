export interface AgentNoteEntry {
  id: string
  propertyId: string
  address: string
  borough: string
  zip?: string
  ownerName: string
  contactInfo: string
  propertyDescription: string
  motivatingFactor: string
  score?: number | null
  category?: string | null
  aiGenerated: boolean
  modelUsed?: string
  createdAt: string
  updatedAt?: string
}

export const AGENT_NOTES_STORAGE_KEY = 'leadflow-agent-notes'
export const AGENT_NOTES_EVENT = 'leadflow-agent-notes-change'

export function loadAgentNotes(): AgentNoteEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(AGENT_NOTES_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as AgentNoteEntry[]) : []
  } catch {
    return []
  }
}

export function saveAgentNotes(entries: AgentNoteEntry[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(AGENT_NOTES_STORAGE_KEY, JSON.stringify(entries))
  window.dispatchEvent(new Event(AGENT_NOTES_EVENT))
}

export function upsertAgentNote(entry: AgentNoteEntry): AgentNoteEntry[] {
  const current = loadAgentNotes()
  const existingIdx = current.findIndex(
    (item) =>
      item.id === entry.id ||
      (entry.propertyId &&
        item.propertyId === entry.propertyId &&
        item.ownerName.trim().toLowerCase() === entry.ownerName.trim().toLowerCase())
  )

  let next: AgentNoteEntry[]
  if (existingIdx >= 0) {
    next = current.map((item, idx) =>
      idx === existingIdx
        ? { ...item, ...entry, id: item.id, updatedAt: new Date().toISOString() }
        : item
    )
  } else {
    next = [entry, ...current]
  }
  saveAgentNotes(next)
  return next
}

export function updateAgentNoteById(id: string, patch: Partial<AgentNoteEntry>): AgentNoteEntry[] {
  const next = loadAgentNotes().map((entry) =>
    entry.id === id ? { ...entry, ...patch, updatedAt: new Date().toISOString() } : entry
  )
  saveAgentNotes(next)
  return next
}

export function deleteAgentNoteById(id: string): AgentNoteEntry[] {
  const next = loadAgentNotes().filter((entry) => entry.id !== id)
  saveAgentNotes(next)
  return next
}

function escapeCsvField(value: string): string {
  const trimmed = value.replace(/\r?\n/g, ' ')
  return `"${trimmed.replace(/"/g, '""')}"`
}

export function exportAgentNotesCsv(entries: AgentNoteEntry[]) {
  const headers = [
    'Address',
    'Borough',
    'Owner Name',
    'Contact Info',
    'Property Description',
    'Motivating Factor',
    'Opportunity Score',
    'Category',
    'Logged At',
  ]
  const rows = entries.map((entry) =>
    [
      entry.address,
      entry.borough,
      entry.ownerName,
      entry.contactInfo,
      entry.propertyDescription,
      entry.motivatingFactor,
      entry.score ?? '',
      entry.category ?? '',
      new Date(entry.createdAt).toLocaleString(),
    ]
      .map((cell) => escapeCsvField(String(cell)))
      .join(',')
  )

  const csvContent = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `leadflow-agent-notes-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
