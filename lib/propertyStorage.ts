export const CRM_LEADS_KEY = 'leadflow-crm-leads'
export const EXPLORED_CATALOG_KEY = 'leadflow-explored-catalog'
export const PRIORITY_QUEUE_CACHE_KEY = 'leadflow-priority-queue-cache'
export const WATCHLIST_UPDATED_EVENT = 'leadflow-watchlist-updated'

export const ACTIVE_WATCHLIST_STATUSES = [
  'watchlist',
  'vault',
  'contacted',
  'under_contract',
] as const

export const SAVED_PIPELINE_STATUSES = [
  ...ACTIVE_WATCHLIST_STATUSES,
  'closed',
] as const

export interface StoredPropertyShape {
  id: string
  address?: string
  stage?: string
  dealStatus?: string
}

export function isActiveWatchlistLead(lead: StoredPropertyShape): boolean {
  if (lead.dealStatus) {
    return (ACTIVE_WATCHLIST_STATUSES as readonly string[]).includes(lead.dealStatus)
  }
  return lead.stage === 'watchlist'
}

export function isSavedPipelineLead(lead: StoredPropertyShape): boolean {
  if (lead.dealStatus) {
    return (SAVED_PIPELINE_STATUSES as readonly string[]).includes(lead.dealStatus)
  }
  return lead.stage === 'watchlist'
}

export function dispatchWatchlistUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(WATCHLIST_UPDATED_EVENT))
  }
}

export function readSavedLeads<T extends StoredPropertyShape>(): T[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = JSON.parse(localStorage.getItem(CRM_LEADS_KEY) || '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter((item): item is T => Boolean(item && item.id) && isSavedPipelineLead(item))
  } catch {
    return []
  }
}

export function writeSavedLeads<T extends StoredPropertyShape>(leads: T[]): void {
  if (typeof window === 'undefined') return
  const sanitized = leads.filter((item) => Boolean(item && item.id) && isSavedPipelineLead(item))
  localStorage.setItem(CRM_LEADS_KEY, JSON.stringify(sanitized))
  dispatchWatchlistUpdated()
}

export function readExploredCatalog<T extends StoredPropertyShape>(): T[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = JSON.parse(localStorage.getItem(EXPLORED_CATALOG_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function writeExploredCatalog<T extends StoredPropertyShape>(leads: T[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(EXPLORED_CATALOG_KEY, JSON.stringify(leads))
}

export function syncDealStatusToSavedLeads<T extends StoredPropertyShape>(
  lead: T,
  nextStatus: string | undefined
): void {
  const saved = readSavedLeads<T>()
  const others = saved.filter((item) => item.id !== lead.id)
  if (nextStatus && (SAVED_PIPELINE_STATUSES as readonly string[]).includes(nextStatus)) {
    const updatedLead: T = {
      ...lead,
      dealStatus: nextStatus,
      stage: nextStatus === 'under_contract' ? 'under_contract' : nextStatus === 'watchlist' ? 'watchlist' : nextStatus,
    }
    writeSavedLeads([updatedLead, ...others])
  } else {
    writeSavedLeads(others)
  }
}

export function clearWatchlistStorage(): void {
  if (typeof window === 'undefined') return
  const saved = readSavedLeads<StoredPropertyShape>()
  const remaining = saved.filter((lead) => !isActiveWatchlistLead(lead))
  localStorage.setItem(CRM_LEADS_KEY, JSON.stringify(remaining))

  const explored = readExploredCatalog<StoredPropertyShape>()
  if (explored.length > 0) {
    const resetCatalog = explored.map((lead) =>
      isActiveWatchlistLead(lead) ? { ...lead, dealStatus: undefined, stage: 'explored' } : lead
    )
    localStorage.setItem(EXPLORED_CATALOG_KEY, JSON.stringify(resetCatalog))
  }
  dispatchWatchlistUpdated()
}

export function findStoredProperty<T extends StoredPropertyShape>(propertyId: string): T | null {
  if (typeof window === 'undefined') return null
  const saved = readSavedLeads<T>()
  const fromSaved = saved.find((l) => l.id === propertyId || l.address === propertyId)
  if (fromSaved) return fromSaved

  const explored = readExploredCatalog<T>()
  const fromExplored = explored.find((l) => l.id === propertyId || l.address === propertyId)
  if (fromExplored) return fromExplored

  try {
    const cached = localStorage.getItem(`leadflow-property-cache-${propertyId}`)
    if (cached) return JSON.parse(cached) as T
  } catch {}
  return null
}

export interface PriorityQueueCache<T extends StoredPropertyShape> {
  opportunities: T[]
  fetchedAt: string
  unlockTime: number
}

export function readPriorityQueueCache<T extends StoredPropertyShape>(): PriorityQueueCache<T> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = JSON.parse(localStorage.getItem(PRIORITY_QUEUE_CACHE_KEY) || 'null') as
      | Partial<PriorityQueueCache<T>>
      | null
    if (!raw || !Array.isArray(raw.opportunities) || raw.opportunities.length === 0) {
      return null
    }
    return {
      opportunities: raw.opportunities,
      fetchedAt: typeof raw.fetchedAt === 'string' ? raw.fetchedAt : '',
      unlockTime: typeof raw.unlockTime === 'number' ? raw.unlockTime : 0,
    }
  } catch {
    return null
  }
}

export function writePriorityQueueCache<T extends StoredPropertyShape>(
  opportunities: T[],
  fetchedAt: string,
  unlockTime = 0
): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      PRIORITY_QUEUE_CACHE_KEY,
      JSON.stringify({ opportunities, fetchedAt, unlockTime })
    )
  } catch {}
}

export function clearPriorityQueueCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PRIORITY_QUEUE_CACHE_KEY)
}

export interface DiscoveryBatchPayload {
  opportunities?: unknown[]
  source?: string
  message?: string | null
  error?: string
}

let inFlightPriorityPrefetch: Promise<DiscoveryBatchPayload | null> | null = null

export function prefetchPriorityQueueDiscovery(forceRestart = false): Promise<DiscoveryBatchPayload | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (!forceRestart && inFlightPriorityPrefetch) return inFlightPriorityPrefetch

  const request = (async (): Promise<DiscoveryBatchPayload | null> => {
    try {
      const savedLeads = readSavedLeads()
      const excludedBbls = savedLeads
        .map((lead) => lead.id)
        .filter((id) => /^[1-5]\d{9}$/.test(id))
      const savedTerritory = JSON.parse(localStorage.getItem('leadflow-agent-territory') || 'null')
      const boroughs =
        Array.isArray(savedTerritory?.boroughs) && savedTerritory.boroughs.length
          ? savedTerritory.boroughs
          : []

      const response = await fetch('/api/nyc/opportunities/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20, excludedBbls, boroughs, prioritize: true }),
      })
      const payload = (await response.json()) as DiscoveryBatchPayload
      if (!response.ok || !Array.isArray(payload.opportunities)) {
        return null
      }
      return payload
    } catch {
      return null
    }
  })()

  inFlightPriorityPrefetch = request
  return request
}

export async function consumePriorityQueuePrefetch(): Promise<DiscoveryBatchPayload | null> {
  if (!inFlightPriorityPrefetch) return null
  const pending = inFlightPriorityPrefetch
  inFlightPriorityPrefetch = null
  return pending
}
